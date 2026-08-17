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
import { Badge } from "@/components/ui/badge"
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
import { money } from "@/lib/format"
import { cn } from "@/lib/utils"

const PAGE_SIZES = [25, 50, 100] as const

export type WorkerRow = {
  userid: string
  name: string
  kartNo: string
  station: string
  /** Epoch ms or null when the tap is missing. */
  checkIn: number | null
  checkOut: number | null
  workedHours: number | null
  salesCount: number
  litres: number
  revenue: number
  alerts: number
  href: string
}

const hm = (at: number) => {
  const d = new Date(at)
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`
}

/**
 * One row per worker for the chosen day: identity (name + kart_no), the
 * tapped window, and what the fob sold. A missing tap is shown as a red
 * dash exactly where the time should be — the absence IS the information.
 */
export function WorkersTable({
  rows,
  showStation = true,
}: {
  rows: WorkerRow[]
  showStation?: boolean
}) {
  const t = useT()
  const [query, setQuery] = React.useState("")

  const matches = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((r) =>
      `${r.name} ${r.kartNo} ${showStation ? r.station : ""}`
        .toLowerCase()
        .includes(needle)
    )
  }, [rows, query, showStation])

  const paging = usePaging(matches.length, PAGE_SIZES)
  const page = matches.slice(paging.start, paging.start + paging.pageSize)

  const tapCell = (at: number | null) =>
    at !== null ? (
      <span className="font-mono tabular-nums">{hm(at)}</span>
    ) : (
      <span className="font-mono font-semibold text-red-600 dark:text-red-400">
        —
      </span>
    )

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
            placeholder={t.workers.searchPlaceholder}
            aria-label={t.common.search}
          />
          {query ? (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                variant="ghost"
                aria-label={t.workers.clearSearch}
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
          id="workers-per-page"
          value={paging.pageSize}
          sizes={PAGE_SIZES}
          onChange={paging.setPageSize}
        />
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.workers.colWorker}</TableHead>
              {showStation ? (
                <TableHead>{t.common.station}</TableHead>
              ) : null}
              <TableHead>{t.workers.colInOut}</TableHead>
              <TableHead className="text-right">
                {t.workers.colHours}
              </TableHead>
              <TableHead className="text-right">
                {t.workers.colSales}
              </TableHead>
              <TableHead className="text-right">
                {t.workers.colLitres}
              </TableHead>
              <TableHead className="text-right">
                {t.workers.colRevenue}
              </TableHead>
              <TableHead className="text-right">
                {t.nav.alerts}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {page.map((row) => (
              <TableRow key={row.userid}>
                <TableCell>
                  <Link
                    href={row.href}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {row.name}
                  </Link>
                  <div className="font-mono text-xs text-muted-foreground">
                    {row.kartNo}
                  </div>
                </TableCell>
                {showStation ? (
                  <TableCell className="text-muted-foreground">
                    {row.station}
                  </TableCell>
                ) : null}
                <TableCell className="whitespace-nowrap">
                  {tapCell(row.checkIn)}
                  <span className="px-1 text-muted-foreground">→</span>
                  {tapCell(row.checkOut)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {row.workedHours !== null ? row.workedHours.toFixed(1) : "—"}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {row.salesCount}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {money(row.litres)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {money(row.revenue)} ₼
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={row.alerts > 0 ? "destructive" : "outline"}
                    className={cn(row.alerts === 0 && "text-muted-foreground")}
                  >
                    {row.alerts}
                  </Badge>
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
