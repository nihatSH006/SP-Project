"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react"

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
 * Prev / calendar / next for one worker's day view — the same day picker the
 * filter bar uses, so the two controls read as one language. Days with no
 * import are not selectable: an empty day would look like a day with no
 * work rather than a day with no data.
 */

/** `YYYY-MM-DD` <-> `Date`, both built from LOCAL parts (timezone-safe). */
const toDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}

const toIso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`

export function DayPickerNav({
  date,
  available,
  hrefBase,
}: {
  date: string
  /** Every imported day, ascending. */
  available: string[]
  /** The chosen ISO day is appended to this. */
  hrefBase: string
}) {
  const router = useRouter()
  const { locale, t } = useI18n()
  const [open, setOpen] = React.useState(false)

  const index = available.indexOf(date)
  const dateSet = React.useMemo(() => new Set(available), [available])
  const go = (day: string) => {
    setOpen(false)
    router.push(`${hrefBase}${day}`)
  }

  return (
    <span className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t.common.previousDay}
        disabled={index <= 0}
        onClick={() => go(available[index - 1])}
      >
        <IconChevronLeft />
      </Button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="w-40 justify-start font-normal"
              aria-label={t.common.operationalDay}
            />
          }
        >
          <IconCalendar className="size-4 text-muted-foreground" />
          {formatDayLabel(date, locale)}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={toDate(date)}
            defaultMonth={toDate(date)}
            onSelect={(day) => {
              if (day) go(toIso(day))
            }}
            disabled={(day) => !dateSet.has(toIso(day))}
            startMonth={available[0] ? toDate(available[0]) : undefined}
            endMonth={
              available.at(-1) ? toDate(available.at(-1)!) : undefined
            }
            autoFocus
          />
        </PopoverContent>
      </Popover>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t.common.nextDay}
        disabled={index < 0 || index >= available.length - 1}
        onClick={() => go(available[index + 1])}
      >
        <IconChevronRight />
      </Button>
    </span>
  )
}
