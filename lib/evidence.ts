/**
 * The evidence pack for a case (idea #9).
 *
 * Reads back the rule hits stored on each flagged day's report. Nothing is
 * recomputed here on purpose: a case must show the evidence exactly as it
 * stood when it was raised. If the pack re-scored itself on every page load,
 * a settings change could quietly alter what a reviewer had already read and
 * acted on — and the timeline would show a conclusion that no longer matched
 * the evidence beneath it.
 */
import "server-only"

import { adminDb } from "@/lib/firebase/admin"
import { COLLECTIONS, stationId, type ReportDoc } from "@/lib/firebase/schema"

export type EvidenceHit = {
  rule: string
  severity: string
  category: string
  count: number
  overnight: boolean
  windows: { from: number; to: number }[]
  values?: number[]
  baseline?: number
  observed?: number
}

export type EvidenceDay = {
  date: string
  hits: EvidenceHit[]
}

/** Firestore caps an `in` query at 30 values. */
const IN_LIMIT = 30

export async function getEvidence(
  station: string,
  employeeId: number,
  dates: string[]
): Promise<EvidenceDay[]> {
  if (dates.length === 0) return []

  const reports = adminDb()
    .collection(COLLECTIONS.stations)
    .doc(stationId(station))
    .collection(COLLECTIONS.reports)

  // One `getAll` on known document ids rather than a query: the id is
  // `${date}_${employeeId}`, so the reads are exact and cost one document per
  // flagged day instead of scanning the station's history.
  const refs = dates
    .slice(0, IN_LIMIT)
    .map((date) => reports.doc(`${date}_${employeeId}`))
  const snapshots = await adminDb().getAll(...refs)

  const days: EvidenceDay[] = []
  for (const snapshot of snapshots) {
    if (!snapshot.exists) continue
    const data = snapshot.data() as ReportDoc
    if (!data.fraud?.hits?.length) continue

    // Only integrity rules belong in an evidence pack. A dead pump is an
    // operational finding — including it here would pad a theft case with
    // something that is not evidence of theft.
    const hits = data.fraud.hits
      .filter((hit) => hit.category === "integrity")
      .map((hit) => ({
        rule: hit.rule,
        severity: hit.severity,
        category: hit.category,
        count: hit.count,
        overnight: hit.overnight,
        windows: hit.windows ?? [],
        ...(hit.values ? { values: hit.values } : {}),
        ...(hit.baseline !== undefined ? { baseline: hit.baseline } : {}),
        ...(hit.observed !== undefined ? { observed: hit.observed } : {}),
      }))

    if (hits.length > 0) days.push({ date: data.date, hits })
  }

  return days.sort((a, b) => b.date.localeCompare(a.date))
}
