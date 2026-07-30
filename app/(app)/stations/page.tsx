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
import { bandFor, money } from "@/lib/format"

export const metadata = { title: "Stations" }

export default async function StationsPage(props: {
  searchParams: Promise<SearchParams>
}) {
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
      title="Station performance"
      description="Regional view — revenue, workforce and operational health per station."
    >
      {stations.length === 0 ? (
        <NoMatches subject="stations" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatTile
              label="Stations"
              value={stations.length}
              icon={IconBuildingStore}
              caption="in the current slice"
            />
            <StatTile
              label="Regional revenue"
              value={money(summary.revenue)}
              unit="AZN"
              icon={IconCoin}
              caption={`${summary.transactions} transactions`}
            />
            <StatTile
              label="Avg productivity"
              value={money(summary.avgProductivity)}
              unit="AZN/h"
              icon={IconGauge}
              caption="per operator working hour"
            />
            <StatTile
              label="Avg station health"
              value={avgHealth}
              unit="%"
              icon={IconHeartbeat}
              caption={
                <StatusLine band={bandFor(avgHealth)}>
                  {avgHealth >= 90
                    ? "stable"
                    : avgHealth >= 75
                      ? "monitor"
                      : "intervention advised"}
                </StatusLine>
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by station</CardTitle>
                <CardDescription>Total AZN per station</CardDescription>
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
                <CardTitle>Best performing station</CardTitle>
                <CardDescription>
                  Highest revenue in the current slice
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
                    View operators
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
                      {stations[0].employees} operator
                      {stations[0].employees === 1 ? "" : "s"} on duty
                    </span>
                  </div>
                </div>
                <dl className="flex flex-col gap-2.5">
                  <Row label="Revenue">{money(stations[0].revenue)} AZN</Row>
                  <Row label="Transactions">{stations[0].transactions}</Row>
                  <Row label="Avg productivity">
                    {money(stations[0].productivity)} AZN/h
                  </Row>
                  <Row label="Avg attendance">{stations[0].attendance}%</Row>
                </dl>
                <Meter
                  label={
                    <span className="font-medium text-foreground">Health</span>
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
                    {station.employees} operator
                    {station.employees === 1 ? "" : "s"} ·{" "}
                    {station.transactions} transactions
                  </CardDescription>
                  <CardAction>
                    {station.alerts === 0 ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      >
                        0 alerts
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        {station.alerts} alert
                        {station.alerts === 1 ? "" : "s"}
                      </Badge>
                    )}
                  </CardAction>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <dl className="flex flex-col gap-2">
                    <Row label="Revenue">{money(station.revenue)} AZN</Row>
                    <Row label="Productivity">
                      {money(station.productivity)} AZN/h
                    </Row>
                    <Row label="Attendance">{station.attendance}%</Row>
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
                      ? "Stable"
                      : station.health >= 75
                        ? "Monitor"
                        : "Review recommended"}
                  </StatusLine>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ------------------------------------ comparison table */}
          <Card>
            <CardHeader>
              <CardTitle>Station comparison</CardTitle>
              <CardDescription>Full metrics per station</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-5">Station</TableHead>
                      <TableHead className="text-right">Operators</TableHead>
                      <TableHead className="text-right">
                        Revenue (AZN)
                      </TableHead>
                      <TableHead className="text-right">Transactions</TableHead>
                      <TableHead className="text-right">AZN/h</TableHead>
                      <TableHead className="text-right">Attendance</TableHead>
                      <TableHead className="text-right">Alerts</TableHead>
                      <TableHead className="w-44 pr-5">Health</TableHead>
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
