import { MiniStat } from "@/components/mini-stat"
import { OperatorsTable, type OperatorRow } from "@/components/operators-table"
import { RiskChips } from "@/components/overview/risk-chips"
import { PageShell } from "@/components/page-shell"
import { NoMatches } from "@/components/status"
import { Card, CardContent } from "@/components/ui/card"
import {
  applyFilters,
  rankOperators,
  summarise,
  type RiskLevel,
} from "@/lib/analytics"
import { canCompareStations } from "@/lib/auth"
import { getSlice, type SearchParams } from "@/lib/data"
import { getT } from "@/lib/i18n/server"
import { money } from "@/lib/format"

export const metadata = { title: "Operators" }

export default async function OperatorsPage(props: {
  searchParams: Promise<SearchParams>
}) {
  const t = await getT()
  const params = await props.searchParams
  const { reports, options, target, filters } = await getSlice(params)
  const multiStation = await canCompareStations()
  const summary = summarise(reports, target)

  // Risk counts come from the slice WITHOUT the risk filter, so the chips keep
  // working after one is chosen rather than collapsing to a single band.
  const unbanded = applyFilters(reports, { ...filters, risk: null })
  const counts: Record<RiskLevel, number> = { LOW: 0, MEDIUM: 0, HIGH: 0 }
  for (const r of unbanded) counts[r.risk] += 1

  // Ship only what the table renders — reports carry every raw sale.
  const rows: OperatorRow[] = rankOperators(reports).map((r) => ({
    id: r.id,
    name: r.name,
    station: r.station,
    shift: r.shift,
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
      {/* The first control on the page is "show me the ones with a problem".
          That is what this page is opened for. */}
      <RiskChips
        counts={counts}
        total={unbanded.length}
        active={filters.risk}
        params={params}
        t={t}
      />

      {rows.length === 0 ? (
        <NoMatches
          title={t.errors.noMatch(t.common.operators.toLowerCase())}
          description={t.errors.noMatchDesc(t.common.operators.toLowerCase())}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MiniStat label={t.operators.onDuty} value={summary.operators} />
            <MiniStat
              label={t.common.revenue}
              value={money(summary.revenue)}
              unit="₼"
            />
            <MiniStat
              label={t.operators.perHour}
              value={money(summary.avgProductivity)}
              unit="₼"
            />
            <MiniStat
              label={t.common.attendance}
              value={summary.avgAttendance}
              unit="%"
            />
          </div>

          <Card>
            <CardContent className="px-0">
              <OperatorsTable rows={rows} showStation={multiStation} />
            </CardContent>
          </Card>
        </>
      )}
    </PageShell>
  )
}
