/**
 * Case vocabulary shared by the server and the browser.
 *
 * Split out of `lib/cases.ts` because that module is `server-only` — it opens
 * Firestore with admin credentials. The triage form is a client component and
 * needs the status list, so the constants live here where importing them
 * cannot drag the Admin SDK into a browser bundle.
 */
import type { FraudRuleId } from "@/lib/fraud-rules"

export type CaseStatus =
  | "open"
  | "investigating"
  | "confirmed"
  | "explained"
  | "dismissed"

export const CASE_STATUSES: CaseStatus[] = [
  "open",
  "investigating",
  "confirmed",
  "explained",
  "dismissed",
]

/** Statuses that close a case. `explained` closes it in the operator's favour. */
export const CLOSED_STATUSES: CaseStatus[] = [
  "confirmed",
  "explained",
  "dismissed",
]

/** Rule id -> translation key, so rule names are never shown raw to a user. */
export const RULE_LABEL_KEY: Record<FraudRuleId, string> = {
  "after-hours": "afterHours",
  "late-close": "lateClose",
  "shift-end-burst": "shiftEndBurst",
  "duplicate-amounts": "duplicateAmounts",
  "round-amount": "roundAmount",
  "velocity-outlier": "velocityOutlier",
  "dead-hours": "deadHours",
}
