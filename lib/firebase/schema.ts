/**
 * Firestore layout (multi-day).
 *
 *   /stations/{stationId}                       — station registry
 *   /stations/{stationId}/roster/{employeeId}   — who works there (person registry)
 *   /stations/{stationId}/reports/{date}_{employeeId}
 *                                               — one computed report per person per day
 *   /stations/{stationId}/sales/{saleId}        — raw transactions (audit only)
 *   /users/{uid}                                — account profiles (mirror of auth)
 *   /settings/global                            — admin-tunable business rules
 *   /meta/import                                — import bookkeeping + list of dates
 *
 * Two structural rules, both load-bearing:
 *
 * 1. Everything station-scoped nests under /stations/{stationId} because
 *    security rules authorise reads from the document PATH — rules cannot
 *    inspect a query's `where` clauses, so a flat layout could not safely
 *    support station-pinned `list` access for staff/manager roles.
 *
 * 2. Reports are aggregated on WRITE (by the seeder/importer), never on read.
 *    A page load reads one day's report docs (~60), not the raw sales
 *    (~45,000). The first design aggregated on read and burned Firestore's
 *    free-tier daily quota in ~90 page views.
 *
 * Dates are `YYYY-MM-DD` strings (operational day, Asia/Baku). A night shift
 * belongs to the day it STARTED: entry 22:00 on the 14th → date "…-14", even
 * though exit is 06:00 on the 15th.
 */

import type { Timestamp } from "firebase-admin/firestore"

export type StationDoc = {
  name: string
  /** Display grouping: "Baku", "Ganja", … */
  region: string
  /** Rough demand profile, used by generators and later by baselines. */
  profile: "city" | "highway" | "regional"
  employeeCount: number
  updatedAt: Timestamp
}

/** A person on a station's roster — exists independent of any day. */
export type RosterDoc = {
  employeeId: number
  name: string
  department: string
  station: string
  /** False once someone leaves; roster rows are never deleted. */
  active: boolean
  hiredAt: Timestamp
}

/**
 * One operator's computed report for one operational day.
 * Document id: `${date}_${employeeId}` (e.g. "2026-07-30_17").
 */
export type ReportDoc = {
  date: string
  employeeId: number
  name: string
  department: string
  station: string
  entry: Timestamp
  exit: Timestamp

  shift: "Morning" | "Evening" | "Night"
  workingHours: number
  salesCount: number
  revenue: number
  productivity: number
  salesPerHour: number
  attendanceScore: number
  suspicious: number
  risk: "LOW" | "MEDIUM" | "HIGH"
  score: number
  grade: string
  /** Flagged sales, embedded so alert pages need no raw-sale reads. */
  alerts: {
    time: Timestamp
    amount: number
    reason: string
  }[]
  /** Hourly revenue buckets: epoch-ms hour -> revenue. */
  hourly: { hour: number; revenue: number }[]
}

export type SaleDoc = {
  date: string
  employeeId: number
  employeeName: string
  /** Denormalised so a sale can be authorised without a join. */
  station: string
  soldAt: Timestamp
  amount: number
}

export type UserDoc = {
  email: string
  displayName: string
  role: "admin" | "supervisor" | "manager" | "staff"
  station: string | null
  /** Links a staff account to their roster row (future "my performance"). */
  employeeId: number | null
  createdAt: Timestamp
}

/**
 * Admin-tunable business rules (idea #16). Seeded with defaults matching the
 * historical constants; the settings UI will edit this document.
 */
export type SettingsDoc = {
  scheduledHours: number
  /** suspicious-sale count that forces HIGH risk */
  riskHighSuspicious: number
  /** attendance % below which risk is at least MEDIUM / HIGH */
  riskMediumAttendance: number
  riskHighAttendance: number
  gradeBounds: { aPlus: number; a: number; b: number; c: number }
  /** minutes of clock-in lateness forgiven before scores are affected */
  graceMinutes: number
  defaultLanguage: "az" | "ru" | "en"
  updatedAt: Timestamp
}

export const COLLECTIONS = {
  stations: "stations",
  roster: "roster",
  reports: "reports",
  sales: "sales",
  users: "users",
  settings: "settings",
  meta: "meta",
} as const

/**
 * Station names become document ids, so they must survive a path segment.
 * "Baku Station 1" -> "baku-station-1"
 */
export function stationId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/** Operational-day key for a shift that STARTS at `entry`. */
export function dateKey(entry: Date): string {
  const y = entry.getFullYear()
  const m = String(entry.getMonth() + 1).padStart(2, "0")
  const d = String(entry.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}
