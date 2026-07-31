import Link from "next/link"
import {
  IconArrowRight,
  IconClockHour4,
  IconGauge,
  IconReceipt,
  IconUsers,
} from "@tabler/icons-react"

import { HourlyRevenueChart, RevenueRankChart } from "@/components/charts"
import { MiniStat } from "@/components/mini-stat"
import { AttentionPanel } from "@/components/overview/attention-panel"
import { RevenueHero } from "@/components/overview/revenue-hero"
import { PageShell } from "@/components/page-shell"
import { NoMatches } from "@/components/status"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  groupRevenue,
  mergeHourly,
  summarise,
  toChartSeries,
} from "@/lib/analytics"
import { deriveStatus } from "@/lib/dashboard-status"
import { getSlice, type SearchParams } from "@/lib/data"
import { getT } from "@/lib/i18n/server"
import { money } from "@/lib/format"

export const metadata = { title: "Overview" }

export default async function OverviewPage(props: {
  searchParams: Promise<SearchParams>
}) {
  const t = await getT()
  const { reports, options, target } = await getSlice(await props.searchParams)
  const summary = summarise(reports, target)

  const status = deriveStatus({
    alerts: summary.alerts,
    highRisk: summary.riskCounts.HIGH,
    attendance: summary.avgAttendance,
    health: summary.health,
    hasTarget: summary.hasTarget,
    targetPct: summary.targetPct,
  })

  const hourlySeries = toChartSeries(mergeHourly(reports.map((r) => r.hourly)))
  const stationRevenue = groupRevenue(reports, "station")

  return (
    <PageShell
      options={options}
      title={t.overview.title}
      actions={
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/breakdown" />}
        >
          {t.overview.breakdown}
          <IconArrowRight data-icon="inline-end" />
        </Button>
      }
    >
      {summary.operators === 0 ? (
        <NoMatches
          title={t.errors.noMatch(t.common.operators.toLowerCase())}
          description={t.errors.noMatchDesc(t.common.operators.toLowerCase())}
        />
      ) : (
        <>
          {/* Two questions, side by side: are we hitting the number, and does
              anything need me. Everything else on this page is support. */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RevenueHero
              revenue={summary.revenue}
              target={summary.target}
              targetPct={summary.targetPct}
              hasTarget={summary.hasTarget}
              t={t}
            />
            <AttentionPanel verdict={status.verdict} items={status.items} t={t} />
          </div>

          {/* Supporting numbers. No icons, no captions — the labels are the
              captions, and four short words beat four sentences. */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <MiniStat
              icon={IconReceipt}
              label={t.overview.sales}
              value={summary.transactions}
            />
            <MiniStat
              icon={IconUsers}
              label={t.overview.onDuty}
              value={summary.operators}
            />
            <MiniStat
              icon={IconGauge}
              label={t.overview.perHour}
              value={money(summary.avgProductivity)}
              unit="₼"
            />
            <MiniStat
              icon={IconClockHour4}
              label={t.overview.attendance}
              value={summary.avgAttendance}
              unit="%"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t.overview.today}</CardTitle>
            </CardHeader>
            <CardContent>
              <HourlyRevenueChart data={hourlySeries} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t.overview.byStation}</CardTitle>
              <CardAction>
                <Button
                  variant="ghost"
                  size="sm"
                  nativeButton={false}
                  render={<Link href="/stations" />}
                >
                  {t.overview.seeAll}
                  <IconArrowRight data-icon="inline-end" />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <RevenueRankChart data={stationRevenue} />
            </CardContent>
          </Card>
        </>
      )}
    </PageShell>
  )
}
