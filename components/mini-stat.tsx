import type * as React from "react"

import { Card, CardContent } from "@/components/ui/card"

/**
 * A number and a word, with an optional icon.
 *
 * Replaces the KPI tile that carried an icon, a label, a value, a unit AND a
 * sentence of caption — six of those meant thirty pieces of text competing
 * with the one figure that mattered.
 *
 * The icon sits to the left of the label and value together, as a single
 * block, so the eye lands on the glyph and then reads the pair rather than
 * stepping through three separate things.
 *
 * Shared between the overview and the operators list, which had drifted into
 * two identical private copies.
 */
export function MiniStat({
  label,
  value,
  unit,
  icon: Icon,
}: {
  label: string
  value: React.ReactNode
  unit?: string
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-3.5 py-1">
        {/* Bare glyph, no tinted tile: a filled square behind every icon adds
            four more shapes to a row whose job is to be scanned. */}
        {Icon ? <Icon className="size-8 shrink-0 text-primary" /> : null}
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="text-2xl font-semibold tracking-tight tabular-nums">
            {value}
            {unit ? (
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                {unit}
              </span>
            ) : null}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
