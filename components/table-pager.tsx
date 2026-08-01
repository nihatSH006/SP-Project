"use client"

import * as React from "react"

import { useT } from "@/components/i18n-provider"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/**
 * Paging controls shared by every long table.
 *
 * Extracted the second time a table needed them. The page-size options differ
 * per table — an operator roster and a ranked leaderboard are read at
 * different lengths — so they are passed in rather than fixed here.
 */

/**
 * Page numbers to show, with gaps collapsed.
 *
 * Always the first and last page plus a window around the current one, so the
 * control keeps a fixed width however many pages there are. A row of buttons
 * that grows with the data becomes its own scrolling problem.
 */
export function pageWindow(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages = new Set([1, total, current, current - 1, current + 1])
  const sorted = [...pages]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b)

  const out: (number | "gap")[] = []
  let previous = 0
  for (const page of sorted) {
    if (previous && page - previous > 1) out.push("gap")
    out.push(page)
    previous = page
  }
  return out
}

/** Reads "50 per page" on its face, so it needs no separate label. */
export function PageSizeSelect({
  value,
  sizes,
  onChange,
  id = "rows-per-page",
}: {
  value: number
  sizes: readonly number[]
  onChange: (size: number) => void
  id?: string
}) {
  const t = useT()
  return (
    <Select
      value={String(value)}
      onValueChange={(next) => onChange(Number(next))}
      items={sizes.map((size) => ({
        value: String(size),
        label: t.operators.perPage(size),
      }))}
    >
      <SelectTrigger id={id} size="sm" className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {sizes.map((size) => (
          <SelectItem key={size} value={String(size)}>
            {t.operators.perPage(size)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function TablePagination({
  page,
  totalPages,
  total,
  start,
  pageSize,
  onPage,
}: {
  page: number
  totalPages: number
  total: number
  start: number
  pageSize: number
  onPage: (page: number) => void
}) {
  const t = useT()
  if (total === 0) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-(--card-spacing) pb-1">
      <p
        // The total as an attribute. Every language orders the range label
        // differently — Azerbaijani puts the total first — so parsing the
        // sentence to find it is a test that breaks on translation.
        data-row-total={total}
        className="text-sm text-muted-foreground tabular-nums"
      >
        {t.operators.showingRange(
          start + 1,
          Math.min(start + pageSize, total),
          total
        )}
      </p>

      {totalPages > 1 ? (
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                text={t.common.previousPage}
                aria-disabled={page === 1}
                className={page === 1 ? "pointer-events-none opacity-40" : undefined}
                onClick={(event) => {
                  // The anchor is presentational; paging lives in state, so it
                  // must not actually navigate.
                  event.preventDefault()
                  onPage(page - 1)
                }}
              />
            </PaginationItem>

            {pageWindow(page, totalPages).map((item, i) =>
              item === "gap" ? (
                <PaginationItem key={`gap-${i}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={item}>
                  <PaginationLink
                    href="#"
                    isActive={item === page}
                    onClick={(event) => {
                      event.preventDefault()
                      onPage(item)
                    }}
                  >
                    {item}
                  </PaginationLink>
                </PaginationItem>
              )
            )}

            <PaginationItem>
              <PaginationNext
                href="#"
                text={t.common.nextPage}
                aria-disabled={page === totalPages}
                className={
                  page === totalPages
                    ? "pointer-events-none opacity-40"
                    : undefined
                }
                onClick={(event) => {
                  event.preventDefault()
                  onPage(page + 1)
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  )
}

/**
 * Page state for a list of `total` rows.
 *
 * The page is CLAMPED during render rather than reset from an effect:
 * filtering down to three results while on page four should show those three,
 * not an empty table for a frame before correcting itself.
 */
export function usePaging(total: number, sizes: readonly number[]) {
  const [pageSize, setSize] = React.useState(sizes[0])
  const [page, setPage] = React.useState(1)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(page, totalPages)
  const start = (current - 1) * pageSize

  return {
    page: current,
    pageSize,
    totalPages,
    start,
    setPage: (next: number) => setPage(Math.min(Math.max(1, next), totalPages)),
    setPageSize: (size: number) => {
      setSize(size)
      // Row 60 sits on a different page once the size changes; staying put
      // would land somewhere arbitrary.
      setPage(1)
    },
    reset: () => setPage(1),
  }
}
