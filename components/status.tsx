import {
  IconAlertTriangle,
  IconCircleCheck,
  IconUsers,
} from "@tabler/icons-react"

import { Card, CardContent } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { cn } from "@/lib/utils"
import type { Band } from "@/lib/format"

const tones: Record<Band, string> = {
  good: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  crit: "text-red-600 dark:text-red-400",
}

/** Inline good/warn/crit verdict line — the ✓ / ▲ / ⚠ lines from SASIS. */
export function StatusLine({
  band,
  children,
  className,
}: {
  band: Band
  children: React.ReactNode
  className?: string
}) {
  const Icon = band === "good" ? IconCircleCheck : IconAlertTriangle

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium",
        tones[band],
        className
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      {children}
    </span>
  )
}

/** Shown when the active filters exclude every operator. */
export function NoMatches({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <Card>
      <CardContent>
        <Empty className="py-10">
          <EmptyMedia variant="icon">
            <IconUsers />
          </EmptyMedia>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </Empty>
      </CardContent>
    </Card>
  )
}
