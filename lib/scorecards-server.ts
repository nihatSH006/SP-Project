import "server-only"

import { cache } from "react"

import { getSessionUser, stationScopeFor } from "@/lib/auth"
import { getAvailableDates, getOperatorReports } from "@/lib/data"
import { resolvePeriod, type Period } from "@/lib/period"
import { buildScorecards, type ScorecardDay } from "@/lib/scorecards"
import { adminDb } from "@/lib/firebase/admin"
import { COLLECTIONS, stationId, type ScorecardDoc } from "@/lib/firebase/schema"
import type { Scorecard, Tier } from "@/lib/scorecards"

/**
 * Window scorecards for everyone the caller may see (idea #11).
 *
 * One document per operator — 64 reads for the whole network, or 8 for a
 * station-scoped role. The peer expectations behind these numbers were
 * computed at import time over every day in the window; recomputing them per
 * request would mean reading tens of thousands of sales to render one page.
 */
export const getScorecards = cache(async (): Promise<Scorecard[]> => {
  const user = await getSessionUser()
  if (!user) return []

  const db = adminDb()
  const scope = stationScopeFor(user)

  const snapshot = scope
    ? await db
        .collection(COLLECTIONS.stations)
        .doc(stationId(scope))
        .collection(COLLECTIONS.scorecards)
        .get()
    : await db.collectionGroup(COLLECTIONS.scorecards).get()

  return snapshot.docs
    .map((doc) => {
      const d = doc.data() as ScorecardDoc
      return {
        employeeId: d.employeeId,
        name: d.name,
        station: d.station,
        shift: d.shift,
        days: d.days,
        totalRevenue: d.totalRevenue,
        expectedRevenue: d.expectedRevenue,
        percentOfExpected: d.percentOfExpected,
        attendanceAvg: d.attendanceAvg,
        productivityAvg: d.productivityAvg,
        improvement: d.improvement,
        improvedFrom: d.improvedFrom ?? 0,
        improvedTo: d.improvedTo ?? 0,
        hasImprovement: d.hasImprovement,
        tier: d.tier as Tier,
      }
    })
    .sort((a, b) => b.percentOfExpected - a.percentOfExpected)
})

/**
 * Scorecards computed over a chosen period rather than the import window.
 *
 * The stored scorecards above are written once per import and cover whatever
 * window the importer happened to write. A leaderboard with a date picker
 * cannot use them: the dates would move and the ranking would not, which is
 * the worst kind of wrong — visibly responsive and quietly stale.
 *
 * So this reads the day reports in range and rebuilds the cards with the same
 * pure function the seeder uses. One cached read per day; a page nobody opens
 * costs nothing.
 */
export const getScorecardsForPeriod = cache(
  async (
    from?: string,
    to?: string
  ): Promise<{ cards: Scorecard[]; period: Period; availableDates: string[] }> => {
    const availableDates = await getAvailableDates()
    const period = resolvePeriod(availableDates, from, to)
    if (!period) {
      return {
        cards: [],
        period: { from: "", to: "", dates: [] },
        availableDates: [],
      }
    }

    const perDay = await Promise.all(
      period.dates.map((date) => getOperatorReports(date))
    )
    const reports = perDay.flat()

    const rows: ScorecardDay[] = reports.map((r) => ({
      date: r.date,
      employeeId: r.id,
      station: r.station,
      shift: r.shift,
      revenue: r.revenue,
      attendanceScore: r.attendanceScore,
      productivity: r.productivity,
    }))

    return {
      cards: buildScorecards(rows, new Map(reports.map((r) => [r.id, r.name]))),
      period,
      availableDates,
    }
  }
)
