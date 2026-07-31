import "server-only"

import { cache } from "react"

import { collectAlerts } from "@/lib/analytics"
import { adminDb } from "@/lib/firebase/admin"
import { COLLECTIONS } from "@/lib/firebase/schema"
import {
  getLatestDate,
  getOperatorReports,
  stationTargetMap,
} from "@/lib/data"
import { getSettings } from "@/lib/settings-server"

/**
 * The office wall screen (idea #5).
 *
 * One honesty problem sits at the centre of this feature. A board on a wall
 * reads as LIVE — that is what a wall screen means to everyone who walks past
 * it. SASIS is fed by one import per operational day, so the figures can be
 * many hours old. A screen that implies "right now" while showing yesterday's
 * takings is worse than no screen: people would make decisions on it, and they
 * would be wrong without knowing they were wrong.
 *
 * So `asOf` is carried through and shown prominently, and the UI says how old
 * the data is rather than pretending to be a feed. Real-time numbers need a
 * data source we do not have yet — an intraday import or a push from the tills.
 */

export type WallStation = {
  station: string
  revenue: number
  target: number | null
  /** Null rather than 0 when no target exists — an unknown is not a failure. */
  pct: number | null
  operators: number
  alerts: number
}

export type Wallboard = {
  /** Operational day the figures belong to. */
  date: string | null
  /** When the data was imported, epoch ms. Null if never recorded. */
  asOf: number | null
  revenue: number
  target: number | null
  pct: number | null
  operators: number
  alerts: number
  stations: WallStation[]
}

export const getWallboard = cache(async (): Promise<Wallboard> => {
  const [date, reports, settings] = await Promise.all([
    getLatestDate(),
    getOperatorReports(),
    getSettings(),
  ])

  let asOf: number | null = null
  try {
    const meta = await adminDb().collection(COLLECTIONS.meta).doc("import").get()
    const at = meta.data()?.at
    asOf = typeof at?.toMillis === "function" ? at.toMillis() : null
  } catch {
    // A wall screen must not go blank because one bookkeeping read failed.
    asOf = null
  }

  const names = [...new Set(reports.map((r) => r.station))].sort()
  const targets = await stationTargetMap(names, settings, date)

  const stations: WallStation[] = names.map((name) => {
    const rows = reports.filter((r) => r.station === name)
    const revenue = Math.round(rows.reduce((sum, r) => sum + r.revenue, 0))
    const target = targets.get(name) ?? null
    return {
      station: name,
      revenue,
      target: target === null ? null : Math.round(target),
      pct: target && target > 0 ? Math.round((revenue / target) * 100) : null,
      operators: rows.length,
      alerts: collectAlerts(rows).length,
    }
  })

  const revenue = Math.round(reports.reduce((sum, r) => sum + r.revenue, 0))
  // Summed from the same per-station map the dashboard uses, so the wall and
  // the report agree by construction rather than by coincidence.
  let total = 0
  for (const value of targets.values()) total += value
  const target = total > 0 ? Math.round(total) : null

  return {
    date,
    asOf,
    revenue,
    target,
    pct: target ? Math.round((revenue / target) * 100) : null,
    operators: reports.length,
    alerts: collectAlerts(reports).length,
    // Worst first: the point of a wall screen is that the room notices the
    // station that is behind, not that it admires the one in front.
    stations: stations.sort((a, b) => (a.pct ?? 999) - (b.pct ?? 999)),
  }
})
