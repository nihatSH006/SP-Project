"use client"

import { useT } from "@/components/i18n-provider"
import {
  PageSizeSelect,
  TablePagination,
  usePaging,
} from "@/components/table-pager"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { SaleRow } from "@/lib/data"
import { money2 } from "@/lib/format"

/**
 * One worker-day's sale rows, straight from THE sales table — paged, because
 * a live day carries hundreds of rows and a wall of them reads as noise.
 * Each row shows its full date + time: a night shift's sales cross midnight,
 * and a printed row should stand on its own.
 */

const PAGE_SIZES = [50, 100, 250] as const

const p2 = (n: number) => String(n).padStart(2, "0")

const dateStamp = (at: number) => {
  const d = new Date(at)
  return `${p2(d.getDate())}.${p2(d.getMonth() + 1)}`
}

const timeStamp = (at: number) => {
  const d = new Date(at)
  return `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`
}

export function WorkerSalesTable({ sales }: { sales: SaleRow[] }) {
  const t = useT()
  const paging = usePaging(sales.length, PAGE_SIZES)
  const page = sales.slice(paging.start, paging.start + paging.pageSize)

  if (sales.length === 0) {
    return (
      <p className="px-5 text-sm text-muted-foreground">{t.workers.noSales}</p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end px-5">
        <PageSizeSelect
          value={paging.pageSize}
          sizes={PAGE_SIZES}
          onChange={paging.setPageSize}
        />
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">{t.workers.colTime}</TableHead>
              <TableHead>{t.workers.colGrade}</TableHead>
              <TableHead className="text-right">
                {t.workers.colLitres}
              </TableHead>
              <TableHead className="text-right">
                {t.workers.colAmount}
              </TableHead>
              {/* v_no exists in the data but not on screen: its meaning is
                  unconfirmed, and an unexplained column invites wrong
                  guesses in front of officials. */}
              <TableHead className="pr-5">db1_id</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {page.map((sale) => (
              <TableRow key={sale.db1Id}>
                <TableCell className="pl-5 font-mono tabular-nums">
                  <span className="text-muted-foreground">
                    {dateStamp(sale.at)}
                  </span>{" "}
                  {timeStamp(sale.at)}
                </TableCell>
                <TableCell>{sale.grade}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {sale.litres.toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {money2(sale.amount)} ₼
                </TableCell>
                <TableCell className="pr-5 font-mono text-xs text-muted-foreground">
                  {sale.db1Id}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        page={paging.page}
        totalPages={paging.totalPages}
        total={sales.length}
        start={paging.start}
        pageSize={paging.pageSize}
        onPage={paging.setPage}
      />
    </div>
  )
}
