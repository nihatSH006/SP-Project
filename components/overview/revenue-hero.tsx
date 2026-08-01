import { Card, CardContent } from "@/components/ui/card"
import { money } from "@/lib/format"
import type { Dictionary } from "@/lib/i18n"
import { cn } from "@/lib/utils"

/**
 * The one number the page exists to show.
 *
 * Revenue used to appear six times — a tile, a meter, a prose paragraph and
 * implicitly in a chart. It appears once now, at a size that says "read this
 * first", with the target underneath it because "how much" and "against what"
 * are one question, not two.
 */
export function RevenueHero({
  revenue,
  target,
  targetPct,
  hasTarget,
  t,
}: {
  revenue: number
  target: number
  targetPct: number
  hasTarget: boolean
  t: Dictionary
}) {
  const met = targetPct >= 100
  const gap = Math.abs(target - revenue)

  return (
    <Card className="justify-center bg-primary/[0.07] ring-primary/20">
      <CardContent className="flex flex-col gap-4 py-1">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">
            {t.common.revenue}
          </span>
          <span
            data-metric="network-revenue"
            data-value={revenue}
            className="text-4xl font-semibold tracking-tight tabular-nums md:text-5xl"
          >
            {money(revenue)}
            <span className="ml-2 text-lg font-normal text-muted-foreground">
              ₼
            </span>
          </span>
        </div>

        {hasTarget ? (
          <div className="flex flex-col gap-2">
            {/* A plain bar rather than the Progress component: this is one
                decorative rectangle, not an interactive control. */}
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
              role="presentation"
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width]",
                  met ? "bg-emerald-500" : "bg-primary"
                )}
                style={{ width: `${Math.min(100, Math.max(0, targetPct))}%` }}
              />
            </div>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-muted-foreground">
                {t.overview.target} {money(target)}
              </span>
              <span
                className={cn(
                  "font-medium tabular-nums",
                  met ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                )}
              >
                {targetPct}%
                <span className="ml-2 font-normal text-muted-foreground">
                  {met ? t.overview.over(money(gap)) : t.overview.toGo(money(gap))}
                </span>
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t.overview.noTarget}</p>
        )}
      </CardContent>
    </Card>
  )
}
