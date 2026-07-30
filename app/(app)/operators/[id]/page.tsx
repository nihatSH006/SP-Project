import Link from "next/link"
import { notFound } from "next/navigation"
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconClockHour4,
  IconCoin,
  IconGauge,
  IconReceipt,
  IconTargetArrow,
  IconTrendingDown,
  IconTrendingUp,
} from "@tabler/icons-react"

import { HourlyRevenueChart } from "@/components/charts"
import { Meter } from "@/components/meter"
import { PageShell } from "@/components/page-shell"
import { RiskBadge } from "@/components/risk-badge"
import { StatTile } from "@/components/stat-tile"
import { StatusLine } from "@/components/status"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item"
import { SCHEDULED_HOURS, toChartSeries } from "@/lib/analytics"
import { getOperatorReports, resolveDate } from "@/lib/data"
import { getT } from "@/lib/i18n/server"
import { bandFor, dayAndTime, money, money2, timeOfDay } from "@/lib/format"

export async function generateMetadata(props: PageProps<"/operators/[id]">) {
  const { id } = await props.params
  const reports = await getOperatorReports()
  const report = reports.find((r) => r.id === Number(id))
  return { title: report ? report.name : "Operator" }
}

// No `generateStaticParams`: the operator list is per-session data now, so
// these pages must render per request rather than being baked at build time.

export default async function OperatorDetailPage(
  props: PageProps<"/operators/[id]">
) {
  const t = await getT()
  const { id } = await props.params
  // Honor ?date= so drilling in from a historical day stays on that day.
  const date = await resolveDate(await props.searchParams)
  const reports = await getOperatorReports(date ?? undefined)
  // Also covers an operator outside the caller's station scope — they get a 404
  // rather than a "forbidden", which avoids confirming the record exists.
  const report = reports.find((r) => r.id === Number(id))
  if (!report) notFound()

  const fleetAvg = {
    revenue: reports.reduce((s, r) => s + r.revenue, 0) / reports.length,
    productivity:
      reports.reduce((s, r) => s + r.productivity, 0) / reports.length,
    attendance:
      reports.reduce((s, r) => s + r.attendanceScore, 0) / reports.length,
  }

  const assessment =
    report.score >= 90
      ? {
          band: "good" as const,
          verdict: t.operatorDetail.topTier,
          body: t.operatorDetail.topTierBody(report.name),
          action: t.operatorDetail.topTierAction,
        }
      : report.score >= 75
        ? {
            band: "good" as const,
            verdict: t.operatorDetail.performingWell,
            body: t.operatorDetail.performingWellBody(report.name),
            action: t.operatorDetail.performingWellAction,
          }
        : {
            band: "warn" as const,
            verdict: t.operatorDetail.needsAttention,
            body: t.operatorDetail.needsAttentionBody,
            action: t.operatorDetail.needsAttentionAction,
          }

  const window = `${timeOfDay(report.entry)}–${timeOfDay(report.exit)}`

  return (
    <PageShell
      title={t.operatorDetail.title}
      description={t.operatorDetail.description(t.shifts[report.shift])}
      actions={
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/operators" />}
        >
          <IconArrowLeft data-icon="inline-start" />
          {t.operatorDetail.allOperators}
        </Button>
      }
    >
      {/* ---------------------------------------- identity */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4">
          <Avatar size="lg" className="rounded-2xl">
            <AvatarFallback className="rounded-2xl text-lg">
              {report.name.slice(0, 1)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-52 flex-1 flex-col gap-2">
            <h2 className="text-lg font-semibold tracking-tight">
              {report.name}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{report.department}</Badge>
              <Badge variant="secondary">{report.station}</Badge>
              <Badge variant="outline">
                {t.shifts[report.shift]} · {window}
              </Badge>
              <RiskBadge risk={report.risk} label={t.risk[report.risk]} />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="btn-3d flex size-14 items-center justify-center rounded-2xl border text-xl font-semibold tabular-nums">
              {report.grade}
            </span>
            <span className="text-xs text-muted-foreground">
              {t.operatorDetail.grade}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ---------------------------------------- KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatTile
          label={t.common.revenue}
          value={money(report.revenue)}
          unit="AZN"
          icon={IconCoin}
          caption={
            <VsFleet value={report.revenue} average={fleetAvg.revenue} />
          }
        />
        <StatTile
          label={t.common.transactions}
          value={report.salesCount}
          icon={IconReceipt}
          caption={t.operatorDetail.perHourCount(report.salesPerHour)}
        />
        <StatTile
          label={t.operatorDetail.performanceScore}
          value={report.score}
          unit="/100"
          icon={IconTargetArrow}
          caption={t.operatorDetail.scoreBlend}
        />
        <StatTile
          label={t.common.productivity}
          value={money(report.productivity)}
          unit="AZN/h"
          icon={IconGauge}
          caption={
            <VsFleet
              value={report.productivity}
              average={fleetAvg.productivity}
            />
          }
        />
        <StatTile
          label={t.operatorDetail.workingHours}
          value={report.workingHours}
          unit="h"
          icon={IconClockHour4}
          caption={t.operatorDetail.ofScheduled(SCHEDULED_HOURS)}
        />
        <StatTile
          label={t.common.attendance}
          value={report.attendanceScore}
          unit="%"
          icon={IconClockHour4}
          caption={t.operatorDetail.fleetAvg(`${fleetAvg.attendance.toFixed(1)}%`)}
        />
      </div>

      {/* ---------------------------------------- shift chart + assessment */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t.operatorDetail.revenueThroughShift}</CardTitle>
            <CardDescription>{t.operatorDetail.hourlyBy(report.name)}</CardDescription>
          </CardHeader>
          <CardContent>
            <HourlyRevenueChart data={toChartSeries(report.hourly)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.operatorDetail.assessment}</CardTitle>
            <CardDescription>{t.operatorDetail.assessmentDesc}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-muted-foreground">
            <StatusLine band={assessment.band}>{assessment.verdict}</StatusLine>
            <p>{assessment.body}</p>
            <p>{assessment.action}</p>

            <Meter
              label={
                <span className="font-medium text-foreground">
                  {t.operatorDetail.performanceScore}
                </span>
              }
              value={report.score}
              display={`${report.score}/100`}
              band={bandFor(report.score, 90, 75)}
            />
            <Meter
              label={
                <span className="font-medium text-foreground">
                  {t.common.attendance}
                </span>
              }
              value={report.attendanceScore}
              display={`${report.attendanceScore}%`}
              band={bandFor(report.attendanceScore, 90, 70)}
            />

            <p>
              {report.risk === "HIGH" ? (
                <StatusLine band="crit">
                  {t.operatorDetail.riskHigh(report.suspicious)}
                </StatusLine>
              ) : report.risk === "MEDIUM" ? (
                <StatusLine band="warn">{t.operatorDetail.riskMedium}</StatusLine>
              ) : (
                <StatusLine band="good">{t.operatorDetail.riskLow}</StatusLine>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ---------------------------------------- flagged transactions */}
      {report.alerts.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t.operatorDetail.flagged}</CardTitle>
            <CardDescription>{t.operatorDetail.flaggedDesc(window)}</CardDescription>
          </CardHeader>
          <CardContent>
            <ItemGroup>
              {report.alerts.map((alert, index) => (
                <div key={`${alert.time.getTime()}-${index}`}>
                  {index > 0 ? <ItemSeparator /> : null}
                  <Item size="sm" className="px-0">
                    <ItemMedia
                      variant="icon"
                      className="size-8 rounded-xl bg-red-500/10 text-red-400"
                    >
                      <IconAlertTriangle />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{money2(alert.amount)} AZN</ItemTitle>
                      <ItemDescription>
                        {t.alerts.outsideHours} · {dayAndTime(alert.time)}
                      </ItemDescription>
                    </ItemContent>
                  </Item>
                </div>
              ))}
            </ItemGroup>
          </CardContent>
        </Card>
      ) : null}
    </PageShell>
  )
}

function VsFleet({ value, average }: { value: number; average: number }) {
  const above = value >= average
  const Icon = above ? IconTrendingUp : IconTrendingDown

  return (
    <span className="inline-flex items-center gap-1.5">
      fleet avg {money(average)}
      <Icon
        className={`size-3.5 ${above ? "text-emerald-400" : "text-red-400"}`}
      />
      <span className={above ? "text-emerald-400" : "text-red-400"}>
        {above ? "above" : "below"}
      </span>
    </span>
  )
}
