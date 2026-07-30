import { IconClockHour4, IconCoin, IconGauge, IconUsers } from "@tabler/icons-react"

import { OperatorsTable, type OperatorRow } from "@/components/operators-table"
import { PageShell } from "@/components/page-shell"
import { StatTile } from "@/components/stat-tile"
import { NoMatches } from "@/components/status"
import { Card, CardContent } from "@/components/ui/card"
import { rankOperators, summarise } from "@/lib/analytics"
import { getSlice, type SearchParams } from "@/lib/data"
import { getT } from "@/lib/i18n/server"
import { money } from "@/lib/format"

export const metadata = { title: "Operators" }

export default async function OperatorsPage(props: {
  searchParams: Promise<SearchParams>
}) {
  const t = await getT()
  const { reports, options, target } = await getSlice(await props.searchParams)
  const summary = summarise(reports, target)

  // Ship only what the table renders — reports carry every raw sale.
  const rows: OperatorRow[] = rankOperators(reports).map((r) => ({
    id: r.id,
    name: r.name,
    department: r.department,
    station: r.station,
    shift: r.shift,
    workingHours: r.workingHours,
    salesCount: r.salesCount,
    revenue: r.revenue,
    productivity: r.productivity,
    attendanceScore: r.attendanceScore,
    score: r.score,
    grade: r.grade,
    risk: r.risk,
  }))

  return (
    <PageShell
      options={options}
      title={t.operators.title}
      description={t.operators.description}
    >
      {rows.length === 0 ? (
        <NoMatches
          title={t.errors.noMatch(t.common.operators.toLowerCase())}
          description={t.errors.noMatchDesc(t.common.operators.toLowerCase())}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatTile
              label={t.common.operators}
              value={summary.operators}
              icon={IconUsers}
              caption={t.operators.inCurrentSlice}
            />
            <StatTile
              label={t.common.revenue}
              value={money(summary.revenue)}
              unit="AZN"
              icon={IconCoin}
              caption={t.operators.transactionsCount(summary.transactions)}
            />
            <StatTile
              label={t.dashboard.avgProductivity}
              value={money(summary.avgProductivity)}
              unit="AZN/h"
              icon={IconGauge}
              caption={t.operators.perWorkingHour}
            />
            <StatTile
              label={t.operators.avgAttendance}
              value={summary.avgAttendance}
              unit="%"
              icon={IconClockHour4}
              caption={t.operators.againstShift}
            />
          </div>

          <Card>
            <CardContent className="px-0">
              <OperatorsTable rows={rows} />
            </CardContent>
          </Card>
        </>
      )}
    </PageShell>
  )
}
