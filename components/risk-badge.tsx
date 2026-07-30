import {
  IconAlertTriangle,
  IconCircleCheck,
  IconExclamationCircle,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { RiskLevel } from "@/lib/analytics"

const risks = {
  LOW: {
    icon: IconCircleCheck,
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  },
  MEDIUM: {
    icon: IconAlertTriangle,
    className: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  },
  HIGH: {
    icon: IconExclamationCircle,
    className: "border-red-500/30 bg-red-500/10 text-red-400",
  },
} as const

export function RiskBadge({
  risk,
  label,
  className,
}: {
  risk: RiskLevel
  /** Translated label; falls back to the enum name if omitted. */
  label?: string
  className?: string
}) {
  const meta = risks[risk]
  return (
    <Badge variant="outline" className={cn(meta.className, className)}>
      <meta.icon />
      {label ?? risk}
    </Badge>
  )
}

export function GradeBadge({ grade }: { grade: string }) {
  return (
    <Badge
      variant="outline"
      className="font-mono tabular-nums"
      title="A+ ≥90 · A ≥80 · B ≥70 · C ≥60 · D below"
    >
      {grade}
    </Badge>
  )
}
