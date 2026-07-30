import "server-only"

import { cache } from "react"

import { getSessionUser, stationScopeFor } from "@/lib/auth"
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
        hasImprovement: d.hasImprovement,
        tier: d.tier as Tier,
      }
    })
    .sort((a, b) => b.percentOfExpected - a.percentOfExpected)
})
