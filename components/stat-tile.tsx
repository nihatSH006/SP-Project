import type * as React from "react"

import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

/** The KPI tile used across every page. One number, one unit, one caption. */
export function StatTile({
  label,
  value,
  unit,
  caption,
  icon: Icon,
  action,
  emphasis = false,
  className,
}: {
  label: string
  value: React.ReactNode
  unit?: string
  caption?: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  action?: React.ReactNode
  /** Hero tile — larger number, primary-tinted surface. */
  emphasis?: boolean
  className?: string
}) {
  return (
    <Card
      size="sm"
      className={cn(
        emphasis && "bg-primary/10 ring-primary/25 dark:ring-primary/25",
        className
      )}
    >
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          {Icon ? <Icon className="size-4 text-primary" /> : null}
          {label}
        </CardDescription>
        <CardTitle
          className={cn(
            "font-semibold tracking-tight tabular-nums",
            emphasis ? "text-3xl" : "text-2xl"
          )}
        >
          {value}
          {unit ? (
            <span className="ml-1.5 text-sm font-normal text-muted-foreground">
              {unit}
            </span>
          ) : null}
        </CardTitle>
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      {caption ? (
        <CardFooter className="text-muted-foreground">{caption}</CardFooter>
      ) : null}
    </Card>
  )
}
