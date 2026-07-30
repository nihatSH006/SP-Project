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
import { getT } from "@/lib/i18n/server"
import { bandFor, dayAndTime, money, money2 } from "@/lib/format"

export const metadata = { title: "Dashboard" }

export default async function DashboardPage(props: {
  searchParams: Promise<SearchParams>
}) {
  const t = await getT()
  const { reports, options, target } = await getSlice(await props.searchParams)
  const summary = summarise(reports, target)
  const top5 = rankOperators(reports).slice(0, 5)
  const alerts = collectAlerts(reports)

  // Precomputed per-operator buckets, merged — no raw-sale reads.
  const hourlySeries = toChartSeries(mergeHourly(reports.map((r) => r.hourly)))

  const stationRevenue = groupRevenue(reports, "station")
  const departmentRevenue = groupRevenue(reports, "department")

  return (
    <PageShell
      options={options}
      title={t.dashboard.title}
      description={t.dashboard.description}
      actions={
        <Button
          className="btn-3d"
          nativeButton={false}
          render={<Link href="/alerts" />}
        >
          {t.dashboard.reviewAlerts}
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
          {/* ------------------------------- KPI row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <StatTile
              emphasis
              label={t.dashboard.totalRevenue}
              value={money(summary.revenue)}
              unit="AZN"
              icon={IconCoin}
              caption={
                summary.hasTarget
                  ? t.dashboard.targetProgress(summary.targetPct, money(summary.target))
                  : t.dashboard.noTarget
              }
            />
            <StatTile
              label={t.common.transactions}
              value={summary.transactions}
              icon={IconReceipt}
              caption={t.dashboard.completedSales}
            />
            <StatTile
              label={t.dashboard.operatorsOnDuty}
              value={summary.operators}
              icon={IconUsers}
              caption={t.dashboard.acrossStations(options.stations.length)}
            />
            <StatTile
              label={t.dashboard.avgProductivity}
              value={money(summary.avgProductivity)}
              unit="AZN/h"
              icon={IconGauge}
              caption={t.dashboard.revenuePerHour}
            />
            <StatTile
              label={t.common.attendance}
              value={summary.avgAttendance}
              unit="%"
              icon={IconClockHour4}
              caption={
                <StatusLine band={bandFor(summary.avgAttendance, 95, 85)}>
                  {summary.avgAttendance >= 95
                    ? t.dashboard.aboveTarget
                    : summary.avgAttendance >= 85
                      ? t.dashboard.nearTarget
                      : t.dashboard.belowTarget}
                </StatusLine>
              }
            />
            <StatTile
              label={t.dashboard.openAlerts}
              value={summary.alerts}
              icon={IconFlag}
              caption={
                summary.alerts === 0 ? (
                  <StatusLine band="good">{t.dashboard.allClear}</StatusLine>
                ) : (
                  <StatusLine band="crit">{t.dashboard.needsReview}</StatusLine>
                )
              }
            />
          </div>

          {/* ------------------- target / risk / highlights */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>{t.dashboard.dailyTarget}</CardTitle>
                <CardDescription>
                  {summary.hasTarget
                    ? t.dashboard.progressToward(money(summary.target))
                    : t.dashboard.setTargetsPrompt}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  {summary.hasTarget ? (
                    <>
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
                          <StatusLine band="good">{t.dashboard.targetExceeded}</StatusLine>
                        ) : (
                          t.dashboard.remainingToTarget(
                            money(summary.target - summary.revenue)
                          )
                        )}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-semibold tabular-nums">
                        {money(summary.revenue)}{" "}
                        <span className="text-sm font-normal text-muted-foreground">
                          AZN
                        </span>
                      </p>
                      <p className="text-muted-foreground">
                        No target configured — an administrator can set one per
                        station in Settings.
                      </p>
                    </>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Meter
                    label={
                      <span className="font-medium text-foreground">
                        {t.dashboard.operationalHealth}
                      </span>
                    }
                    value={summary.health}
                    display={`${summary.health}%`}
                    band={bandFor(summary.health)}
                  />
                  <p className="text-muted-foreground">
                    <StatusLine band={bandFor(summary.health)}>
                      {summary.health >= 90
                        ? t.dashboard.healthStable
                        : summary.health >= 75
                          ? t.dashboard.healthMonitor
                          : t.dashboard.healthDegraded}
                    </StatusLine>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t.dashboard.workforceRisk}</CardTitle>
                <CardDescription>
                  {t.dashboard.workforceRiskDesc}
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
                      label={<RiskBadge risk={level} label={t.risk[level]} />}
                      value={(count / summary.operators) * 100}
                      display={t.dashboard.operatorCount(count)}
                      band={band}
                    />
                  )
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t.dashboard.highlights}</CardTitle>
                <CardDescription>
                  {t.dashboard.highlightsDesc}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="flex flex-col gap-3">
                  <KeyValue label={t.dashboard.topOperator}>
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
                  <KeyValue label={t.dashboard.bestStation}>
                    {summary.bestStation}
                  </KeyValue>
                  <KeyValue label={t.dashboard.bestDepartment}>
                    {summary.bestDepartment}
                  </KeyValue>
                  <KeyValue label={t.dashboard.avgRevenuePerOperator}>
                    {money(summary.revenue / summary.operators)} AZN
                  </KeyValue>
                  <KeyValue label={t.dashboard.highRiskOperators}>
                    {summary.riskCounts.HIGH === 0 ? (
                      <StatusLine band="good">{t.common.none}</StatusLine>
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
              <CardTitle>{t.dashboard.revenueThroughDay}</CardTitle>
              <CardDescription>{t.dashboard.hourlyRevenue}</CardDescription>
            </CardHeader>
            <CardContent>
              <HourlyRevenueChart data={hourlySeries} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t.dashboard.revenueByStation}</CardTitle>
                <CardDescription>{t.dashboard.totalPerStation}</CardDescription>
              </CardHeader>
              <CardContent>
                <RevenueRankChart data={stationRevenue} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t.dashboard.revenueByDepartment}</CardTitle>
                <CardDescription>{t.dashboard.totalPerDepartment}</CardDescription>
              </CardHeader>
              <CardContent>
                <RevenueRankChart data={departmentRevenue} />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>{t.dashboard.shiftCoverage}</CardTitle>
                <CardDescription>{t.dashboard.operatorsPerShift}</CardDescription>
              </CardHeader>
              <CardContent>
                <ShiftDonutChart data={shiftDistribution(reports)} />
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t.dashboard.top5}</CardTitle>
                <CardDescription>
                  {t.dashboard.top5Desc}
                </CardDescription>
                <CardAction>
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={<Link href="/leaderboard" />}
                  >
                    {t.dashboard.fullRanking}
                    <IconArrowRight data-icon="inline-end" />
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 pl-5">#</TableHead>
                      <TableHead>{t.common.operator}</TableHead>
                      <TableHead>{t.common.station}</TableHead>
                      <TableHead className="text-right">{t.common.revenue}</TableHead>
                      <TableHead className="text-right">{t.common.sales}</TableHead>
                      <TableHead className="text-right">AZN/h</TableHead>
                      <TableHead className="pr-5">{t.common.risk}</TableHead>
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
                          <RiskBadge risk={r.risk} label={t.risk[r.risk]} />
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
                <CardTitle>{t.dashboard.executiveBrief}</CardTitle>
                <CardDescription>
                  {t.dashboard.executiveBriefDesc}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 leading-relaxed text-muted-foreground">
                <p>
                  <Strong>
                    {t.dashboard.briefLine1(
                      money(summary.revenue),
                      summary.transactions
                    )}
                  </Strong>
                  {summary.hasTarget
                    ? t.dashboard.briefTargetPart(summary.targetPct)
                    : t.dashboard.briefNoTargetPart}
                </p>
                <p>
                  {t.dashboard.briefLine2(
                    summary.topOperator!.name,
                    money(summary.topOperator!.revenue),
                    summary.bestStation ?? "",
                    summary.bestDepartment ?? ""
                  )}
                </p>
                <p>
                  {t.dashboard.briefLine3(
                    money(summary.avgProductivity),
                    summary.avgAttendance
                  )}{" "}
                  {summary.alerts === 0
                    ? t.dashboard.briefNoAlerts
                    : t.dashboard.briefAlerts(summary.alerts)}
                </p>
                {summary.hasTarget ? (
                  <p>
                    <StatusLine band={bandFor(summary.targetPct, 100, 80)}>
                      {summary.targetPct >= 100
                        ? t.dashboard.targetExceededShort
                        : summary.targetPct >= 80
                          ? t.dashboard.targetNearlyShort
                          : t.dashboard.targetMissedShort}
                    </StatusLine>
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t.dashboard.recentAlerts}</CardTitle>
                <CardDescription>
                  {t.dashboard.recentAlertsDesc}
                </CardDescription>
                <CardAction>
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={<Link href="/alerts" />}
                  >
                    {t.dashboard.alertCenter}
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
                    <EmptyTitle>{t.dashboard.noAlerts}</EmptyTitle>
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

