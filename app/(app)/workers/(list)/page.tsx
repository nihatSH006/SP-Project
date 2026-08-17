import {
  IconClockX,
  IconGasStation,
  IconTags,
  IconUsers,
} from "@tabler/icons-react"

import { MiniStat } from "@/components/mini-stat"
import { PageShell } from "@/components/page-shell"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { WorkersTable, type WorkerRow } from "@/components/workers-table"
import { getSlice, type SearchParams } from "@/lib/data"
import { stationId } from "@/lib/firebase/schema"
import { money } from "@/lib/format"
import { getT } from "@/lib/i18n/server"

export const metadata = { title: "Workers" }

/**
 * Every worker's day at a glance: who tapped in, when they tapped out, and
 * what their fob sold. The two facts the whole system runs on — presence
 * and sales — side by side, per person, for a chosen day.
 */
export default async function WorkersPage(props: {
  searchParams: Promise<SearchParams>
}) {
  const t = await getT()
  const params = await props.searchParams
  const { date, reports, options, multiStation } = await getSlice(params)

  const rows: WorkerRow[] = reports.map((r) => ({
    userid: r.userid,
    name: r.adSoyad,
    kartNo: r.kartNo,
    station: r.station,
    checkIn: r.checkIn,
    checkOut: r.checkOut,
    workedHours: r.workedHours,
    salesCount: r.salesCount,
    litres: r.litres,
    revenue: r.revenue,
    alerts: r.alerts.length,
    href: `/workers/${r.userid}?date=${r.date}&st=${stationId(r.station)}`,
  }))

  const tapsMissing = reports.filter(
    (r) => r.checkIn === null || r.checkOut === null
  ).length
  const litres = reports.reduce((sum, r) => sum + r.litres, 0)

  return (
    <PageShell
      options={options}
      title={t.workers.title}
      description={t.workers.description}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat
          icon={IconUsers}
          label={t.workers.onDuty}
          value={reports.length}
        />
        <MiniStat
          icon={IconClockX}
          label={t.workers.tapsMissing}
          value={tapsMissing}
        />
        <MiniStat
          icon={IconTags}
          label={t.workers.colSales}
          value={reports.reduce((sum, r) => sum + r.salesCount, 0)}
        />
        <MiniStat
          icon={IconGasStation}
          label={t.workers.colLitres}
          value={money(litres)}
          unit="L"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{date ?? ""}</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <Empty className="py-10">
              <EmptyMedia variant="icon">
                <IconUsers />
              </EmptyMedia>
              <EmptyTitle>{t.workers.noWorkers}</EmptyTitle>
              <EmptyDescription>{t.workers.noWorkersDesc}</EmptyDescription>
            </Empty>
          ) : (
            <WorkersTable rows={rows} showStation={multiStation} />
          )}
        </CardContent>
      </Card>
    </PageShell>
  )
}
