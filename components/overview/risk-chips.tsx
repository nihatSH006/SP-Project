import Link from "next/link"

import type { RiskLevel } from "@/lib/analytics"
import type { Dictionary } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const CHIP: Record<RiskLevel | "ALL", string> = {
  ALL: "border-border",
  LOW: "border-emerald-500/30",
  MEDIUM: "border-amber-500/35",
  HIGH: "border-red-500/40",
}

const ACTIVE: Record<RiskLevel | "ALL", string> = {
  ALL: "bg-foreground/10 text-foreground",
  LOW: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  MEDIUM: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  HIGH: "bg-red-500/15 text-red-700 dark:text-red-300",
}

/**
 * Filter the roster down to a risk band.
 *
 * This is the landing point for "2 high-risk operators" on the overview. An
 * exception is only useful if you can get to the people it is about, and a
 * count that leads to a list of sixty-four is not that.
 *
 * Counts come from the UNFILTERED set so the chips do not collapse to
 * "HIGH 2, everything else 0" the moment one is selected — a filter UI that
 * destroys its own navigation is a trap.
 */
export function RiskChips({
  counts,
  total,
  active,
  params,
  t,
}: {
  counts: Record<RiskLevel, number>
  total: number
  active: RiskLevel | null
  /** Current query, so choosing a band keeps the day and station filters. */
  params: Record<string, string | string[] | undefined>
  t: Dictionary
}) {
  const href = (risk: RiskLevel | null) => {
    const next = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (key === "risk" || value === undefined) continue
      next.set(key, Array.isArray(value) ? value[0] : value)
    }
    if (risk) next.set("risk", risk)
    const query = next.toString()
    return query ? `/operators?${query}` : "/operators"
  }

  const chip = (key: RiskLevel | "ALL", label: string, count: number) => {
    const isActive = key === "ALL" ? active === null : active === key
    return (
      <Link
        key={key}
        href={href(key === "ALL" ? null : key)}
        aria-current={isActive ? "true" : undefined}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
          CHIP[key],
          isActive ? ACTIVE[key] : "text-muted-foreground hover:bg-foreground/5"
        )}
      >
        {label}
        <span className="tabular-nums opacity-70">{count}</span>
      </Link>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {chip("ALL", t.operators.all, total)}
      {chip("LOW", t.risk.LOW, counts.LOW)}
      {chip("MEDIUM", t.risk.MEDIUM, counts.MEDIUM)}
      {chip("HIGH", t.risk.HIGH, counts.HIGH)}
    </div>
  )
}
