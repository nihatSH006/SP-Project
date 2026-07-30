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
          verdict: "Top-tier performance",
          body: `${report.name} is one of the strongest operators today — excellent attendance and high revenue generation.`,
          action:
            "Recommendation: recognise this operator and consider leadership responsibilities.",
        }
      : report.score >= 75
        ? {
            band: "good" as const,
            verdict: "Performing well",
            body: `${report.name} is performing well; some indicators can still improve.`,
            action:
              "Recommendation: continue monitoring and provide coaching where useful.",
          }
        : {
            band: "warn" as const,
            verdict: "Needs management attention",
            body: "Performance is below expectations for the day.",
            action:
              "Recommendation: review attendance and productivity, and monitor upcoming transactions.",
          }

  const window = `${timeOfDay(report.entry)}–${timeOfDay(report.exit)}`

  return (
    <PageShell
      title="Operator profile"
      description={`Full performance and risk assessment for the ${report.shift.toLowerCase()} shift.`}
      actions={
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/operators" />}
        >
          <IconArrowLeft data-icon="inline-start" />
          All operators
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
                {report.shift} shift · {window}
              </Badge>
              <RiskBadge risk={report.risk} />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="btn-3d flex size-14 items-center justify-center rounded-2xl border text-xl font-semibold tabular-nums">
              {report.grade}
            </span>
            <span className="text-xs text-muted-foreground">grade</span>
          </div>
        </CardContent>
      </Card>

      {/* ---------------------------------------- KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatTile
          label="Revenue"
          value={money(report.revenue)}
          unit="AZN"
          icon={IconCoin}
          caption={
            <VsFleet value={report.revenue} average={fleetAvg.revenue} />
          }
        />
        <StatTile
          label="Transactions"
          value={report.salesCount}
          icon={IconReceipt}
          caption={`${report.salesPerHour} per hour`}
        />
        <StatTile
          label="Performance score"
          value={report.score}
          unit="/100"
          icon={IconTargetArrow}
          caption="attendance + productivity blend"
        />
        <StatTile
          label="Productivity"
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
          label="Working hours"
          value={report.workingHours}
          unit="h"
          icon={IconClockHour4}
          caption={`of ${SCHEDULED_HOURS} scheduled`}
        />
        <StatTile
          label="Attendance"
          value={report.attendanceScore}
          unit="%"
          icon={IconClockHour4}
          caption={`fleet avg ${fleetAvg.attendance.toFixed(1)}%`}
        />
      </div>

      {/* ---------------------------------------- shift chart + assessment */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue through the shift</CardTitle>
            <CardDescription>
              Hourly revenue recorded by {report.name}, AZN
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HourlyRevenueChart data={toChartSeries(report.hourly)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assessment</CardTitle>
            <CardDescription>Auto-generated recommendation</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-muted-foreground">
            <StatusLine band={assessment.band}>{assessment.verdict}</StatusLine>
            <p>{assessment.body}</p>
            <p>{assessment.action}</p>

            <Meter
              label={
                <span className="font-medium text-foreground">
                  Performance score
                </span>
              }
              value={report.score}
              display={`${report.score}/100`}
              band={bandFor(report.score, 90, 75)}
            />
            <Meter
              label={
                <span className="font-medium text-foreground">Attendance</span>
              }
              value={report.attendanceScore}
              display={`${report.attendanceScore}%`}
              band={bandFor(report.attendanceScore, 90, 70)}
            />

            <p>
              {report.risk === "HIGH" ? (
                <StatusLine band="crit">
                  {report.suspicious} suspicious transaction
                  {report.suspicious === 1 ? "" : "s"} — immediate investigation
                  recommended.
                </StatusLine>
              ) : report.risk === "MEDIUM" ? (
                <StatusLine band="warn">
                  Keep this operator under observation.
                </StatusLine>
              ) : (
                <StatusLine band="good">
                  No operational concerns detected.
                </StatusLine>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ---------------------------------------- flagged transactions */}
      {report.alerts.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Flagged transactions</CardTitle>
            <CardDescription>
              Sales recorded outside this operator&apos;s {window} working
              window
            </CardDescription>
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
                        {alert.reason} · {dayAndTime(alert.time)}
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
