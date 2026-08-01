import "server-only"

import { getSessionUser, stationScopeFor } from "@/lib/auth"
import { CLOSED_STATUSES, getCases, type CaseRecord } from "@/lib/cases"
import {
  getAvailableDates,
  getOperatorReports,
  stationTargetMap,
} from "@/lib/data"
import { adminDb } from "@/lib/firebase/admin"
import { COLLECTIONS } from "@/lib/firebase/schema"
import { daysBetween, resolvePeriod } from "@/lib/period"
import { getSettings } from "@/lib/settings-server"
import {
  buildScorecards,
  mostImproved,
  type Scorecard,
  type ScorecardDay,
} from "@/lib/scorecards"

/**
 * The board pack (idea #4), over a period the reader chooses.
 *
 * It used to cover "the latest month", taken from the roll-up document. Making
 * the period a parameter forced a real change rather than a cosmetic one:
 * every figure now has to be computed FROM that period. Reading the month
 * roll-up and pairing it with window-wide scorecards would have produced a
 * pack whose revenue moved with the date picker while its top performers
 * silently did not — a report that looks responsive and is quietly wrong in
 * half its sections.
 *
 * So it is built from the day reports in range: one cached read per day rather
 * than a single roll-up. That is the price of every section meaning the same
 * thing.
 *
 * `dataHealth` remains the part that matters most. A pack that does not state
 * how complete its own inputs are invites decisions taken on numbers nobody
 * checked — and this one names staff in a loss-prevention table.
 */

export type BoardPack = {
  fromDate: string
  toDate: string
  /** Every operational day available, for the picker. */
  availableDates: string[]
  scope: string
  generatedAt: number
  revenue: number
  /**
   * Each station's daily target times the days it traded IN THIS PERIOD.
   * Summing a daily figure over a partial period would overstate it.
   */
  target: number | null
  transactions: number
  operators: number
  stations: {
    station: string
    revenue: number
    days: number
    dailyAverage: number
  }[]
  cases: {
    total: number
    open: number
    investigating: number
    confirmed: number
    explained: number
    dismissed: number
    /**
     * Cases still awaiting a human decision — the board's actual to-do.
     * `owner` is a person's name, resolved from the account that holds the
     * case: an email address in a board paper tells a director nothing about
     * who is dealing with it.
     */
    outstanding: (CaseRecord & { owner: string | null })[]
  }
  topPerformers: Scorecard[]
  mostImproved: Scorecard[]
  dataHealth: {
    daysCovered: number
    /** Days between `fromDate` and `toDate` inclusive. */
    daysExpected: number
    warnings: string[]
    complete: boolean
  }
}


export async function getBoardPack(
  requestedFrom?: string,
  requestedTo?: string
): Promise<BoardPack | null> {
  const user = await getSessionUser()
  if (!user) return null

  const availableDates = await getAvailableDates()
  if (availableDates.length === 0) return null

  const period = resolvePeriod(availableDates, requestedFrom, requestedTo)
  if (!period) return null
  const { from, to } = period

  // One cached read per day. The alternative — a single roll-up document —
  // cannot answer "who performed best in this period", only "in the window the
  // importer happened to write".
  const perDay = await Promise.all(
    period.dates.map((date) => getOperatorReports(date))
  )
  const reports = perDay.flat()

  const [cases, settings, warnings] = await Promise.all([
    getCases(),
    getSettings(),
    importWarnings(),
  ])

  const scope = stationScopeFor(user)

  // ---- money, from the reports themselves
  let revenue = 0
  let transactions = 0
  const operators = new Set<number>()
  const byStation = new Map<string, { revenue: number; days: Set<string> }>()

  for (const r of reports) {
    revenue += r.revenue
    transactions += r.salesCount
    operators.add(r.id)
    const entry = byStation.get(r.station) ?? { revenue: 0, days: new Set() }
    entry.revenue += r.revenue
    entry.days.add(r.date)
    byStation.set(r.station, entry)
  }

  const stations = [...byStation.entries()]
    .map(([station, v]) => ({
      station,
      revenue: Math.round(v.revenue),
      days: v.days.size,
      dailyAverage: v.days.size > 0 ? Math.round(v.revenue / v.days.size) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  // ---- target, scaled by the days each station actually traded in period
  let target: number | null = null
  try {
    const targets = await stationTargetMap(
      stations.map((s) => s.station),
      settings,
      null
    )
    let total = 0
    for (const row of stations) {
      total += (targets.get(row.station) ?? 0) * row.days
    }
    target = total > 0 ? Math.round(total) : null
  } catch {
    target = null
  }

  // ---- people, computed over the SAME period rather than the import window
  const rows: ScorecardDay[] = reports.map((r) => ({
    date: r.date,
    employeeId: r.id,
    station: r.station,
    shift: r.shift,
    revenue: r.revenue,
    attendanceScore: r.attendanceScore,
    productivity: r.productivity,
  }))
  const names = new Map(reports.map((r) => [r.id, r.name]))
  const scorecards = buildScorecards(rows, names)

  // ---- cases whose flagged days fall inside the period
  const inPeriod = cases
    .map((c) => {
      const dates = (c.dates ?? []).filter((d) => d >= from && d <= to)
      return { ...c, dates, flaggedDays: dates.length }
    })
    .filter((c) => c.dates.length > 0)

  const byStatus = (status: string) =>
    inPeriod.filter((c) => c.status === status).length

  const outstanding = inPeriod.filter(
    (c) => !CLOSED_STATUSES.includes(c.status)
  )
  const emails = [
    ...new Set(outstanding.map((c) => c.assignedTo).filter(Boolean)),
  ] as string[]

  // Resolve the handful of owner emails to display names, queried by the
  // emails actually present rather than reading every user document.
  const owners = new Map<string, string>()
  if (emails.length > 0) {
    try {
      const snap = await adminDb()
        .collection(COLLECTIONS.users)
        // Firestore caps `in` at 30; more open cases than that is a bigger
        // problem than a board paper's formatting.
        .where("email", "in", emails.slice(0, 30))
        .get()
      for (const doc of snap.docs) {
        const d = doc.data()
        if (d.email && d.displayName) owners.set(d.email, d.displayName)
      }
    } catch {
      // Fall back to the raw identifier rather than losing the section.
    }
  }

  const expected = daysBetween(from, to)

  return {
    fromDate: from,
    toDate: to,
    availableDates,
    scope: scope ?? "",
    // Read at render time, not baked in — a stale "generated on" date on a
    // board pack is worse than none.
    generatedAt: Date.now(),
    revenue: Math.round(revenue),
    target,
    transactions,
    operators: operators.size,
    stations,
    cases: {
      total: inPeriod.length,
      open: byStatus("open"),
      investigating: byStatus("investigating"),
      confirmed: byStatus("confirmed"),
      explained: byStatus("explained"),
      dismissed: byStatus("dismissed"),
      outstanding: outstanding.map((c) => ({
        ...c,
        owner: c.assignedTo ? (owners.get(c.assignedTo) ?? c.assignedTo) : null,
      })),
    },
    topPerformers: scorecards.slice(0, 5),
    mostImproved: mostImproved(scorecards, 5),
    dataHealth: {
      daysCovered: period.dates.length,
      daysExpected: expected,
      warnings,
      // Every day between the endpoints has data. This catches a GAP: a period
      // missing four days reads as a weak period, not an incomplete one.
      complete: period.dates.length >= expected,
    },
  }
}

async function importWarnings(): Promise<string[]> {
  try {
    const doc = await adminDb().collection(COLLECTIONS.meta).doc("import").get()
    const warnings = doc.data()?.warnings
    return Array.isArray(warnings) ? (warnings as string[]) : []
  } catch {
    return []
  }
}
