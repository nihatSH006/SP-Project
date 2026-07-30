import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { Band } from "@/lib/format"

const indicatorByBand: Record<Band, string> = {
  good: "[&_[data-slot=progress-indicator]]:bg-emerald-500",
  warn: "[&_[data-slot=progress-indicator]]:bg-amber-500",
  crit: "[&_[data-slot=progress-indicator]]:bg-red-500",
}

/**
 * Labelled progress meter. `band` recolours the fill for health-style values;
 * omit it for neutral primary-blue progress.
 */
export function Meter({
  label,
  value,
  display,
  band,
  className,
}: {
  label?: React.ReactNode
  value: number
  /** Overrides the right-hand readout (defaults to the percentage). */
  display?: React.ReactNode
  band?: Band
  className?: string
}) {
  return (
    <Progress
      value={Math.min(100, Math.max(0, value))}
      className={cn("gap-1.5", band && indicatorByBand[band], className)}
    >
      {label ? (
        <ProgressLabel className="text-xs font-normal text-muted-foreground">
          {label}
        </ProgressLabel>
      ) : null}
      {display ? (
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {display}
        </span>
      ) : (
        <ProgressValue className="text-xs" />
      )}
    </Progress>
  )
}
