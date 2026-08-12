import "server-only"

import { cache } from "react"

import { getSessionUser, stationScopeFor } from "@/lib/auth"
import { adminDb } from "@/lib/firebase/admin"
import { resolvePeriod } from "@/lib/period"
import {
  COLLECTIONS,
  stationId,
  type SaleDoc,
  type StoredAlert,
  type WorkerDayDoc,
} from "@/lib/firebase/schema"

/**
 * All reads go through the Admin SDK on the server; the browser never holds a
 * Firestore handle. Worker-days are precomputed per operational day by the
 * seeder/importer, so one page load reads one day's documents (~60), never
 * the raw taps and sales.
 */

export type { StoredAlert }

/** A computed worker-day, exactly as stored — already client-safe numbers. */
export type WorkerDay = WorkerDayDoc

const TTL_MS = 5 * 60 * 1000

type ReportsCache = Map<string, { at: number; reports: WorkerDay[] }>

const g = globalThis as typeof globalThis & {
  __sasisReports?: ReportsCache
  __sasisDates?: { at: number; dates: string[] } | null
}
g.__sasisReports ??= new Map()
const reportsCache = g.__sasisReports

/**
 * Drop every server-side data cache. The live-feed tick calls this after it
 * writes, so the next render reads what the feed just produced instead of a
 * copy up to five minutes stale.
 */
export function invalidateDataCache(): void {
  reportsCache.clear()
  g.__sasisDates = null
}

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
 * Load one operational day's worker-days, scoped to what the caller may see.
 * Station scoping is applied at the query — a station-pinned request never
 * pulls another station's documents into the server process at all.
 */
export const getWorkerDays = cache(
  async (date?: string): Promise<WorkerDay[]> => {
    const user = await getSessionUser()
    if (!user) return []

    const day = date ?? (await getLatestDate())
    if (!day) return []

    const scope = stationScopeFor(user)
    const cacheKey = `${scope ?? "__all__"}:${day}`
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
        .map((doc) => doc.data() as WorkerDay)
        .sort((a, b) => a.adSoyad.localeCompare(b.adSoyad))

      reportsCache.set(cacheKey, { at: Date.now(), reports })
      return reports
    } catch (error) {
      // Stale-if-error: an expired copy beats an error page.
      if (hit) return hit.reports
      const quota = isQuotaError(error)
      throw new DataUnavailableError(
        quota
          ? "Firestore's daily read quota is exhausted."
          : "Could not reach Firestore.",
        quota ? "quota" : "unknown"
      )
    }
  }
)

/**
 * Total alerts the caller can see, across every imported day — the nav
 * badge. Read from one aggregate written at import time.
 */
export const getTotalAlerts = cache(async (): Promise<number> => {
  const user = await getSessionUser()
  if (!user) return 0
  try {
    const doc = await adminDb().collection(COLLECTIONS.meta).doc("alerts").get()
    const data = doc.data()
    if (!data) return 0
    const scope = stationScopeFor(user)
    if (!scope) return Number(data.total ?? 0)
    const byStation = (data.byStation ?? {}) as Record<string, number>
    return Number(byStation[stationId(scope)] ?? 0)
  } catch {
    return 0
  }
})

// ---------------------------------------------------------------- slicing

export type SearchParams = Record<string, string | string[] | undefined>

const single = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

export type FilterOptions = {
  stations: string[]
  /** Always empty — one department; the filter bar hides single-value groups. */
  departments: string[]
  shifts: string[]
  dates: string[]
  selectedDate: string | null
}

const SHIFTS = ["Morning", "Evening", "Night"]

async function optionsFor(
  reports: WorkerDay[],
  dates: string[],
  selectedDate: string | null,
  multiStation: boolean
): Promise<FilterOptions> {
  return {
    stations: multiStation
      ? [...new Set(reports.map((r) => r.station))].sort()
      : [],
    departments: [],
    shifts: SHIFTS.filter((s) => reports.some((r) => r.shift === s)),
    dates,
    selectedDate,
  }
}

function applyFilters(
  reports: WorkerDay[],
  station: string | null,
  shift: string | null
): WorkerDay[] {
  let out = reports
  if (station) out = out.filter((r) => r.station === station)
  if (shift) out = out.filter((r) => r.shift === shift)
  return out
}

/** One chosen day — the workers page's unit. */
export async function getSlice(searchParams: SearchParams) {
  const user = await getSessionUser()
  const dates = await getAvailableDates()
  const requested = single(searchParams.date)
  const date =
    requested && dates.includes(requested) ? requested : (dates.at(-1) ?? null)

  const reports = await getWorkerDays(date ?? undefined)
  const multiStation = user ? stationScopeFor(user) === null : false

  const station = multiStation ? (single(searchParams.station) ?? null) : null
  const shift = single(searchParams.shift) ?? null
  const filtered = applyFilters(
    reports,
    station && reports.some((r) => r.station === station) ? station : null,
    shift && SHIFTS.includes(shift) ? shift : null
  )

  return {
    date,
    reports: filtered,
    options: await optionsFor(reports, dates, date, multiStation),
    multiStation,
  }
}

/** A chosen period — the alerts page's unit. */
export async function getPeriodSlice(searchParams: SearchParams) {
  const dates = await getAvailableDates()
  const period = resolvePeriod(
    dates,
    single(searchParams.from),
    single(searchParams.to)
  )

  if (!period) {
    return {
      reports: [] as WorkerDay[],
      options: {
        stations: [],
        departments: [],
        shifts: [],
        dates,
        selectedDate: null,
      } as FilterOptions,
      period: { from: "", to: "", dates: [] },
      availableDates: dates,
    }
  }

  const user = await getSessionUser()
  const multiStation = user ? stationScopeFor(user) === null : false

  const perDay = await Promise.all(
    period.dates.map((date) => getWorkerDays(date))
  )
  const all = perDay.flat()

  const station = multiStation ? (single(searchParams.station) ?? null) : null
  const shift = single(searchParams.shift) ?? null
  const filtered = applyFilters(
    all,
    station && all.some((r) => r.station === station) ? station : null,
    shift && SHIFTS.includes(shift) ? shift : null
  )

  return {
    reports: filtered,
    options: await optionsFor(all, dates, null, multiStation),
    period,
    availableDates: dates,
  }
}

/**
 * A worker's roster identity, scoped. The detail page falls back to this on
 * days the worker was ABSENT: no worker-day document exists then, and "you
 * were not here that day" is information, not a missing page.
 */
export async function getRosterWorker(
  station: string,
  userid: string
): Promise<{ userid: string; adSoyad: string; kartNo: string } | null> {
  const user = await getSessionUser()
  if (!user) return null
  const scope = stationScopeFor(user)
  if (scope && stationId(scope) !== stationId(station)) return null

  const doc = await adminDb()
    .collection(COLLECTIONS.stations)
    .doc(stationId(station))
    .collection(COLLECTIONS.roster)
    .doc(userid)
    .get()
  if (!doc.exists) return null
  const data = doc.data()!
  return {
    userid: data.userid as string,
    adSoyad: data.adSoyad as string,
    kartNo: data.kartNo as string,
  }
}

/** One sale row, already client-safe — a db3_satislar row plus the db1 join. */
export type SaleRow = {
  at: number
  db1Id: string
  vNo: string
  litres: number
  grade: string
  amount: number
}

/**
 * One worker-day's raw sale rows, straight from THE sales table. This is the
 * join the report aggregates were computed from — kart_no + operational day —
 * so the detail page shows rows an official can find in db3_satislar itself.
 *
 * Two equality filters need no composite index; Firestore merges the
 * single-field ones.
 */
export async function getWorkerDaySales(
  station: string,
  kartNo: string,
  date: string
): Promise<SaleRow[]> {
  const user = await getSessionUser()
  if (!user) return []
  const scope = stationScopeFor(user)
  if (scope && stationId(scope) !== stationId(station)) return []

  const snapshot = await adminDb()
    .collection(COLLECTIONS.sales)
    .where("kartNo", "==", kartNo)
    .where("opDate", "==", date)
    .get()

  return snapshot.docs
    .map((doc) => {
      const sale = doc.data() as SaleDoc
      return {
        at: sale.satisZamani.toMillis(),
        db1Id: sale.db1Id,
        vNo: sale.vNo,
        litres: sale.litres,
        grade: sale.grade,
        amount: sale.amount,
      }
    })
    .sort((a, b) => a.at - b.at)
}

/** One worker's one day, by direct path — for the detail page. */
export async function getWorkerDay(
  station: string,
  userid: string,
  date: string
): Promise<WorkerDay | null> {
  const user = await getSessionUser()
  if (!user) return null
  // A pinned account may only reach its own station, whatever the URL says.
  const scope = stationScopeFor(user)
  if (scope && stationId(scope) !== stationId(station)) return null

  const doc = await adminDb()
    .collection(COLLECTIONS.stations)
    .doc(stationId(station))
    .collection(COLLECTIONS.reports)
    .doc(`${date}_${userid}`)
    .get()

  return doc.exists ? (doc.data() as WorkerDay) : null
}
