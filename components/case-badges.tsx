import { Badge } from "@/components/ui/badge"
import type { CaseStatus } from "@/lib/case-status"
import type { Dictionary } from "@/lib/i18n"

const STATUS_STYLE: Record<CaseStatus, string> = {
  open: "border-amber-500/35 bg-amber-500/10 text-amber-300",
  investigating: "border-sky-500/35 bg-sky-500/10 text-sky-300",
  confirmed: "border-red-500/35 bg-red-500/10 text-red-300",
  // Deliberately the same green as a clean result: a case that was explained
  // is a person cleared, and it should read that way at a glance.
  explained: "border-emerald-500/35 bg-emerald-500/10 text-emerald-300",
  dismissed: "border-border bg-muted/40 text-muted-foreground",
}

const STATUS_KEY: Record<CaseStatus, keyof Dictionary["cases"]> = {
  open: "statusOpen",
  investigating: "statusInvestigating",
  confirmed: "statusConfirmed",
  explained: "statusExplained",
  dismissed: "statusDismissed",
}

export function CaseStatusBadge({
  status,
  t,
}: {
  status: CaseStatus
  t: Dictionary
}) {
  return (
    <Badge variant="outline" className={STATUS_STYLE[status]}>
      {t.cases[STATUS_KEY[status]] as string}
    </Badge>
  )
}

/**
 * The engine's proposed weight. Rendered as an outline badge rather than a
 * solid destructive one on purpose — this is a suggestion to look, and it
 * should not carry the same visual authority as a reviewer's conclusion.
 */
export function RiskBadge({ risk }: { risk: "LOW" | "MEDIUM" | "HIGH" }) {
  const style =
    risk === "HIGH"
      ? "border-red-500/35 text-red-300"
      : risk === "MEDIUM"
        ? "border-amber-500/35 text-amber-300"
        : "border-border text-muted-foreground"
  return (
    <Badge variant="outline" className={style}>
      {risk}
    </Badge>
  )
}
