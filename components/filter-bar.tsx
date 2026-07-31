"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconX,
} from "@tabler/icons-react"

import { useI18n } from "@/components/i18n-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { formatDayLabel } from "@/lib/i18n"
import type { FilterOptions } from "@/lib/data"

const ALL = "__all__"

/**
 * `YYYY-MM-DD` <-> `Date`, both built from LOCAL parts.
 *
 * `new Date("2026-07-30")` parses as UTC midnight, which is the previous day
 * anywhere west of Greenwich and would quietly select the wrong operational
 * day. Splitting the string avoids the timezone entirely.
 */
const toDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}

const toIso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`

type FilterKey = "station" | "department" | "shift"

/**
 * Station / department / shift scope for every page. State lives in the URL so
 * a filtered view is shareable and survives a refresh.
 */
export function FilterBar({ options }: { options: FilterOptions }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { locale, t } = useI18n()
  const [pending, startTransition] = React.useTransition()

  const current: Record<FilterKey, string> = {
    station: searchParams.get("station") ?? ALL,
    department: searchParams.get("department") ?? ALL,
    shift: searchParams.get("shift") ?? ALL,
  }

  const activeCount = (["station", "department", "shift"] as const).filter(
    (key) => current[key] !== ALL
  ).length

  const setFilter = (key: FilterKey, value: string) => {
    const next = new URLSearchParams(searchParams.toString())
    if (value === ALL) next.delete(key)
    else next.set(key, value)
    const query = next.toString()
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname))
  }

  const reset = () => {
    // Keep the selected day when clearing scope filters.
    const next = new URLSearchParams()
    const date = searchParams.get("date")
    if (date) next.set("date", date)
    const query = next.toString()
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname))
  }

  // ---- operational-day picker ------------------------------------------
  const dates = options.dates
  const selectedDate = searchParams.get("date") ?? options.selectedDate ?? ""
  const dateIndex = dates.indexOf(selectedDate)
  const dateSet = React.useMemo(() => new Set(dates), [dates])

  const setDate = (value: string) => {
    const next = new URLSearchParams(searchParams.toString())
    // Latest day is the default — keep URLs clean when on it.
    if (value === dates.at(-1)) next.delete("date")
    else next.set("date", value)
    const query = next.toString()
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname))
  }

  const fmtDay = (iso: string) => formatDayLabel(iso, locale)

  const groups: {
    key: FilterKey
    label: string
    allLabel: string
    values: string[]
    /** Shift names are enum-like and get translated; others are proper nouns. */
    translate?: boolean
  }[] = [
    {
      key: "station",
      label: t.common.station,
      allLabel: t.common.allStations,
      values: options.stations,
    },
    {
      key: "department",
      label: t.common.department,
      allLabel: t.common.allDepartments,
      values: options.departments,
    },
    {
      key: "shift",
      label: t.common.shift,
      allLabel: t.common.allShifts,
      values: [...options.shifts],
      translate: true,
    },
  ]

  return (
    <div
      data-pending={pending || undefined}
      className="flex flex-wrap items-end gap-3 rounded-2xl border border-border/60 bg-card/40 p-3 transition-opacity data-pending:opacity-60"
    >
      {groups.map(({ key, label, allLabel, values, translate }) => {
        const items = [
          { value: ALL, label: allLabel },
          ...values.map((value) => ({
            value,
            label: translate
              ? (t.shifts[value as keyof typeof t.shifts] ?? value)
              : value,
          })),
        ]

        return (
          <div key={key} className="flex flex-col gap-1.5">
            <Label
              htmlFor={`filter-${key}`}
              className="text-xs text-muted-foreground"
            >
              {label}
            </Label>
            <Select
              value={current[key]}
              onValueChange={(value) => setFilter(key, value as string)}
              items={items}
            >
              <SelectTrigger id={`filter-${key}`} size="sm" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      })}

      {activeCount > 0 ? (
        <>
          <Separator orientation="vertical" className="mb-1.5 h-7" />
          <Button variant="ghost" size="sm" className="mb-0.5" onClick={reset}>
            <IconX data-icon="inline-start" />
            {t.common.reset}
            <Badge variant="secondary">{activeCount}</Badge>
          </Button>
        </>
      ) : null}

      {dates.length > 0 ? (
        <div className="ml-auto flex flex-col gap-1.5">
          <Label htmlFor="filter-date" className="text-xs text-muted-foreground">
            {t.common.operationalDay}
          </Label>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t.common.previousDay}
              disabled={dateIndex <= 0}
              onClick={() => setDate(dates[dateIndex - 1])}
            >
              <IconChevronLeft />
            </Button>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    id="filter-date"
                    variant="outline"
                    size="sm"
                    className="w-44 justify-start font-normal"
                  >
                    <IconCalendar className="size-4 text-muted-foreground" />
                    {selectedDate ? fmtDay(selectedDate) : ""}
                  </Button>
                }
              />
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate ? toDate(selectedDate) : undefined}
                  defaultMonth={
                    selectedDate ? toDate(selectedDate) : undefined
                  }
                  onSelect={(day) => {
                    if (day) setDate(toIso(day))
                  }}
                  // Days with no import are not selectable. Letting someone
                  // pick one would show an empty dashboard that looks like a
                  // day with no trade rather than a day with no data.
                  disabled={(day) => !dateSet.has(toIso(day))}
                  startMonth={dates[0] ? toDate(dates[0]) : undefined}
                  endMonth={
                    dates.at(-1) ? toDate(dates.at(-1)!) : undefined
                  }
                  autoFocus
                />
              </PopoverContent>
            </Popover>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t.common.nextDay}
              disabled={dateIndex < 0 || dateIndex >= dates.length - 1}
              onClick={() => setDate(dates[dateIndex + 1])}
            >
              <IconChevronRight />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
