"use server"

import { revalidatePath } from "next/cache"

import { getSessionUser, stationScopeFor } from "@/lib/auth"
import { canConcludeCase, canTriageCase } from "@/lib/cases"
import {
  CASE_STATUSES,
  CLOSED_STATUSES,
  type CaseStatus,
} from "@/lib/case-status"
import { adminDb } from "@/lib/firebase/admin"
import { COLLECTIONS, stationId } from "@/lib/firebase/schema"
import { FieldValue, Timestamp } from "firebase-admin/firestore"

export type CaseActionResult = { ok: true } | { ok: false; error: string }

/**
 * The only way a case's status ever changes.
 *
 * Every check here is re-run on the server even though the UI already hides
 * the controls: the form is a request like any other, and "the button wasn't
 * rendered" is not access control. What is being written is a record about a
 * named employee being suspected of theft, so each write is authorised,
 * validated, attributed, and appended to an immutable timeline.
 */
export async function updateCase(
  prev: CaseActionResult | null | FormData,
  maybeFormData?: FormData
): Promise<CaseActionResult> {
  // React calls this as (prevState, formData) from `useActionState`, but the
  // no-JavaScript form path invokes it as (formData) alone. Accepting both
  // means the case queue still works with scripts blocked or still loading —
  // and it turns what was a 500 into an ordinary validated request.
  const formData = maybeFormData ?? (prev instanceof FormData ? prev : null)
  if (!formData) return { ok: false, error: "badRequest" }

  const user = await getSessionUser()
  if (!user) return { ok: false, error: "notSignedIn" }
  if (!canTriageCase(user)) return { ok: false, error: "notAllowed" }

  const employeeId = Number(formData.get("employeeId"))
  const station = String(formData.get("station") ?? "")
  const status = String(formData.get("status") ?? "") as CaseStatus
  const note = String(formData.get("note") ?? "").slice(0, 2000).trim()
  const assign = formData.get("assignToMe") === "on"

  if (!Number.isFinite(employeeId) || !station) {
    return { ok: false, error: "badRequest" }
  }
  if (!CASE_STATUSES.includes(status)) {
    return { ok: false, error: "badStatus" }
  }

  // A manager may triage their own station but not reach another one, and the
  // scope is checked against the SESSION claim rather than anything the form
  // supplied — the station field in the request is attacker-controlled.
  const scope = stationScopeFor(user)
  if (scope && stationId(scope) !== stationId(station)) {
    return { ok: false, error: "notAllowed" }
  }

  // Recording a conclusion is a heavier act than picking work up. A station
  // manager assessing their own team has an obvious conflict of interest, so
  // closing a case needs someone outside the station.
  if (CLOSED_STATUSES.includes(status) && !canConcludeCase(user)) {
    return { ok: false, error: "needsSupervisor" }
  }

  // "Confirmed" is an accusation of theft against a named person. Requiring
  // written reasoning is the cheapest possible check on that, and it means the
  // record shows WHY, not just who clicked.
  if (status === "confirmed" && note.length < 10) {
    return { ok: false, error: "noteRequired" }
  }

  const db = adminDb()
  const ref = db
    .collection(COLLECTIONS.stations)
    .doc(stationId(station))
    .collection(COLLECTIONS.cases)
    .doc(String(employeeId))

  const snapshot = await ref.get()
  if (!snapshot.exists) return { ok: false, error: "notFound" }
  const previous = snapshot.data()!

  const actor = user.email ?? user.uid

  await ref.update({
    status,
    note,
    updatedAt: Timestamp.now(),
    updatedBy: actor,
    ...(assign ? { assignedTo: actor } : {}),
  })

  // Append-only: the timeline is never updated or deleted, so a case that was
  // closed and quietly reopened still shows both moves.
  await ref.collection("timeline").add({
    at: FieldValue.serverTimestamp(),
    by: actor,
    action: "status",
    from: previous.status ?? null,
    to: status,
    note,
  })

  revalidatePath("/cases")
  revalidatePath(`/cases/${employeeId}`)
  return { ok: true }
}
