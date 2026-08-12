import {
  IconCalendarEvent,
  IconCircleCheck,
  IconFlag,
  IconGasStation,
  IconUsers,
} from "@tabler/icons-react"

import { AlertsTable, type AlertRow } from "@/components/alerts-table"
import { LiveFeedSwitch } from "@/components/live-feed-switch"
import { MiniStat } from "@/components/mini-stat"
import { PageShell } from "@/components/page-shell"
import { PeriodPicker } from "@/components/period-picker"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { getPeriodSlice, type SearchParams } from "@/lib/data"
import { getSessionUser, stationScopeFor } from "@/lib/auth"
import { stationId } from "@/lib/firebase/schema"
import { money } from "@/lib/format"
import { getT } from "@/lib/i18n/server"
import { getFeedEnabled } from "@/lib/live-feed"

export const metadata = { title: "Alerts" }

/**
 * The alert center — only what the two source tables can PROVE.
 *
 * Every row is a database fact: a tap that is missing, a sale outside the
 * tapped window, a fob that sold with no presence at all. No statistics,
 * no scores — an official reading this page can walk to the raw tables
 * and find every line.
 */
export default async function AlertsPage(props: {
  searchParams: Promise<SearchParams>
}) {
  const t = await getT()
  const params = await props.searchParams

  const { reports, options, period, availableDates } =
    await getPeriodSlice(params)
  const user = await getSessionUser()
  const multiStation = user ? stationScopeFor(user) === null : false
  const feedEnabled = await getFeedEnabled()

  const rows: AlertRow[] = [
    ...reports.flatMap((r) =>
      r.alerts.map((alert) => ({
        at: alert.at,
        date: r.date,
        type: alert.type,
        severity: alert.severity,
        worker: r.adSoyad,
        kartNo: r.kartNo,
        station: r.station,
        amount: alert.amount ?? null,
        href: `/workers/${r.userid}?date=${r.date}&st=${stationId(r.station)}`,
      }))
    ),
  ].sort((a, b) => b.at - a.at)

  const workersAffected = new Set(
    rows.filter((r) => r.worker).map((r) => `${r.station}|${r.worker}`)
  ).size
  const amountInvolved = rows.reduce((sum, r) => sum + (r.amount ?? 0), 0)

  const perDay = new Map<string, number>()
  for (const row of rows) {
    perDay.set(row.date, (perDay.get(row.date) ?? 0) + 1)
  }
  const worst = [...perDay.entries()].sort((a, b) => b[1] - a[1])[0]

  return (
    <PageShell
      options={options}
      title={t.alerts.title}
      description={t.alerts.description}
      actions={
        <span className="flex flex-wrap items-center gap-2">
          <LiveFeedSwitch
            initialEnabled={feedEnabled}
            labels={{
              label: t.alerts.liveFeed,
              log: t.alerts.liveFeedLog,
              empty: t.alerts.liveFeedEmpty,
              quiet: t.alerts.liveFeedQuiet,
              sales: t.alerts.liveFeedSales,
              taps: t.alerts.liveFeedTaps,
              error: t.alerts.liveFeedError,
            }}
          />
          {availableDates.length > 0 ? (
            <PeriodPicker
              from={period.from}
              to={period.to}
              available={availableDates}
            />
          ) : null}
        </span>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat
          icon={IconFlag}
          label={t.alerts.totalFlagged}
          value={rows.length}
        />
        <MiniStat
          icon={IconUsers}
          label={t.alerts.workersAffected}
          value={workersAffected}
        />
        <MiniStat
          icon={IconGasStation}
          label={t.alerts.amountInvolved}
          value={money(amountInvolved)}
          unit="₼"
        />
        <MiniStat
          icon={IconCalendarEvent}
          label={t.alerts.worstDay}
          value={worst ? `${worst[0].slice(5)} · ${worst[1]}` : "—"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.alerts.incidentLog}</CardTitle>
          <CardDescription>{t.alerts.incidentLogDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <Empty className="py-10">
              <EmptyMedia variant="icon">
                <IconCircleCheck className="text-emerald-600 dark:text-emerald-400" />
              </EmptyMedia>
              <EmptyTitle>{t.alerts.noneDetected}</EmptyTitle>
              <EmptyDescription>{t.alerts.noneDetectedDesc}</EmptyDescription>
            </Empty>
          ) : (
            <AlertsTable
              rows={rows}
              weekdays={t.common.weekdays}
              showStation={multiStation}
            />
          )}
        </CardContent>
      </Card>
    </PageShell>
  )
}
