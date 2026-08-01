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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { money2 } from "@/lib/format"

const PAGE_SIZES = [25, 50, 100] as const

export type AlertRow = {
  operatorId: number
  operator: string
  station: string
  /** Epoch ms — a Date cannot cross the server/client boundary. */
  at: number
  amount: number
  reason: string
}

/**
 * Every flagged sale, as one searchable table.
 *
 * The page used to split these across four stat tiles, an incident log and
 * three priority tabs, which meant the same alerts appeared in three places
 * and none of them answered "what happened, and when". A table does: one row
 * per incident, newest first, with the time and the reason on the row rather
 * than implied by which tab you were looking at.
 */
export function AlertsTable({
  rows,
  weekdays,
  showStation = true,
}: {
  rows: AlertRow[]
  /** Passed in because date formatting must not vary between server and browser. */
  weekdays: string[]
  /** False for station-pinned accounts: every row would name the same site. */
  showStation?: boolean
}) {
  const t = useT()
  const [query, setQuery] = React.useState("")

  const matches = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((r) =>
      (showStation ? `${r.operator} ${r.station}` : r.operator)
        .toLowerCase()
        .includes(needle)
    )
  }, [rows, query, showStation])

  const paging = usePaging(matches.length, PAGE_SIZES)
  const page = matches.slice(paging.start, paging.start + paging.pageSize)

  const when = (at: number) => {
    const d = new Date(at)
    const day = weekdays[d.getDay()]
    const hh = String(d.getHours()).padStart(2, "0")
    const mm = String(d.getMinutes()).padStart(2, "0")
    return `${day} ${String(d.getDate()).padStart(2, "0")} · ${hh}:${mm}`
  }

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
                aria-label={t.operators.clearSearch}
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
              <TableHead>{t.common.operator}</TableHead>
              {showStation ? (
                <TableHead>{t.common.station}</TableHead>
              ) : null}
              <TableHead className="text-right">{t.alerts.colAmount}</TableHead>
              <TableHead>{t.alerts.colWhy}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {page.map((row, index) => (
              <TableRow key={`${row.operatorId}-${row.at}-${index}`}>
                <TableCell className="font-mono whitespace-nowrap tabular-nums">
                  {when(row.at)}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/operators/${row.operatorId}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {row.operator}
                  </Link>
                </TableCell>
                {showStation ? (
                  <TableCell className="text-muted-foreground">
                    {row.station}
                  </TableCell>
                ) : null}
                <TableCell className="text-right font-mono tabular-nums">
                  {money2(row.amount)} ₼
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.reason}
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
