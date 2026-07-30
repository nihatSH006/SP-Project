import Link from "next/link"
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCircleCheck,
  IconClockHour4,
  IconCoin,
  IconFlag,
  IconGauge,
  IconReceipt,
  IconUsers,
} from "@tabler/icons-react"

import {
  HourlyRevenueChart,
  RevenueRankChart,
  ShiftDonutChart,
} from "@/components/charts"
import { Meter } from "@/components/meter"
import { PageShell } from "@/components/page-shell"
import { RiskBadge } from "@/components/risk-badge"
import { StatTile } from "@/components/stat-tile"
import { NoMatches, StatusLine } from "@/components/status"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  collectAlerts,
  groupRevenue,
  mergeHourly,
  rankOperators,
  shiftDistribution,
  summarise,
  toChartSeries,
} from "@/lib/analytics"
import { getSlice, type SearchParams } from "@/lib/data"
import { bandFor, dayAndTime, money, money2 } from "@/lib/format"

export const metadata = { title: "Dashboard" }

export default async function DashboardPage(props: {
  searchParams: Promise<SearchParams>
}) {
  const { reports, options } = await getSlice(await props.searchParams)
  const summary = summarise(reports)
  const top5 = rankOperators(reports).slice(0, 5)
  const alerts = collectAlerts(reports)

  // Precomputed per-operator buckets, merged — no raw-sale reads.
  const hourlySeries = toChartSeries(mergeHourly(reports.map((r) => r.hourly)))

  const stationRevenue = groupRevenue(reports, "station")
  const departmentRevenue = groupRevenue(reports, "department")

  return (
    <PageShell
      options={options}
      title="Operations dashboard"
      description="Fleet-wide sales, workforce and risk overview for the operational day."
      actions={
        <Button
          className="btn-3d"
          nativeButton={false}
          render={<Link href="/alerts" />}
        >
          Review alerts
          <IconArrowRight data-icon="inline-end" />
        </Button>
      }
    >
      {summary.operators === 0 ? (
        <NoMatches />
      ) : (
        <>
          {/* ------------------------------- KPI row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <StatTile
              emphasis
              label="Total revenue"
              value={money(summary.revenue)}
              unit="AZN"
              icon={IconCoin}
              caption={`${summary.targetPct}% of the ${money(summary.target)} AZN daily target`}
            />
            <StatTile
              label="Transactions"
              value={summary.transactions}
              icon={IconReceipt}
              caption="completed fuel sales"
            />
            <StatTile
              label="Operators on duty"
              value={summary.operators}
              icon={IconUsers}
              caption={`across ${options.stations.length} stations`}
            />
            <StatTile
              label="Avg productivity"
              value={money(summary.avgProductivity)}
              unit="AZN/h"
              icon={IconGauge}
              caption="revenue per working hour"
            />
            <StatTile
              label="Attendance"
              value={summary.avgAttendance}
              unit="%"
              icon={IconClockHour4}
              caption={
                <StatusLine band={bandFor(summary.avgAttendance, 95, 85)}>
                  {summary.avgAttendance >= 95
                    ? "above target"
                    : summary.avgAttendance >= 85
                      ? "near target"
                      : "below target"}
                </StatusLine>
              }
            />
            <StatTile
              label="Open alerts"
              value={summary.alerts}
              icon={IconFlag}
              caption={
                summary.alerts === 0 ? (
                  <StatusLine band="good">all clear</StatusLine>
                ) : (
                  <StatusLine band="crit">needs review</StatusLine>
                )
              }
            />
          </div>

          {/* ------------------- target / risk / highlights */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Daily revenue target</CardTitle>
                <CardDescription>
                  Progress toward {money(summary.target)} AZN
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <Meter
                    label={
                      <span className="font-medium text-foreground">
                        {money(summary.revenue)} AZN
                      </span>
                    }
                    value={summary.targetPct}
                    display={`${summary.targetPct}%`}
                  />
                  <p className="text-muted-foreground">
                    {summary.targetPct >= 100 ? (
                      <StatusLine band="good">Target exceeded.</StatusLine>
                    ) : (
                      `${money(summary.target - summary.revenue)} AZN remaining to reach today's target.`
                    )}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Meter
                    label={
                      <span className="font-medium text-foreground">
                        Operational health
                      </span>
                    }
                    value={summary.health}
                    display={`${summary.health}%`}
                    band={bandFor(summary.health)}
                  />
                  <p className="text-muted-foreground">
                    <StatusLine band={bandFor(summary.health)}>
                      {summary.health >= 90
                        ? "Stable — no significant incident load"
                        : summary.health >= 75
                          ? "Monitor — incident load rising"
                          : "Degraded — management review recommended"}
                    </StatusLine>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Workforce risk</CardTitle>
                <CardDescription>
                  Operators by risk classification
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {(["LOW", "MEDIUM", "HIGH"] as const).map((level) => {
                  const count = summary.riskCounts[level]
                  const band =
                    level === "LOW" ? "good" : level === "MEDIUM" ? "warn" : "crit"
                  return (
                    <Meter
                      key={level}
                      label={<RiskBadge risk={level} />}
                      value={(count / summary.operators) * 100}
                      display={`${count} operator${count === 1 ? "" : "s"}`}
                      band={band}
                    />
                  )
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Today&apos;s highlights</CardTitle>
                <CardDescription>
                  Best performers in the current slice
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="flex flex-col gap-3">
                  <KeyValue label="Top operator">
                    <Link
                      href={`/operators/${summary.topOperator!.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {summary.topOperator!.name}
                    </Link>
                    <span className="text-muted-foreground">
                      {" · "}
                      {money(summary.topOperator!.revenue)} AZN
                    </span>
                  </KeyValue>
                  <KeyValue label="Best station">
                    {summary.bestStation}
                  </KeyValue>
                  <KeyValue label="Best department">
                    {summary.bestDepartment}
                  </KeyValue>
                  <KeyValue label="Avg revenue / operator">
                    {money(summary.revenue / summary.operators)} AZN
                  </KeyValue>
                  <KeyValue label="High-risk operators">
                    {summary.riskCounts.HIGH === 0 ? (
                      <StatusLine band="good">none</StatusLine>
                    ) : (
                      <StatusLine band="crit">
                        {summary.riskCounts.HIGH}
                      </StatusLine>
                    )}
                  </KeyValue>
                </dl>
              </CardContent>
            </Card>
          </div>

          {/* ------------------------------- charts */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue through the day</CardTitle>
              <CardDescription>Hourly fuel-sale revenue, AZN</CardDescription>
            </CardHeader>
            <CardContent>
              <HourlyRevenueChart data={hourlySeries} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by station</CardTitle>
                <CardDescription>Total AZN per station</CardDescription>
              </CardHeader>
              <CardContent>
                <RevenueRankChart data={stationRevenue} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Revenue by department</CardTitle>
                <CardDescription>Total AZN per department</CardDescription>
              </CardHeader>
              <CardContent>
                <RevenueRankChart data={departmentRevenue} />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Shift coverage</CardTitle>
                <CardDescription>Operators per shift</CardDescription>
              </CardHeader>
              <CardContent>
                <ShiftDonutChart data={shiftDistribution(reports)} />
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Top 5 operators</CardTitle>
                <CardDescription>
                  Ranked by revenue, then productivity
                </CardDescription>
                <CardAction>
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={<Link href="/leaderboard" />}
                  >
                    Full ranking
                    <IconArrowRight data-icon="inline-end" />
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 pl-5">#</TableHead>
                      <TableHead>Operator</TableHead>
                      <TableHead>Station</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Sales</TableHead>
                      <TableHead className="text-right">AZN/h</TableHead>
                      <TableHead className="pr-5">Risk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {top5.map((r, index) => (
                      <TableRow key={r.id}>
                        <TableCell className="pl-5 font-mono text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/operators/${r.id}`}
                            className="font-medium underline-offset-4 hover:underline"
                          >
                            {r.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {r.station}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {money(r.revenue)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {r.salesCount}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {money(r.productivity)}
                        </TableCell>
                        <TableCell className="pr-5">
                          <RiskBadge risk={r.risk} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* --------------------------- brief + alerts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Executive brief</CardTitle>
                <CardDescription>
                  Auto-generated from today&apos;s data
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 leading-relaxed text-muted-foreground">
                <p>
                  Today the fleet generated{" "}
                  <Strong>{money(summary.revenue)} AZN</Strong> across{" "}
                  <Strong>{summary.transactions}</Strong> transactions —{" "}
                  <Strong>{summary.targetPct}%</Strong> of the daily revenue
                  target.
                </p>
                <p>
                  <Strong>{summary.topOperator!.name}</Strong> leads with{" "}
                  <Strong>{money(summary.topOperator!.revenue)} AZN</Strong>;{" "}
                  <Strong>{summary.bestStation}</Strong> is the strongest
                  station and <Strong>{summary.bestDepartment}</Strong> the
                  strongest department.
                </p>
                <p>
                  Average productivity is{" "}
                  <Strong>{money(summary.avgProductivity)} AZN/hour</Strong>{" "}
                  with attendance at <Strong>{summary.avgAttendance}%</Strong>.{" "}
                  {summary.alerts === 0
                    ? "No suspicious activity was detected."
                    : `${summary.alerts} suspicious transaction${summary.alerts === 1 ? "" : "s"} require review before shift close.`}
                </p>
                <p>
                  <StatusLine band={bandFor(summary.targetPct, 100, 80)}>
                    {summary.targetPct >= 100
                      ? "Revenue target exceeded"
                      : summary.targetPct >= 80
                        ? "Revenue target nearly achieved"
                        : "Revenue target missed"}
                  </StatusLine>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent alerts</CardTitle>
                <CardDescription>
                  Sales recorded outside working hours
                </CardDescription>
                <CardAction>
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={<Link href="/alerts" />}
                  >
                    Alert center
                    <IconArrowRight data-icon="inline-end" />
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                {alerts.length === 0 ? (
                  <Empty className="py-8">
                    <EmptyMedia variant="icon">
                      <IconCircleCheck className="text-emerald-400" />
                    </EmptyMedia>
                    <EmptyTitle>No operational alerts</EmptyTitle>
                    <EmptyDescription>
                      Every sale in this slice falls inside its operator&apos;s
                      registered working hours.
                    </EmptyDescription>
                  </Empty>
                ) : (
                  <ItemGroup>
                    {alerts.slice(0, 5).map((alert, index) => (
                      <div key={`${alert.operatorId}-${alert.time.getTime()}-${index}`}>
                        {index > 0 ? <ItemSeparator /> : null}
                        <Item size="sm" className="px-0">
                          <ItemMedia
                            variant="icon"
                            className="size-8 rounded-xl bg-red-500/10 text-red-400"
                          >
                            <IconAlertTriangle />
                          </ItemMedia>
                          <ItemContent>
                            <ItemTitle>
                              <Link
                                href={`/operators/${alert.operatorId}`}
                                className="underline-offset-4 hover:underline"
                              >
                                {alert.operator}
                              </Link>
                              <span className="text-muted-foreground">
                                {" · "}
                                {money2(alert.amount)} AZN
                              </span>
                            </ItemTitle>
                            <ItemDescription>
                              {dayAndTime(alert.time)} · {alert.station}
                            </ItemDescription>
                          </ItemContent>
                        </Item>
                      </div>
                    ))}
                  </ItemGroup>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </PageShell>
  )
}

function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="font-medium text-foreground">{children}</strong>
}

function KeyValue({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  )
}

