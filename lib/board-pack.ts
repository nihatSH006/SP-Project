import "server-only"

import { cache } from "react"

import { getSessionUser, stationScopeFor } from "@/lib/auth"
import { CLOSED_STATUSES, getCases, type CaseRecord } from "@/lib/cases"
import { adminDb } from "@/lib/firebase/admin"
import { COLLECTIONS, stationId } from "@/lib/firebase/schema"
import { getScorecards } from "@/lib/scorecards-server"
import { mostImproved, type Scorecard } from "@/lib/scorecards"
import { suggestions, type StaffingSuggestion } from "@/lib/staffing"
import { getNetworkStaffing, getStaffingProfiles } from "@/lib/staffing-server"

/**
 * The monthly board pack (idea #4).
 *
 * Assembled entirely from figures already computed at import time, so
 * producing it costs a handful of document reads rather than a scan of the
 * month's sales.
 *
 * The section that matters most is `dataHealth`. A board pack that does not
 * state how complete and how trustworthy its own inputs are invites decisions
 * taken on numbers nobody checked — and this pack contains fraud figures about
 * named staff, which is the last place for unstated uncertainty.
 */

export type BoardPack = {
  month: string
  fromDate: string
  toDate: string
  scope: string
  generatedAt: number
  revenue: number
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
    /** Cases still awaiting a human decision — the board's actual to-do. */
    outstanding: CaseRecord[]
  }
  topPerformers: Scorecard[]
  mostImproved: Scorecard[]
  staffing: StaffingSuggestion[]
  dataHealth: {
    daysCovered: number
    daysExpected: number
    lastImport: number | null
    warnings: string[]
    complete: boolean
  }
}

type Rollups = Record<string, Record<string, number>>

/** Days in the month a `YYYY-MM-DD` string belongs to. */
function daysInMonth(month: string): number {
  const [year, m] = month.split("-").map(Number)
  return new Date(year, m, 0).getDate()
}

export const getBoardPack = cache(async (): Promise<BoardPack | null> => {
  const user = await getSessionUser()
  if (!user) return null

  const db = adminDb()
  const scope = stationScopeFor(user)

  const [rollupDoc, importDoc, cases, scorecards, profiles] =
    await Promise.all([
      db.collection(COLLECTIONS.meta).doc("rollups").get(),
      db.collection(COLLECTIONS.meta).doc("import").get(),
      getCases(),
      getScorecards(),
      getStaffingProfiles(),
    ])

  const rollups = (rollupDoc.data()?.stationDaily as Rollups | undefined) ?? {}
  const importMeta = importDoc.data() ?? {}

  // Every date present, newest first; the pack covers the latest whole month
  // that has data.
  const allDates = new Set<string>()
  for (const perDay of Object.values(rollups)) {
    for (const date of Object.keys(perDay)) allDates.add(date)
  }
  const dates = [...allDates].sort()
  if (dates.length === 0) return null

  const month = dates[dates.length - 1].slice(0, 7)
  const monthDates = dates.filter((d) => d.startsWith(month))

  // Station scoping is applied to the roll-up too, or a manager's pack would
  // quietly report the whole network's revenue under their own station's name.
  const scopeId = scope ? stationId(scope) : null

  const stations: BoardPack["stations"] = []
  let revenue = 0
  for (const [id, perDay] of Object.entries(rollups)) {
    if (scopeId && id !== scopeId) continue
    const stationRevenue = monthDates.reduce(
      (sum, date) => sum + (perDay[date] ?? 0),
      0
    )
    if (stationRevenue === 0) continue
    const days = monthDates.filter((d) => (perDay[d] ?? 0) > 0).length
    stations.push({
      station: id,
      revenue: Math.round(stationRevenue),
      days,
      dailyAverage: days > 0 ? Math.round(stationRevenue / days) : 0,
    })
    revenue += stationRevenue
  }
  stations.sort((a, b) => b.revenue - a.revenue)

  const network = await getNetworkStaffing(profiles, "Network")
  const staffingSource = network ?? profiles[0] ?? null

  const byStatus = (status: string) =>
    cases.filter((c) => c.status === status).length

  const daysExpected = daysInMonth(month)
  const warnings = Array.isArray(importMeta.warnings)
    ? (importMeta.warnings as string[])
    : []

  return {
    month,
    fromDate: monthDates[0],
    toDate: monthDates[monthDates.length - 1],
    scope: scope ?? "",
    // Read at render time, not baked in — a stale "generated on" date on a
    // board pack is worse than none.
    generatedAt: Date.now(),
    revenue: Math.round(revenue),
    transactions: Number(importMeta.salesRows ?? 0),
    operators: scorecards.length,
    stations,
    cases: {
      total: cases.length,
      open: byStatus("open"),
      investigating: byStatus("investigating"),
      confirmed: byStatus("confirmed"),
      explained: byStatus("explained"),
      dismissed: byStatus("dismissed"),
      outstanding: cases.filter((c) => !CLOSED_STATUSES.includes(c.status)),
    },
    topPerformers: scorecards.slice(0, 5),
    mostImproved: mostImproved(scorecards, 5),
    staffing: staffingSource ? suggestions(staffingSource, 5) : [],
    dataHealth: {
      daysCovered: monthDates.length,
      daysExpected,
      lastImport:
        typeof importMeta.at?.toMillis === "function"
          ? importMeta.at.toMillis()
          : null,
      warnings,
      complete: monthDates.length >= daysExpected,
    },
  }
})

