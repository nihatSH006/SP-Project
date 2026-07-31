import Link from "next/link"
import { IconArrowRight } from "@tabler/icons-react"

import { HourlyRevenueChart, RevenueRankChart } from "@/components/charts"
import { AttentionPanel } from "@/components/overview/attention-panel"
import { RevenueHero } from "@/components/overview/revenue-hero"
import { WallLauncher } from "@/components/overview/wall-launcher"
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
import { getSessionUser } from "@/lib/auth"
import { canTriageCase } from "@/lib/cases"
import { deriveStatus } from "@/lib/dashboard-status"
import { getSlice, type SearchParams } from "@/lib/data"
import { getT } from "@/lib/i18n/server"
import { money } from "@/lib/format"

export const metadata = { title: "Overview" }

export default async function OverviewPage(props: {
  searchParams: Promise<SearchParams>
}) {
  const t = await getT()
  const [{ reports, options, target }, user] = await Promise.all([
    getSlice(await props.searchParams),
    getSessionUser(),
  ])
  // An operator has no reason to put a network board on a wall.
  const canOpenWall = Boolean(user && canTriageCase(user))
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
            <MiniStat label={t.overview.sales} value={summary.transactions} />
            <MiniStat label={t.overview.onDuty} value={summary.operators} />
            <MiniStat
              label={t.overview.perHour}
              value={money(summary.avgProductivity)}
              unit="AZN"
            />
            <MiniStat
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

          {canOpenWall ? <WallLauncher t={t} /> : null}

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

/**
 * A number and a word. The old tiles carried an icon, a label, a value, a unit
 * and a sentence of caption each — six of them meant thirty pieces of text
 * competing with the one number that mattered.
 */
function MiniStat({
  label,
  value,
  unit,
}: {
  label: string
  value: React.ReactNode
  unit?: string
}) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-0.5 py-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-2xl font-semibold tracking-tight tabular-nums">
          {value}
          {unit ? (
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              {unit}
            </span>
          ) : null}
        </span>
      </CardContent>
    </Card>
  )
}
