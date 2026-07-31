import "server-only"

import { cache } from "react"

import { getSessionUser, stationScopeFor } from "@/lib/auth"
import { adminDb } from "@/lib/firebase/admin"
import { COLLECTIONS, stationId, type StaffingDoc } from "@/lib/firebase/schema"
import { mergeProfiles, type StaffingProfile } from "@/lib/staffing"

/**
 * Coverage-vs-demand profiles the caller may see (idea #12).
 *
 * One document per station — 8 reads for the whole network. The grid behind
 * them was built at import time from every shift and sale in the window.
 */
export const getStaffingProfiles = cache(
  async (): Promise<StaffingProfile[]> => {
    const user = await getSessionUser()
    if (!user) return []

    const db = adminDb()
    const scope = stationScopeFor(user)

    const snapshot = scope
      ? await db
          .collection(COLLECTIONS.stations)
          .doc(stationId(scope))
          .collection(COLLECTIONS.staffing)
          .get()
      : await db.collectionGroup(COLLECTIONS.staffing).get()

    return snapshot.docs
      .map((doc) => {
        const d = doc.data() as StaffingDoc
        const covered = (d.cells ?? []).filter((c) => c.operatorHours >= 1)
        return {
          station: d.station,
          cells: d.cells ?? [],
          median: d.median ?? 0,
          busiestCell:
            covered.length > 0
              ? covered.reduce((a, b) =>
                  b.perOperatorHour > a.perOperatorHour ? b : a
                )
              : null,
          quietestCell:
            covered.length > 0
              ? covered.reduce((a, b) =>
                  b.perOperatorHour < a.perOperatorHour ? b : a
                )
              : null,
        }
      })
      .sort((a, b) => a.station.localeCompare(b.station))
  }
)

/** Network roll-up, or null when the caller only sees one station anyway. */
export async function getNetworkStaffing(
  profiles: StaffingProfile[],
  label: string
): Promise<StaffingProfile | null> {
  if (profiles.length < 2) return null
  return mergeProfiles(profiles, label)
}
