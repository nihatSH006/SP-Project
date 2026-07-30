import Link from "next/link"
import {
  IconBuildingStore,
  IconCoin,
  IconGasStation,
  IconGauge,
  IconHeartbeat,
} from "@tabler/icons-react"

import { RevenueRankChart } from "@/components/charts"
import { Meter } from "@/components/meter"
import { PageShell } from "@/components/page-shell"
import { StatTile } from "@/components/stat-tile"
import { NoMatches, StatusLine } from "@/components/status"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { groupRevenue, stationReports, summarise } from "@/lib/analytics"
import { getSlice, type SearchParams } from "@/lib/data"
import { getT } from "@/lib/i18n/server"
import { bandFor, money } from "@/lib/format"

export const metadata = { title: "Stations" }

export default async function StationsPage(props: {
  searchParams: Promise<SearchParams>
}) {
  const t = await getT()
  const { reports, options, target } = await getSlice(await props.searchParams)
  const stations = stationReports(reports)
  const summary = summarise(reports, target)

  const avgHealth =
    stations.length > 0
      ? Math.round(
          (stations.reduce((sum, s) => sum + s.health, 0) / stations.length) *
            10
        ) / 10
      : 100

  return (
    <PageShell
      options={options}
      title={t.stations.title}
      description={t.stations.description}
    >
      {stations.length === 0 ? (
        <NoMatches
          title={t.errors.noMatch(t.common.stations.toLowerCase())}
          description={t.errors.noMatchDesc(t.common.stations.toLowerCase())}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatTile
              label={t.common.stations}
              value={stations.length}
              icon={IconBuildingStore}
              caption={t.stations.inSlice}
            />
            <StatTile
              label={t.stations.regionalRevenue}
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
              caption={t.stations.perOperatorHour}
            />
            <StatTile
              label={t.stations.avgHealth}
              value={avgHealth}
              unit="%"
              icon={IconHeartbeat}
              caption={
                <StatusLine band={bandFor(avgHealth)}>
                  {avgHealth >= 90
                    ? t.stations.stable
                    : avgHealth >= 75
                      ? t.stations.monitor
                      : t.stations.intervention}
                </StatusLine>
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t.dashboard.revenueByStation}</CardTitle>
                <CardDescription>{t.dashboard.totalPerStation}</CardDescription>
              </CardHeader>
              <CardContent>
                <RevenueRankChart
                  data={groupRevenue(reports, "station")}
                  className="aspect-auto h-72 w-full"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t.stations.bestStation}</CardTitle>
                <CardDescription>
                  {t.stations.bestStationDesc}
                </CardDescription>
                <CardAction>
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={
                      <Link
                        href={`/operators?station=${encodeURIComponent(stations[0].name)}`}
                      />
                    }
                  >
                    {t.stations.viewOperators}
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="btn-3d flex size-11 items-center justify-center rounded-2xl border">
                    <IconGasStation className="size-5" />
                  </span>
                  <div className="flex flex-col">
                    <span className="text-base font-semibold">
                      {stations[0].name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t.stations.onDutyCount(stations[0].employees)}
                    </span>
                  </div>
                </div>
                <dl className="flex flex-col gap-2.5">
                  <Row label={t.common.revenue}>{money(stations[0].revenue)} AZN</Row>
                  <Row label={t.common.transactions}>{stations[0].transactions}</Row>
                  <Row label={t.dashboard.avgProductivity}>
                    {money(stations[0].productivity)} AZN/h
                  </Row>
                  <Row label={t.operators.avgAttendance}>{stations[0].attendance}%</Row>
                </dl>
                <Meter
                  label={
                    <span className="font-medium text-foreground">{t.common.health}</span>
                  }
                  value={stations[0].health}
                  display={`${stations[0].health}%`}
                  band={bandFor(stations[0].health)}
                />
              </CardContent>
            </Card>
          </div>

          {/* ------------------------------------ per-station cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {stations.map((station) => (
              <Card key={station.name} size="sm">
                <CardHeader>
                  <CardTitle className="text-base">{station.name}</CardTitle>
                  <CardDescription>
                    {t.stations.operatorsTransactions(station.employees, station.transactions)}
                  </CardDescription>
                  <CardAction>
                    {station.alerts === 0 ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      >
                        {t.stations.alertsCount(0)}
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        {t.stations.alertsCount(station.alerts)}
                      </Badge>
                    )}
                  </CardAction>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <dl className="flex flex-col gap-2">
                    <Row label={t.common.revenue}>{money(station.revenue)} AZN</Row>
                    <Row label={t.common.productivity}>
                      {money(station.productivity)} AZN/h
                    </Row>
                    <Row label={t.common.attendance}>{station.attendance}%</Row>
                  </dl>
                  <Meter
                    label={
                      <span className="font-medium text-foreground">
                        Health
                      </span>
                    }
                    value={station.health}
                    display={`${station.health}%`}
                    band={bandFor(station.health)}
                  />
                  <StatusLine band={bandFor(station.health)}>
                    {station.health >= 90
                      ? t.stations.stableShort
                      : station.health >= 75
                        ? t.stations.monitorShort
                        : t.stations.reviewShort}
                  </StatusLine>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ------------------------------------ comparison table */}
          <Card>
            <CardHeader>
              <CardTitle>{t.stations.comparison}</CardTitle>
              <CardDescription>{t.stations.comparisonDesc}</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-5">{t.common.station}</TableHead>
                      <TableHead className="text-right">{t.common.operators}</TableHead>
                      <TableHead className="text-right">
                        {t.operators.revenueAzn}
                      </TableHead>
                      <TableHead className="text-right">{t.common.transactions}</TableHead>
                      <TableHead className="text-right">AZN/h</TableHead>
                      <TableHead className="text-right">{t.common.attendance}</TableHead>
                      <TableHead className="text-right">{t.nav.alerts}</TableHead>
                      <TableHead className="w-44 pr-5">{t.common.health}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stations.map((station) => (
                      <TableRow key={station.name}>
                        <TableCell className="pl-5 font-medium">
                          {station.name}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {station.employees}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {money(station.revenue)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {station.transactions}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {money(station.productivity)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {station.attendance}%
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {station.alerts}
                        </TableCell>
                        <TableCell className="pr-5">
                          <Meter
                            value={station.health}
                            display={`${station.health}%`}
                            band={bandFor(station.health)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </PageShell>
  )
}

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium tabular-nums">{children}</dd>
    </div>
  )
}
