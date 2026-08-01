"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { IconCalendar } from "@tabler/icons-react"

import { useI18n } from "@/components/i18n-provider"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { formatDayLabel } from "@/lib/i18n"

/**
 * `YYYY-MM-DD` <-> `Date`, both built from LOCAL parts.
 *
 * `new Date("2026-07-30")` parses as UTC midnight, which is the previous day
 * anywhere west of Greenwich and would quietly shift the period by one.
 */
const toDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}

const toIso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`

/**
 * From/to for the board pack.
 *
 * Two single-day calendars rather than a range selection: a range picker needs
 * you to understand that the first click sets the start and the second the
 * end, and mis-clicking means starting over. Two fields say which is which.
 */
export function PeriodPicker({
  from,
  to,
  available,
}: {
  from: string
  to: string
  available: string[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { locale } = useI18n()
  const [pending, startTransition] = React.useTransition()

  const dateSet = React.useMemo(() => new Set(available), [available])

  const setBound = (key: "from" | "to", value: string) => {
    const next = new URLSearchParams(searchParams.toString())
    next.set(key, value)
    // Keep the pair in order rather than rejecting the click: someone moving
    // the start past the end means to move the period, not to make an error.
    if (key === "from" && value > (searchParams.get("to") ?? to)) {
      next.set("to", value)
    }
    if (key === "to" && value < (searchParams.get("from") ?? from)) {
      next.set("from", value)
    }
    startTransition(() => router.push(`${pathname}?${next.toString()}`))
  }

  const field = (key: "from" | "to", value: string) => (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="w-40 justify-start font-normal"
          >
            <IconCalendar className="size-4 text-muted-foreground" />
            {formatDayLabel(value, locale)}
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={toDate(value)}
          defaultMonth={toDate(value)}
          onSelect={(day) => day && setBound(key, toIso(day))}
          // Days with no import are unselectable: a period that includes them
          // would report a gap the operation never had.
          disabled={(day) => !dateSet.has(toIso(day))}
          startMonth={available[0] ? toDate(available[0]) : undefined}
          endMonth={available.at(-1) ? toDate(available.at(-1)!) : undefined}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )

  return (
    <div
      data-pending={pending || undefined}
      className="flex items-center gap-2 transition-opacity data-pending:opacity-60 print:hidden"
    >
      {field("from", from)}
      <span className="text-muted-foreground">→</span>
      {field("to", to)}
    </div>
  )
}
