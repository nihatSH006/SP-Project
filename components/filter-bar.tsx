"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconFilter,
  IconX,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import type { FilterOptions } from "@/lib/data"

const ALL = "__all__"

type FilterKey = "station" | "department" | "shift"

/**
 * Station / department / shift scope for every page. State lives in the URL so
 * a filtered view is shareable and survives a refresh.
 */
export function FilterBar({ options }: { options: FilterOptions }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
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

  const setDate = (value: string) => {
    const next = new URLSearchParams(searchParams.toString())
    // Latest day is the default — keep URLs clean when on it.
    if (value === dates.at(-1)) next.delete("date")
    else next.set("date", value)
    const query = next.toString()
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname))
  }

  const fmtDay = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number)
    return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    })
  }

  const groups: { key: FilterKey; label: string; values: string[] }[] = [
    { key: "station", label: "Station", values: options.stations },
    { key: "department", label: "Department", values: options.departments },
    { key: "shift", label: "Shift", values: [...options.shifts] },
  ]

  return (
    <div
      data-pending={pending || undefined}
      className="flex flex-wrap items-end gap-3 rounded-2xl border border-border/60 bg-card/40 p-3 transition-opacity data-pending:opacity-60"
    >
      <div className="flex items-center gap-2 self-center pr-1 text-sm text-muted-foreground">
        <IconFilter className="size-4" />
        <span className="hidden sm:inline">Scope</span>
      </div>

      {groups.map(({ key, label, values }) => {
        const items = [
          { value: ALL, label: `All ${label.toLowerCase()}s` },
          ...values.map((value) => ({ value, label: value })),
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
            Reset
            <Badge variant="secondary">{activeCount}</Badge>
          </Button>
        </>
      ) : null}

      {dates.length > 0 ? (
        <div className="ml-auto flex flex-col gap-1.5">
          <Label htmlFor="filter-date" className="text-xs text-muted-foreground">
            Operational day
          </Label>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Previous day"
              disabled={dateIndex <= 0}
              onClick={() => setDate(dates[dateIndex - 1])}
            >
              <IconChevronLeft />
            </Button>
            <Select
              value={selectedDate}
              onValueChange={(value) => setDate(value as string)}
              items={dates.map((d) => ({ value: d, label: fmtDay(d) }))}
            >
              <SelectTrigger id="filter-date" size="sm" className="w-40">
                <IconCalendar className="size-4 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[...dates].reverse().map((d) => (
                  <SelectItem key={d} value={d}>
                    {fmtDay(d)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Next day"
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
