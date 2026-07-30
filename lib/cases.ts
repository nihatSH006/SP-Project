/**
 * Fraud cases — the review queue (idea #8).
 *
 * The engine proposes; a person decides. Nothing in this file lets an
 * automated process record a finding of guilt: `status` is only ever written
 * by an authenticated human through `updateCase`, every change is appended to
 * an immutable timeline, and the engine's own opinion stays in `proposedRisk`
 * where it can be compared against what the reviewer actually concluded.
 *
 * That separation is the point of the whole feature. Before it, a rule firing
 * WAS the verdict — the operator was labelled high-risk on the dashboard with
 * no one accountable for the judgement and no way to record that it had been
 * looked at and explained.
 */
import "server-only"

import { cache } from "react"

import { getSessionUser, stationScopeFor, type SessionUser } from "@/lib/auth"
import { adminDb } from "@/lib/firebase/admin"
import { COLLECTIONS, stationId, type CaseDoc } from "@/lib/firebase/schema"
import { CLOSED_STATUSES } from "@/lib/case-status"
// Re-exported so server callers have one import, while the definitions stay
// in a module a client component can safely reach.
export {
  CASE_STATUSES,
  CLOSED_STATUSES,
  RULE_LABEL_KEY,
  type CaseStatus,
} from "@/lib/case-status"
import type { CaseStatus } from "@/lib/case-status"

export type CaseRecord = {
  employeeId: number
  employeeName: string
  station: string
  fromDate: string
  toDate: string
  proposedRisk: "LOW" | "MEDIUM" | "HIGH"
  score: number
  flaggedDays: number
  repeatsByRule: Record<string, number>
  dates: string[]
  status: CaseStatus
  assignedTo: string | null
  note: string
  /** Epoch ms — Firestore `Timestamp` cannot cross into a client component. */
  createdAt: number
  updatedAt: number
  updatedBy: string | null
}

export type CaseEvent = {
  at: number
  by: string
  action: string
  from: string | null
  to: string | null
  note: string
}

function toRecord(data: CaseDoc): CaseRecord {
  return {
    employeeId: data.employeeId,
    employeeName: data.employeeName,
    station: data.station,
    fromDate: data.fromDate,
    toDate: data.toDate,
    proposedRisk: data.proposedRisk,
    score: data.score,
    flaggedDays: data.flaggedDays,
    repeatsByRule: data.repeatsByRule ?? {},
    dates: data.dates ?? [],
    status: data.status,
    assignedTo: data.assignedTo ?? null,
    note: data.note ?? "",
    createdAt: data.createdAt?.toMillis() ?? 0,
    updatedAt: data.updatedAt?.toMillis() ?? 0,
    updatedBy: data.updatedBy ?? null,
  }
}

/**
 * Every case the signed-in user is allowed to see.
 *
 * Station scoping is applied as the QUERY, not as a filter afterwards, so a
 * manager's request never reads another station's cases at all — these
 * documents name people as suspected of theft, which is the last data that
 * should be over-fetched and trimmed client-side.
 */
export const getCases = cache(async (): Promise<CaseRecord[]> => {
  const user = await getSessionUser()
  if (!user) return []

  const db = adminDb()
  const scope = stationScopeFor(user)

  const snapshot = scope
    ? await db
        .collection(COLLECTIONS.stations)
        .doc(stationId(scope))
        .collection(COLLECTIONS.cases)
        .get()
    : await db.collectionGroup(COLLECTIONS.cases).get()

  return snapshot.docs
    .map((doc) => toRecord(doc.data() as CaseDoc))
    .sort((a, b) => {
      // Open work first, then by weight. A closed case never outranks a live
      // one however bad it looked.
      const aOpen = CLOSED_STATUSES.includes(a.status) ? 1 : 0
      const bOpen = CLOSED_STATUSES.includes(b.status) ? 1 : 0
      if (aOpen !== bOpen) return aOpen - bOpen
      return b.score - a.score
    })
})

export const getCase = cache(
  async (employeeId: number): Promise<CaseRecord | null> => {
    const cases = await getCases()
    return cases.find((c) => c.employeeId === employeeId) ?? null
  }
)

/** The append-only timeline for one case. */
export async function getCaseTimeline(
  station: string,
  employeeId: number
): Promise<CaseEvent[]> {
  const snapshot = await adminDb()
    .collection(COLLECTIONS.stations)
    .doc(stationId(station))
    .collection(COLLECTIONS.cases)
    .doc(String(employeeId))
    .collection("timeline")
    .orderBy("at", "desc")
    .limit(50)
    .get()

  return snapshot.docs.map((doc) => {
    const d = doc.data()
    return {
      at: d.at?.toMillis?.() ?? 0,
      by: d.by ?? "",
      action: d.action ?? "",
      from: d.from ?? null,
      to: d.to ?? null,
      note: d.note ?? "",
    }
  })
}

/**
 * Who may change a case.
 *
 * Deliberately NOT the operator's own station staff: a person must not be able
 * to close a case that names them, or one that names a colleague they work
 * beside every day. Managers can triage their own station; only supervisors
 * and admins can record a conclusion.
 */
export function canTriageCase(user: SessionUser): boolean {
  return user.role === "admin" || user.role === "supervisor" || user.role === "manager"
}

export function canConcludeCase(user: SessionUser): boolean {
  return user.role === "admin" || user.role === "supervisor"
}
