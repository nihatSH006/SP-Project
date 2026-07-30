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
export type OperatorRow = Pick<
  OperatorReport,
  | "id"
  | "name"
  | "department"
  | "station"
  | "shift"
  | "workingHours"
  | "salesCount"
  | "revenue"
  | "productivity"
  | "attendanceScore"
  | "score"
  | "grade"
  | "risk"
>

type SortKey =
  | "name"
  | "workingHours"
  | "salesCount"
  | "revenue"
  | "productivity"
  | "attendanceScore"
  | "score"

const columns: {
  key: SortKey | null
  label: string
  numeric?: boolean
}[] = [
  { key: "name", label: "Operator" },
  { key: null, label: "Department" },
  { key: null, label: "Station" },
  { key: null, label: "Shift" },
  { key: "workingHours", label: "Hours", numeric: true },
  { key: "salesCount", label: "Sales", numeric: true },
  { key: "revenue", label: "Revenue (AZN)", numeric: true },
  { key: "productivity", label: "AZN/h", numeric: true },
  { key: "attendanceScore", label: "Attendance", numeric: true },
  { key: "score", label: "Score", numeric: true },
  { key: null, label: "Grade" },
  { key: null, label: "Risk" },
]

export function OperatorsTable({ rows }: { rows: OperatorRow[] }) {
  const [query, setQuery] = React.useState("")
  const [sort, setSort] = React.useState<{ key: SortKey; desc: boolean }>({
    key: "revenue",
    desc: true,
  })

  const visible = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = needle
      ? rows.filter((row) =>
          `${row.name} ${row.station} ${row.department} ${row.shift}`
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
          {visible.length === rows.length
            ? `${rows.length} operator${rows.length === 1 ? "" : "s"}`
            : `${visible.length} of ${rows.length} operators`}{" "}
          · click a name for the full profile
        </p>
        <InputGroup className="w-full sm:w-72">
          <InputGroupAddon>
            <IconSearch />
          </InputGroupAddon>
          <InputGroupInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, station, department…"
            aria-label="Search operators"
          />
          {query ? (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                variant="ghost"
                aria-label="Clear search"
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
          <EmptyTitle>No operators match “{query}”</EmptyTitle>
          <EmptyDescription>
            Try a different name, station or department.
          </EmptyDescription>
          <Button variant="outline" size="sm" onClick={() => setQuery("")}>
            Clear search
          </Button>
        </Empty>
      ) : (
        <ScrollArea className="w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 pl-5">#</TableHead>
                {columns.map((column) => (
                  <TableHead
                    key={column.label}
                    className={cn(
                      column.numeric && "text-right",
                      column.label === "Risk" && "pr-5"
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
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.department}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.station}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.shift}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.workingHours}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.salesCount}
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
                  <TableCell className="text-right tabular-nums">
                    {row.score}
                  </TableCell>
                  <TableCell>
                    <GradeBadge grade={row.grade} />
                  </TableCell>
                  <TableCell className="pr-5">
                    <RiskBadge risk={row.risk} />
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
