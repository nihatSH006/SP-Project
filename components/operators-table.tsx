"use client"

import * as React from "react"
import Link from "next/link"
import {
  IconArrowsSort,
  IconChevronDown,
  IconChevronUp,
  IconSearch,
  IconX,
} from "@tabler/icons-react"

import { useT } from "@/components/i18n-provider"
import { GradeBadge, RiskBadge } from "@/components/risk-badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
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
import type { OperatorReport } from "@/lib/analytics"

/** Only the fields the table needs — reports carry raw sales we don't ship. */
/**
 * Only what the list needs.
 *
 * The table used to carry thirteen columns — department, shift, hours, sales
 * and score as well — which forced horizontal scrolling and made scanning
 * sixty-four rows for a problem genuinely hard. Every dropped column is on the
 * operator's own profile, one click away, so nothing became unreachable.
 */
export type OperatorRow = Pick<
  OperatorReport,
  | "id"
  | "name"
  | "station"
  | "shift"
  | "revenue"
  | "productivity"
  | "attendanceScore"
  | "score"
  | "grade"
  | "risk"
>

type SortKey =
  | "name"
  | "revenue"
  | "productivity"
  | "attendanceScore"
  | "score"

type Column = { key: SortKey | null; label: string; numeric?: boolean }

function columnsFor(t: ReturnType<typeof useT>): Column[] {
  return [
    { key: "name", label: t.common.operator },
    { key: "revenue", label: t.operators.revenueAzn, numeric: true },
    { key: "productivity", label: t.common.perHour, numeric: true },
    { key: "attendanceScore", label: t.common.attendance, numeric: true },
    // Sorted by the underlying score, since the grade is derived from it.
    { key: "score", label: t.common.grade, numeric: true },
    { key: null, label: t.common.risk },
  ]
}

export function OperatorsTable({ rows }: { rows: OperatorRow[] }) {
  const t = useT()
  const columns = columnsFor(t)
  const [query, setQuery] = React.useState("")
  const [sort, setSort] = React.useState<{ key: SortKey; desc: boolean }>({
    key: "revenue",
    desc: true,
  })

  const visible = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = needle
      ? rows.filter((row) =>
          `${row.name} ${row.station} ${row.shift}`
            .toLowerCase()
            .includes(needle)
        )
      : rows

    return [...filtered].sort((a, b) => {
      const av = a[sort.key]
      const bv = b[sort.key]
      const cmp =
        typeof av === "string" && typeof bv === "string"
          ? av.localeCompare(bv)
          : Number(av) - Number(bv)
      return sort.desc ? -cmp : cmp
    })
  }, [rows, query, sort])

  const toggleSort = (key: SortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, desc: !current.desc }
        : { key, desc: key !== "name" }
    )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-(--card-spacing)">
        <p className="text-muted-foreground">
          {t.operators.countLabel(visible.length, rows.length)} ·{" "}
          {t.operators.profileHint}
        </p>
        <InputGroup className="w-full sm:w-72">
          <InputGroupAddon>
            <IconSearch />
          </InputGroupAddon>
          <InputGroupInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.operators.searchPlaceholder}
            aria-label={t.common.search}
          />
          {query ? (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                variant="ghost"
                aria-label={t.operators.clearSearch}
                onClick={() => setQuery("")}
              >
                <IconX />
              </InputGroupButton>
            </InputGroupAddon>
          ) : null}
        </InputGroup>
      </div>

      {visible.length === 0 ? (
        <Empty className="py-10">
          <EmptyTitle>{t.operators.noMatch(query)}</EmptyTitle>
          <EmptyDescription>
            {t.operators.noMatchDesc}
          </EmptyDescription>
          <Button variant="outline" size="sm" onClick={() => setQuery("")}>
            {t.operators.clearSearch}
          </Button>
        </Empty>
      ) : (
        <ScrollArea className="w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 pl-5">#</TableHead>
                {columns.map((column, i) => (
                  <TableHead
                    key={column.label}
                    className={cn(
                      column.numeric && "text-right",
                      // Position, not label text — the label is translated.
                      i === columns.length - 1 && "pr-5"
                    )}
                  >
                    {column.key ? (
                      <SortButton
                        active={sort.key === column.key}
                        desc={sort.desc}
                        numeric={column.numeric}
                        onClick={() => toggleSort(column.key!)}
                      >
                        {column.label}
                      </SortButton>
                    ) : (
                      column.label
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell className="pl-5 font-mono text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/operators/${row.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {row.name}
                    </Link>
                    {/* Station and shift as a second line rather than two more
                        columns: they identify the person, they are not figures
                        anyone compares down a column. */}
                    <div className="text-xs text-muted-foreground">
                      {row.station} · {t.shifts[row.shift]}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {money(row.revenue)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money(row.productivity)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.attendanceScore}%
                  </TableCell>
                  <TableCell className="text-right">
                    <GradeBadge grade={row.grade} />
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <RiskBadge risk={row.risk} label={t.risk[row.risk]} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </div>
  )
}

function SortButton({
  active,
  desc,
  numeric,
  onClick,
  children,
}: {
  active: boolean
  desc: boolean
  numeric?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  const Icon = !active ? IconArrowsSort : desc ? IconChevronDown : IconChevronUp

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-md outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30",
        numeric && "flex-row-reverse",
        active && "text-foreground"
      )}
    >
      <Icon className="size-3.5 opacity-70" />
      {children}
    </button>
  )
}
