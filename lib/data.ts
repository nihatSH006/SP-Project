import "server-only"

import { cache } from "react"

import {
  applyFilters,
  type Filters,
  type HourlyPoint,
  type OperatorMetrics,
  type RiskLevel,
  type Shift,
  SHIFTS,
} from "@/lib/analytics"
import { getSessionUser, stationScopeFor } from "@/lib/auth"
import { adminDb } from "@/lib/firebase/admin"
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

function docToReport(data: ReportDoc): StoredReport {
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
    attendanceScore: data.attendanceScore,
    suspicious: data.suspicious,
    risk: data.risk as RiskLevel,
    score: data.score,
    grade: data.grade,
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

    const scope = stationScopeFor(user)
    const key = `${scope ?? "__all__"}:${day}`

    const hit = reportsCache.get(key)
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
        .map((doc) => docToReport(doc.data() as ReportDoc))
        .sort((a, b) => a.name.localeCompare(b.name))

      reportsCache.set(key, { at: Date.now(), reports })
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

  return {
    station: station && stations.has(station) ? station : null,
    department: department && departments.has(department) ? department : null,
    shift: shift && SHIFTS.includes(shift) ? shift : null,
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

  return { filters, options, reports: applyFilters(reports, filters) }
}
