import {
  IconBuildingStore,
  IconCoin,
  IconGauge,
  IconHeartbeat,
} from "@tabler/icons-react"

import { RevenueColumnChart } from "@/components/charts"
import { Meter } from "@/components/meter"
import { PageShell } from "@/components/page-shell"
import { PeriodPicker } from "@/components/period-picker"
import { MiniStat } from "@/components/mini-stat"
import { NoMatches, StatusLine } from "@/components/status"
import { Badge } from "@/components/ui/badge"
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
import { getPeriodSlice, type SearchParams } from "@/lib/data"
import { getT } from "@/lib/i18n/server"
import { bandFor, money } from "@/lib/format"

export const metadata = { title: "Stations" }

export default async function StationsPage(props: {
  searchParams: Promise<SearchParams>
}) {
  const t = await getT()
  const { reports, options, target, period, availableDates, days } =
    await getPeriodSlice(await props.searchParams)
  // `days` matters: without it a month of data reports 224 staff at a station
  // and 0% health everywhere.
  const stations = stationReports(reports, days)
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
      actions={
        // Picking the same date on both sides gives a single day, which is why
        // there is no separate single-day mode.
        availableDates.length > 0 ? (
          <PeriodPicker
            from={period.from}
            to={period.to}
            available={availableDates}
          />
        ) : null
      }
    >
      {stations.length === 0 ? (
        <NoMatches
          title={t.errors.noMatch(t.common.stations.toLowerCase())}
          description={t.errors.noMatchDesc(t.common.stations.toLowerCase())}
        />
      ) : (
        <>
          {/* Same tile as the overview and operators pages: one blue glyph,
              a label and a big number. The captions are gone with the old
              StatTile — "in the current slice" under a station count, and
              "per operator working hour" under a figure already labelled
              per-hour, were restating their own labels. */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <MiniStat
              icon={IconBuildingStore}
              label={t.common.stations}
              value={stations.length}
            />
            <MiniStat
              icon={IconCoin}
              label={t.stations.regionalRevenue}
              value={money(summary.revenue)}
              unit="₼"
            />
            <MiniStat
              icon={IconGauge}
              label={t.dashboard.avgProductivity}
              value={money(summary.avgProductivity)}
              unit="₼/h"
            />
            <MiniStat
              icon={IconHeartbeat}
              label={t.stations.avgHealth}
              value={avgHealth}
              unit="%"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t.dashboard.revenueByStation}</CardTitle>
            </CardHeader>
            <CardContent>
              <RevenueColumnChart data={groupRevenue(reports, "station")} />
            </CardContent>
          </Card>

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
