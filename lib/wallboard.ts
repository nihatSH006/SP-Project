import "server-only"

import { cache } from "react"

import { adminDb } from "@/lib/firebase/admin"
import { COLLECTIONS } from "@/lib/firebase/schema"
import {
  getAvailableDates,
  getWorkerDays,
  type WorkerDay,
} from "@/lib/data"

/**
 * The security-office wall: every station's alert standing at a glance,
 * worst first, plus the latest detections as an event feed.
 *
 * A board on a wall reads as LIVE. This one is fed by one import per
 * operational day, so `asOf` is carried through and the UI says how old the
 * figures are rather than pretending to be a feed.
 */

export type WallStatus = "clear" | "attention" | "critical"

export type WallStation = {
  station: string
  /** Database-provable alerts on the latest operational day. */
  alertsToday: number
  highToday: number
  /** Workers whose IN or OUT tap is missing today. */
  missingTaps: number
  /** Alerts per day, oldest → newest — the trend line. */
  spark: number[]
  status: WallStatus
}

export type WallEvent = {
  at: number
  station: string
  type: string
  severity: "low" | "medium" | "high"
}

export type Wallboard = {
  date: string | null
  asOf: number | null
  alertsToday: number
  missingTaps: number
  clearStations: number
  stations: WallStation[]
  events: WallEvent[]
}

const SPARK_DAYS = 14

const dayAlerts = (report: WorkerDay) => report.alerts.length
const dayHigh = (report: WorkerDay) =>
  report.alerts.filter((a) => a.severity === "high").length

export const getWallboard = cache(async (): Promise<Wallboard> => {
  const dates = await getAvailableDates()
  const date = dates.at(-1) ?? null

  let asOf: number | null = null
  try {
    const meta = await adminDb().collection(COLLECTIONS.meta).doc("import").get()
    const at = meta.data()?.importedAt
    asOf = typeof at?.toMillis === "function" ? at.toMillis() : null
  } catch {
    asOf = null
  }

  const sparkDates = dates.slice(-SPARK_DAYS)
  const perDay = await Promise.all(
    sparkDates.map((day) => getWorkerDays(day))
  )
  const latest = perDay.at(-1) ?? []

  const names = [
    ...new Set(perDay.flat().map((report) => report.station)),
  ].sort()

  const stations: WallStation[] = names.map((name) => {
    const todays = latest.filter((r) => r.station === name)
    const alertsToday = todays.reduce((sum, r) => sum + dayAlerts(r), 0)
    const highToday = todays.reduce((sum, r) => sum + dayHigh(r), 0)
    const missingTaps = todays.filter(
      (r) => r.checkIn === null || r.checkOut === null
    ).length

    const spark = perDay.map((reports) =>
      reports
        .filter((r) => r.station === name)
        .reduce((sum, r) => sum + dayAlerts(r), 0)
    )

    const status: WallStatus =
      highToday > 0
        ? "critical"
        : alertsToday > 0
          ? "attention"
          : "clear"

    return { station: name, alertsToday, highToday, missingTaps, spark, status }
  })

  const rank: Record<WallStatus, number> = {
    critical: 0,
    attention: 1,
    clear: 2,
  }
  stations.sort(
    (a, b) => rank[a.status] - rank[b.status] || b.alertsToday - a.alertsToday
  )

  // The feed: a counter says how much, the feed says WHAT.
  const events: WallEvent[] = latest
    .flatMap((r) =>
      r.alerts.map((a) => ({
        at: a.at,
        station: r.station,
        type: a.type,
        severity: a.severity,
      }))
    )
    .sort((a, b) => b.at - a.at)
    .slice(0, 7)

  return {
    date,
    asOf,
    alertsToday: stations.reduce((sum, s) => sum + s.alertsToday, 0),
    missingTaps: stations.reduce((sum, s) => sum + s.missingTaps, 0),
    clearStations: stations.filter((s) => s.status === "clear").length,
    stations,
    events,
  }
})
