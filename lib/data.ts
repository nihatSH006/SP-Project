import "server-only"

import { cache } from "react"

import {
  applyFilters,
  deriveScores,
  type Filters,
  type HourlyPoint,
  type OperatorMetrics,
  type RiskLevel,
  RISK_LEVELS,
  type Shift,
  SHIFTS,
} from "@/lib/analytics"
import { getSessionUser, stationScopeFor } from "@/lib/auth"
import { adminDb } from "@/lib/firebase/admin"
import { getSettings } from "@/lib/settings-server"
import type { Settings } from "@/lib/settings"
import { COLLECTIONS, stationId } from "@/lib/firebase/schema"
import type { ReportDoc } from "@/lib/firebase/schema"

/**
 * All reads go through the Admin SDK on the server; the browser never holds a
 * Firestore handle, so `firestore.rules` is a backstop rather than the only
 * thing between a visitor and the data.
 *
 * Reports are precomputed per operational day by the seeder/importer, so one
 * page load reads one day's report documents (~60), never the raw sales.
 */

/** A stored daily report: metrics + the day's hourly series, no raw sales. */
export type StoredReport = OperatorMetrics & {
  date: string
  hourly: HourlyPoint[]
}

/**
 * Cross-request cache, pinned to `globalThis` (module-scoped Maps are
 * duplicated per route bundle and reset by HMR — see the quota incident).
 * Keyed by scope AND date so a staff slice is never served to a regional
 * user and one day's data never masquerades as another's.
 */
const TTL_MS = 5 * 60 * 1000

type ReportsCache = Map<string, { at: number; reports: StoredReport[] }>
type DatesCache = { at: number; dates: string[] } | null

const g = globalThis as typeof globalThis & {
  __sasisReports?: ReportsCache
  __sasisDates?: DatesCache
}
g.__sasisReports ??= new Map()
const reportsCache = g.__sasisReports

/** Thrown when Firestore is unreachable and no cached copy can stand in. */
export class DataUnavailableError extends Error {
  constructor(
    message: string,
    readonly reason: "quota" | "unknown"
  ) {
    super(message)
    this.name = "DataUnavailableError"
  }
}

function isQuotaError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === 8
  )
}

/**
 * Rehydrate a stored report, re-deriving every policy-dependent value from the
 * admin's current settings. The stored `attendanceScore` / `risk` / `score` /
 * `grade` are snapshots from import time and are deliberately ignored — that is
 * what makes a settings change take effect instantly across all 28 days without
 * recomputing a single document.
 */
function docToReport(data: ReportDoc, settings: Settings): StoredReport {
  const derived = deriveScores(
    {
      workingHours: data.workingHours,
      productivity: data.productivity,
      suspicious: data.suspicious,
    },
    settings
  )

  return {
    id: data.employeeId,
    date: data.date,
    name: data.name,
    department: data.department,
    station: data.station,
    shift: data.shift as Shift,
    entry: data.entry.toDate(),
    exit: data.exit.toDate(),
    workingHours: data.workingHours,
    salesCount: data.salesCount,
    revenue: data.revenue,
    productivity: data.productivity,
    salesPerHour: data.salesPerHour,
    suspicious: data.suspicious,
    attendanceScore: derived.attendanceScore,
    risk: derived.risk,
    score: derived.score,
    grade: derived.grade,
    alerts: (data.alerts ?? []).map((alert) => ({
      operatorId: data.employeeId,
      operator: data.name,
      station: data.station,
      time: alert.time.toDate(),
      amount: alert.amount,
      reason: alert.reason,
    })),
    hourly: data.hourly ?? [],
  }
}

/**
 * Operational days available, ascending. Sourced from the import manifest —
 * one tiny document instead of an aggregation over thousands of reports.
 */
export const getAvailableDates = cache(async (): Promise<string[]> => {
  if (g.__sasisDates && Date.now() - g.__sasisDates.at < TTL_MS) {
    return g.__sasisDates.dates
  }
  const doc = await adminDb().collection(COLLECTIONS.meta).doc("import").get()
  const dates = ((doc.data()?.dates as string[] | undefined) ?? []).slice().sort()
  g.__sasisDates = { at: Date.now(), dates }
  return dates
})

export const getLatestDate = cache(async (): Promise<string | null> => {
  const dates = await getAvailableDates()
  return dates.at(-1) ?? null
})

/**
 * Load one operational day's reports, scoped to what the caller may see.
 * Station scoping is applied at the query — a station-pinned request never
 * pulls another station's documents into the server process at all.
 */
export const getOperatorReports = cache(
  async (date?: string): Promise<StoredReport[]> => {
    const user = await getSessionUser()
    if (!user) return []

    const day = date ?? (await getLatestDate())
    if (!day) return []

    const settings = await getSettings()
    const scope = stationScopeFor(user)
    const key = `${scope ?? "__all__"}:${day}`

    // Settings are part of the cache key: changing a threshold must not serve
    // scores computed under the old policy.
    const policyKey = JSON.stringify([
      settings.scheduledHours,
      settings.productivityTarget,
      settings.riskHighSuspicious,
      settings.riskMediumAttendance,
      settings.riskHighAttendance,
      settings.gradeBounds,
    ])
    const cacheKey = `${key}|${policyKey}`

    const hit = reportsCache.get(cacheKey)
    if (hit && Date.now() - hit.at < TTL_MS) return hit.reports

    const db = adminDb()

    try {
      const snapshot = scope
        ? await db
            .collection(COLLECTIONS.stations)
            .doc(stationId(scope))
            .collection(COLLECTIONS.reports)
            .where("date", "==", day)
            .get()
        : await db
            .collectionGroup(COLLECTIONS.reports)
            .where("date", "==", day)
            .get()

      const reports = snapshot.docs
        .map((doc) => docToReport(doc.data() as ReportDoc, settings))
        .sort((a, b) => a.name.localeCompare(b.name))

      reportsCache.set(cacheKey, { at: Date.now(), reports })
      return reports
    } catch (error) {
      // Stale-if-error: an expired copy beats an error page.
      if (hit) {
        console.warn(
          `[data] Firestore read failed; serving cached reports from ${new Date(hit.at).toISOString()}`
        )
        return hit.reports
      }

      const quota = isQuotaError(error)
      console.error(
        quota
          ? "[data] Firestore daily read quota exhausted."
          : "[data] Firestore read failed:",
        quota ? "" : error
      )
      throw new DataUnavailableError(
        quota
          ? "Firestore's daily read quota is exhausted."
          : "Could not reach Firestore.",
        quota ? "quota" : "unknown"
      )
    }
  }
)

/** Station x day revenue totals, written by the seeder for baseline targets. */
type Rollups = Record<string, Record<string, number>>

const gr = globalThis as typeof globalThis & {
  __sasisRollups?: { at: number; rollups: Rollups } | null
}

const getRollups = cache(async (): Promise<Rollups> => {
  if (gr.__sasisRollups && Date.now() - gr.__sasisRollups.at < TTL_MS) {
    return gr.__sasisRollups.rollups
  }
  try {
    const doc = await adminDb().collection(COLLECTIONS.meta).doc("rollups").get()
    const rollups = (doc.data()?.stationDaily as Rollups | undefined) ?? {}
    gr.__sasisRollups = { at: Date.now(), rollups }
    return rollups
  } catch {
    return gr.__sasisRollups?.rollups ?? {}
  }
})

/**
 * The revenue target for this slice.
 *
 * Manual: the admin's per-station numbers, summed over the stations present.
 * Baseline: each station's own trailing average (from the rollup document)
 * times the configured uplift — so a quiet station is measured against itself.
 * Returns null when nothing is configured, so the UI can say so honestly
 * rather than inventing the old self-referential 87%.
 */
/**
 * The daily revenue target for each named station.
 *
 * Exported because the wallboard needs targets PER station while the pages
 * need one total. Deriving both from this single map means the office screen
 * and the dashboard can never disagree about the same number — the fastest way
 * to lose a room's trust in a wallboard is for it to contradict the report
 * someone is holding.
 *
 * Manual: the admin's per-station figure, falling back to the default.
 * Baseline: that station's own trailing average times the configured uplift,
 * so a quiet station is measured against itself.
 */
export async function stationTargetMap(
  stations: string[],
  settings: Settings,
  date: string | null
): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  if (stations.length === 0) return out

  if (settings.targetMode === "manual") {
    for (const name of stations) {
      out.set(
        name,
        settings.stationDailyTargets[stationId(name)] ??
          settings.defaultStationDailyTarget
      )
    }
    return out
  }

  const rollups = await getRollups()
  const BASELINE_DAYS = 14

  for (const name of stations) {
    const byDate = rollups[stationId(name)] ?? {}
    const past = Object.entries(byDate)
      .filter(([d]) => (date ? d < date : true))
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .slice(0, BASELINE_DAYS)
      .map(([, revenue]) => revenue)
    if (past.length === 0) continue
    const average = past.reduce((sum, v) => sum + v, 0) / past.length
    out.set(name, average * settings.baselineUplift)
  }

  return out
}

async function targetFor(
  reports: StoredReport[],
  settings: Settings,
  date: string | null
): Promise<number | null> {
  if (reports.length === 0) return null

  const stations = [...new Set(reports.map((r) => r.station))]
  const targets = await stationTargetMap(stations, settings, date)

  let total = 0
  for (const value of targets.values()) total += value
  return total > 0 ? total : null
}

export type FilterOptions = {
  stations: string[]
  departments: string[]
  shifts: Shift[]
  /** All operational days, ascending. */
  dates: string[]
  /** The day this render is showing. */
  selectedDate: string | null
}

export type SearchParams = Record<string, string | string[] | undefined>

const single = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

/** The `?date=` param, validated against real days; latest otherwise. */
export async function resolveDate(
  searchParams: SearchParams
): Promise<string | null> {
  const dates = await getAvailableDates()
  const requested = single(searchParams.date)
  if (requested && dates.includes(requested)) return requested
  return dates.at(-1) ?? null
}

/**
 * Validate filters against the options the caller actually has. Anything
 * unrecognised is dropped, so a hand-edited URL cannot widen the slice
 * beyond what their role allows.
 */
async function resolveFilters(
  searchParams: SearchParams,
  reports: StoredReport[]
): Promise<Filters> {
  const stations = new Set(reports.map((r) => r.station))
  const departments = new Set(reports.map((r) => r.department))

  const station = single(searchParams.station)
  const department = single(searchParams.department)
  const shift = single(searchParams.shift) as Shift | undefined
  const risk = single(searchParams.risk) as RiskLevel | undefined

  return {
    station: station && stations.has(station) ? station : null,
    department: department && departments.has(department) ? department : null,
    shift: shift && SHIFTS.includes(shift) ? shift : null,
    risk: risk && RISK_LEVELS.includes(risk) ? risk : null,
  }
}

/** The filtered slice every page is scoped to, plus how it was selected. */
export async function getSlice(searchParams: SearchParams) {
  const date = await resolveDate(searchParams)
  const [reports, dates] = await Promise.all([
    getOperatorReports(date ?? undefined),
    getAvailableDates(),
  ])
  const filters = await resolveFilters(searchParams, reports)

  const options: FilterOptions = {
    stations: [...new Set(reports.map((r) => r.station))].sort(),
    departments: [...new Set(reports.map((r) => r.department))].sort(),
    shifts: SHIFTS.filter((s) => reports.some((r) => r.shift === s)),
    dates,
    selectedDate: date,
  }

  const filtered = applyFilters(reports, filters)
  const settings = await getSettings()
  const target = await targetFor(filtered, settings, date)

  return { filters, options, reports: filtered, target, settings }
}
