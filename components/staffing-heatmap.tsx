"use client"

import * as React from "react"

import { useT } from "@/components/i18n-provider"
import { money } from "@/lib/format"
import type { StaffingProfile } from "@/lib/staffing"
import { cn } from "@/lib/utils"

/**
 * Week × hour grid of revenue per operator-hour.
 *
 * A CSS grid rather than a table so the cells stretch to whatever width the
 * card has — at a fixed size the grid left most of a full-width card empty,
 * and 168 small squares are hard to aim at.
 *
 * Hovering fills a readout above the grid instead of relying on the browser's
 * `title` tooltip, which takes about a second to appear and reads as nothing
 * happening. The `title` stays as a fallback for touch and assistive tech.
 *
 * Intensity is scaled against the 95th percentile rather than the maximum, so
 * one freak hour cannot wash the whole grid out. Cells with too little
 * coverage to have a meaningful rate are drawn as absent rather than as "zero
 * demand" — the two are not the same thing, and colouring an unstaffed hour as
 * dead quiet would invite exactly the wrong conclusion.
 */
export function StaffingHeatmap({ profile }: { profile: StaffingProfile }) {
  const t = useT()
  const [hovered, setHovered] = React.useState<number | null>(null)

  const covered = profile.cells.filter((c) => c.operatorHours >= 1)
  const sorted = [...covered.map((c) => c.perOperatorHour)].sort((a, b) => a - b)
  const p95 = sorted.length
    ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]
    : 1
  const scale = p95 > 0 ? p95 : 1

  const byKey = new Map(profile.cells.map((c) => [c.weekday * 24 + c.hour, c]))
  const active = hovered === null ? null : byKey.get(hovered)
  const activeHasData = Boolean(active && active.operatorHours >= 1)

  const label = (weekday: number, hour: number) =>
    `${t.staffing.weekdays[weekday]} ${String(hour).padStart(2, "0")}:00`

  return (
    <div className="flex flex-col gap-3">
      {/* Fixed height, so the grid does not jump as the pointer moves. */}
      <div className="flex h-6 items-center gap-3 text-sm">
        {active ? (
          <>
            <span className="font-medium">
              {label(active.weekday, active.hour)}
            </span>
            {activeHasData ? (
              <>
                <span className="font-mono tabular-nums">
                  {money(active.perOperatorHour)} ₼
                </span>
                <span className="text-muted-foreground">
                  {t.staffing.perOperatorHour}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  · {active.avgOperators} {t.staffing.onShift}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">{t.staffing.noData}</span>
            )}
          </>
        ) : (
          <span className="text-muted-foreground">{t.staffing.legendNote}</span>
        )}
      </div>

      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: "2.5rem repeat(24, minmax(0, 1fr))" }}
        onMouseLeave={() => setHovered(null)}
      >
        <span />
        {Array.from({ length: 24 }, (_, hour) => (
          <span
            key={`h-${hour}`}
            className="text-center font-mono text-[10px] text-muted-foreground"
          >
            {hour % 3 === 0 ? String(hour).padStart(2, "0") : ""}
          </span>
        ))}

        {Array.from({ length: 7 }, (_, weekday) => (
          <React.Fragment key={weekday}>
            <span className="flex items-center justify-end pr-2 text-xs text-muted-foreground">
              {t.staffing.weekdays[weekday]}
            </span>
            {Array.from({ length: 24 }, (_, hour) => {
              const key = weekday * 24 + hour
              const cell = byKey.get(key)
              const hasData = Boolean(cell && cell.operatorHours >= 1)
              const intensity = hasData
                ? Math.min(1, cell!.perOperatorHour / scale)
                : 0

              return (
                <div
                  key={key}
                  onMouseEnter={() => setHovered(key)}
                  title={
                    hasData
                      ? `${label(weekday, hour)} — ${money(cell!.perOperatorHour)} ₼ ${t.staffing.perOperatorHour}`
                      : `${label(weekday, hour)} — ${t.staffing.noData}`
                  }
                  className={cn(
                    "aspect-square w-full rounded-[3px] border border-border/40 transition-[outline] outline-none",
                    hovered === key && "outline-2 outline-offset-1 outline-primary"
                  )}
                  style={
                    hasData
                      ? {
                          // Single hue, varying opacity: a rainbow scale
                          // implies categories where there is only more and
                          // less.
                          backgroundColor: `color-mix(in oklab, var(--color-primary) ${Math.round(
                            12 + intensity * 88
                          )}%, transparent)`,
                        }
                      : undefined
                  }
                />
              )
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
