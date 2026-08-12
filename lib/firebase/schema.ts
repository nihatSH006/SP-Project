/**
 * Firestore layout (v4 — one sales table, exactly like the source).
 *
 *   /sales/{db1Id}                              — THE sales table: one top-level
 *                                                 collection mirroring
 *                                                 public.db3_satislar row for row
 *                                                 (istasyon is a COLUMN, like the
 *                                                 real table — not a path segment)
 *   /stations/{stationId}                       — station registry
 *   /stations/{stationId}/roster/{userid}       — workers: userid, kart_no, name
 *   /stations/{stationId}/logs/{logId}          — raw attendance taps (db3_loglar shape)
 *   /stations/{stationId}/reports/{date}_{userid}
 *                                               — one computed worker-day: taps,
 *                                                 sale AGGREGATES + OBVIOUS alerts
 *                                                 (never sale rows — those live in
 *                                                 /sales only, joined by kartNo +
 *                                                 opDate)
 *   /users/{uid}                                — account profiles (mirror of auth)
 *   /settings/global                            — admin-tunable defaults (language)
 *   /meta/import                                — import bookkeeping + list of dates
 *   /meta/alerts                                — alert totals for the nav badge
 *
 * Three structural rules, all load-bearing:
 *
 * 1. Sale ROWS exist in exactly one place: /sales/{db1Id}, shaped like the
 *    real db3_satislar (unique db1_id → document id). Every other collection
 *    only LINKS to it — reports via (kartNo, opDate), stations via istasyon.
 *    The live-feed simulator and the seeder both write sales here and nowhere
 *    else.
 *
 * 2. Everything station-scoped nests under /stations/{stationId} because
 *    security rules authorise reads from the document PATH — rules cannot
 *    inspect a query's `where` clauses. (The top-level sales table is
 *    server-only; clients never query it directly.)
 *
 * 3. Reports are aggregated on WRITE (by the seeder and the live-feed
 *    function), never on read. A page load reads one day's worker-day docs
 *    (~60), not the raw taps and sales (~45,000). The worker DETAIL page is
 *    the one deliberate exception: it reads that worker-day's raw rows from
 *    /sales, proving the aggregates against the table of record.
 *
 * Dates are `YYYY-MM-DD` strings (operational day, Asia/Baku). A night shift
 * belongs to the day it STARTED.
 */

import type { Timestamp } from "firebase-admin/firestore"

export type StationDoc = {
  name: string
  region: string
  profile: "city" | "highway" | "regional"
  employeeCount: number
  updatedAt: Timestamp
}

/** A person on a station's roster — db3_loglar identity fields. */
export type RosterDoc = {
  userid: string
  adSoyad: string
  deptid: number
  /** deptname in the source — here the station's display name. */
  deptname: string
  kartNo: string
  /** The shift this worker is rostered on — the live feed simulates from it. */
  shift: "Morning" | "Evening" | "Night"
  /** False once someone leaves; roster rows are never deleted. */
  active: boolean
  hiredAt: Timestamp
}

/** One raw attendance tap — db3_loglar. */
export type LogDoc = {
  userid: string
  adSoyad: string
  deptid: number
  deptname: string
  kartNo: string
  checkTime: Timestamp
  /** Raw check_type value; semantics configured in lib/pos.ts. */
  checkType: number
}

/**
 * One row of THE sales table — /sales/{db1Id}, top level.
 *
 * Field for field this is public.db3_satislar (db1_id, istasyon,
 * satis_zamani, db1_personel, kart_no, v_no, analiz_edildi; the serial `id`
 * becomes the document id via the unique db1_id index). Two demo-side
 * extensions, both clearly not source columns:
 *
 *   litres/grade/amount — the simulated db1 join (the real values live on
 *                         the db1 record that db1_id points to)
 *   opDate              — the operational day (shift-start day, Asia/Baku)
 *                         the row belongs to; the join key reports use.
 */
export type SaleDoc = {
  db1Id: string
  istasyon: string
  satisZamani: Timestamp
  db1Personel: string | null
  kartNo: string | null
  /** Carried verbatim; meaning unconfirmed. */
  vNo: string
  analizEdildi: number
  /** The db1 join — what the worker keyed at the pump. */
  litres: number
  grade: string
  amount: number
  /** Operational-day link: `YYYY-MM-DD`, the day whose worker-day owns this sale. */
  opDate: string
}

/** A stored obvious alert — plain epoch numbers, straight to the client. */
export type StoredAlert = {
  type: string
  severity: "low" | "medium" | "high"
  at: number
  from: number
  to: number
  amount?: number
  kartNo?: string
}

/**
 * One worker's computed day. Document id: `${date}_${userid}`.
 * Everything the workers and alerts pages render — taps, sale AGGREGATES and
 * the alerts the two source tables prove — with no raw-collection reads.
 *
 * Sale ROWS are deliberately absent: they live in /sales only. This document
 * links to them by (kartNo, opDate == date); salesCount/litres/revenue are
 * the write-time aggregation of exactly that query.
 */
export type WorkerDayDoc = {
  date: string
  userid: string
  adSoyad: string
  kartNo: string
  station: string
  shift: "Morning" | "Evening" | "Night"
  /** Epoch ms; null when the corresponding tap never happened. */
  checkIn: number | null
  checkOut: number | null
  /** Hours between first IN and last OUT, when both exist. */
  workedHours: number | null
  /** Every tap that day, in order. */
  taps: { at: number; type: number }[]
  salesCount: number
  litres: number
  revenue: number
  alerts: StoredAlert[]
}

export type UserDoc = {
  email: string
  displayName: string
  role: "admin" | "supervisor" | "manager" | "staff"
  station: string | null
  employeeId: number | null
  createdAt: Timestamp
}

/** Minimal admin defaults — the core app configures only the language. */
export type SettingsDoc = {
  defaultLanguage: "az" | "ru" | "en"
  updatedAt: Timestamp
}

export const COLLECTIONS = {
  stations: "stations",
  roster: "roster",
  logs: "logs",
  sales: "sales",
  reports: "reports",
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
