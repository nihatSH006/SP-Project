import Link from "next/link"
import {
  IconAlertTriangle,
  IconChevronRight,
  IconCircleCheck,
} from "@tabler/icons-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { AttentionItem, Verdict } from "@/lib/dashboard-status"
import type { Dictionary } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const VERDICT_STYLE: Record<Verdict, string> = {
  "on-track": "border-emerald-500/25 bg-emerald-500/[0.06]",
  watch: "border-amber-500/25 bg-amber-500/[0.06]",
  action: "border-red-500/30 bg-red-500/[0.07]",
}

const VERDICT_TEXT: Record<Verdict, string> = {
  "on-track": "text-emerald-300",
  watch: "text-amber-300",
  action: "text-red-300",
}

/** Where each item sends someone who wants to do something about it. */
const HREF: Record<AttentionItem["kind"], string> = {
  alerts: "/alerts",
  "high-risk": "/operators?risk=HIGH",
  attendance: "/operators",
  health: "/operators",
  target: "/breakdown",
}

/**
 * What needs a decision — and nothing else.
 *
 * Every row here is an exception. The healthy metrics are deliberately absent:
 * a panel that also reports "attendance fine, health fine, no alerts" is read
 * as decoration within a week, and then the one day it has something to say,
 * it gets skipped too.
 *
 * Each row is a link, because a list of problems you cannot act on from is
 * just a list of problems.
 */
export function AttentionPanel({
  verdict,
  items,
  t,
}: {
  verdict: Verdict
  items: AttentionItem[]
  t: Dictionary
}) {
  const label = (item: AttentionItem) => {
    switch (item.kind) {
      case "alerts":
        return t.overview.item.alerts(item.count ?? 0)
      case "high-risk":
        return t.overview.item.highRisk(item.count ?? 0)
      case "attendance":
        return t.overview.item.attendance(item.value ?? 0)
      case "health":
        return t.overview.item.health(item.value ?? 0)
      case "target":
        return t.overview.item.target(item.value ?? 0)
    }
  }

  return (
    <Card
      // Stable hook for tests and for support: asserting on translated prose
      // means a test that passes or fails depending on the reader's language.
      data-verdict={verdict}
      className={cn("gap-3", VERDICT_STYLE[verdict])}
    >
      <CardHeader>
        <CardTitle className={cn("flex items-center gap-2", VERDICT_TEXT[verdict])}>
          {verdict === "on-track" ? (
            <IconCircleCheck className="size-5" />
          ) : (
            <IconAlertTriangle className="size-5" />
          )}
          {t.overview[verdict === "on-track" ? "onTrack" : verdict]}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.overview.allGood}</p>
        ) : (
          <ul className="flex flex-col">
            {items.map((item) => (
              <li key={item.kind}>
                <Link
                  href={HREF[item.kind]}
                  className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-foreground/5"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        item.severity === "crit" ? "bg-red-400" : "bg-amber-400"
                      )}
                    />
                    {label(item)}
                  </span>
                  <IconChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
