"use client"

import * as React from "react"
import Link from "next/link"
import { IconSearch, IconX } from "@tabler/icons-react"

import { useT } from "@/components/i18n-provider"
import {
  PageSizeSelect,
  TablePagination,
  usePaging,
} from "@/components/table-pager"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ALERT_LABEL_KEY, type ObviousAlertId } from "@/lib/pos"
import { money2 } from "@/lib/format"
import { cn } from "@/lib/utils"

const PAGE_SIZES = [25, 50, 100] as const

export type AlertRow = {
  /** Epoch ms the alert anchors to. */
  at: number
  date: string
  type: string
  severity: "low" | "medium" | "high"
  /** Null for orphan sales — nobody owns the row. */
  worker: string | null
  kartNo: string | null
  station: string
  amount: number | null
  /** Link to the worker's day, when a worker owns the alert. */
  href: string | null
}

const SEVERITIES = ["high", "medium", "low"] as const

/**
 * The incident log: one row per database-provable alert, newest first.
 * Every row names the person (or states that nobody owns it — which is
 * itself the alert), the fact that fired, and the minute to check.
 */
export function AlertsTable({
  rows,
  weekdays,
  showStation = true,
}: {
  rows: AlertRow[]
  /** Passed in because date formatting must not vary between server and browser. */
  weekdays: string[]
  showStation?: boolean
}) {
  const t = useT()
  const [query, setQuery] = React.useState("")
  const [severity, setSeverity] = React.useState<"all" | (typeof SEVERITIES)[number]>("all")

  const matches = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    return rows.filter((row) => {
      if (severity !== "all" && row.severity !== severity) return false
      if (!needle) return true
      return `${row.worker ?? ""} ${row.kartNo ?? ""} ${showStation ? row.station : ""}`
        .toLowerCase()
        .includes(needle)
    })
  }, [rows, query, severity, showStation])

  const paging = usePaging(matches.length, PAGE_SIZES)
  const page = matches.slice(paging.start, paging.start + paging.pageSize)

  const when = (at: number) => {
    const d = new Date(at)
    const day = weekdays[d.getDay()]
    const hh = String(d.getHours()).padStart(2, "0")
    const mm = String(d.getMinutes()).padStart(2, "0")
    return `${day} ${String(d.getDate()).padStart(2, "0")} · ${hh}:${mm}`
  }

  const typeName = (type: string) =>
    t.alerts.types[
      ALERT_LABEL_KEY[type as ObviousAlertId] as keyof typeof t.alerts.types
    ] ?? type

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <InputGroup className="w-full sm:w-64">
          <InputGroupAddon>
            <IconSearch />
          </InputGroupAddon>
          <InputGroupInput
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              paging.reset()
            }}
            placeholder={t.alerts.searchPlaceholder}
            aria-label={t.common.search}
          />
          {query ? (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                variant="ghost"
                aria-label={t.alerts.clearSearch}
                onClick={() => {
                  setQuery("")
                  paging.reset()
                }}
              >
                <IconX />
              </InputGroupButton>
            </InputGroupAddon>
          ) : null}
        </InputGroup>

        <NativeSelect
          size="sm"
          aria-label={t.alerts.severityFilter}
          value={severity}
          onChange={(event) => {
            setSeverity(event.target.value as typeof severity)
            paging.reset()
          }}
        >
          <NativeSelectOption value="all">
            {t.alerts.severityAll}
          </NativeSelectOption>
          {SEVERITIES.map((value) => (
            <NativeSelectOption key={value} value={value}>
              {t.alerts.severity[value]}
            </NativeSelectOption>
          ))}
        </NativeSelect>

        <PageSizeSelect
          id="alerts-per-page"
          value={paging.pageSize}
          sizes={PAGE_SIZES}
          onChange={paging.setPageSize}
        />
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.alerts.colWhen}</TableHead>
              <TableHead>{t.workers.colWorker}</TableHead>
              {showStation ? (
                <TableHead>{t.common.station}</TableHead>
              ) : null}
              <TableHead>{t.alerts.colWhat}</TableHead>
              <TableHead className="text-right">{t.alerts.colAmount}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {page.map((row, index) => (
              <TableRow key={`${row.at}-${row.type}-${index}`}>
                <TableCell className="font-mono whitespace-nowrap tabular-nums">
                  {when(row.at)}
                </TableCell>
                <TableCell>
                  {row.worker ? (
                    row.href ? (
                      <Link
                        href={row.href}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {row.worker}
                      </Link>
                    ) : (
                      <span className="font-medium">{row.worker}</span>
                    )
                  ) : (
                    // Nobody owns this row — that IS the alert.
                    <span className="font-mono text-sm text-muted-foreground">
                      {row.kartNo ?? "—"}
                    </span>
                  )}
                </TableCell>
                {showStation ? (
                  <TableCell className="text-muted-foreground">
                    {row.station}
                  </TableCell>
                ) : null}
                <TableCell>
                  <span
                    className={cn(
                      "rounded-lg px-2 py-0.5 text-xs font-medium whitespace-nowrap",
                      row.severity === "high" &&
                        "bg-red-500/15 text-red-700 dark:text-red-300",
                      row.severity === "medium" &&
                        "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                      row.severity === "low" &&
                        "bg-muted text-muted-foreground"
                    )}
                  >
                    {typeName(row.type)}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {row.amount !== null ? `${money2(row.amount)} ₼` : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        page={paging.page}
        totalPages={paging.totalPages}
        total={matches.length}
        start={paging.start}
        pageSize={paging.pageSize}
        onPage={paging.setPage}
      />
    </div>
  )
}
