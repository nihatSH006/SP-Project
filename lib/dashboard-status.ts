/**
 * The one-line answer the overview leads with.
 *
 * The dashboard used to end in a four-paragraph "executive brief" that restated
 * nine numbers already on the screen. Prose is the most expensive way to show a
 * fact a tile is already showing, and it pushed the things that genuinely need
 * a decision below the fold.
 *
 * So the verdict is derived here by explicit rules rather than assembled in
 * JSX, and the attention list is built by EXCEPTION: an item appears only when
 * it needs someone. A panel that dutifully reports "attendance: fine, health:
 * fine, alerts: none" trains people to stop reading it, and then the one day it
 * says something they skip past it too.
 */

export type Verdict = "on-track" | "watch" | "action"

export type AttentionKind =
  | "alerts"
  | "high-risk"
  | "attendance"
  | "health"
  | "target"

export type AttentionItem = {
  kind: AttentionKind
  severity: "warn" | "crit"
  /** Whichever of the two the item is about; the UI formats them. */
  count?: number
  value?: number
}

export type DashboardStatus = {
  verdict: Verdict
  items: AttentionItem[]
}

export type StatusInput = {
  alerts: number
  highRisk: number
  attendance: number
  health: number
  hasTarget: boolean
  targetPct: number
}

/**
 * Thresholds match the ones the tiles already colour by, so the headline can
 * never disagree with the number sitting underneath it.
 */
export const ATTENDANCE_WARN = 95
export const ATTENDANCE_CRIT = 85
export const HEALTH_WARN = 90
export const HEALTH_CRIT = 75
export const TARGET_WARN = 80

export function deriveStatus(input: StatusInput): DashboardStatus {
  const items: AttentionItem[] = []

  // A named person suspected of theft outranks every operational number.
  if (input.highRisk > 0) {
    items.push({ kind: "high-risk", severity: "crit", count: input.highRisk })
  }
  if (input.alerts > 0) {
    items.push({ kind: "alerts", severity: "warn", count: input.alerts })
  }
  if (input.attendance < ATTENDANCE_WARN) {
    items.push({
      kind: "attendance",
      severity: input.attendance < ATTENDANCE_CRIT ? "crit" : "warn",
      value: input.attendance,
    })
  }
  if (input.health < HEALTH_WARN) {
    items.push({
      kind: "health",
      severity: input.health < HEALTH_CRIT ? "crit" : "warn",
      value: input.health,
    })
  }
  // A missed target is only reportable when there is a target to miss. The old
  // dashboard invented a percentage either way; this says nothing instead.
  if (input.hasTarget && input.targetPct < TARGET_WARN) {
    items.push({ kind: "target", severity: "warn", value: input.targetPct })
  }

  const verdict: Verdict = items.some((i) => i.severity === "crit")
    ? "action"
    : items.length > 0
      ? "watch"
      : "on-track"

  // Most severe first: the panel is read top-down and often only the first
  // line is read at all.
  const rank = { crit: 0, warn: 1 } as const
  items.sort((a, b) => rank[a.severity] - rank[b.severity])

  return { verdict, items }
}
