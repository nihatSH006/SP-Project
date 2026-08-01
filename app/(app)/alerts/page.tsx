import {
  IconCalendarEvent,
  IconCircleCheck,
  IconFlag,
  IconUsers,
} from "@tabler/icons-react"

import { AlertsTable, type AlertRow } from "@/components/alerts-table"
import { MiniStat } from "@/components/mini-stat"
import { PageShell } from "@/components/page-shell"
import { PeriodPicker } from "@/components/period-picker"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { collectAlerts } from "@/lib/analytics"
import { canCompareStations } from "@/lib/auth"
import { getPeriodSlice, type SearchParams } from "@/lib/data"
import { getT } from "@/lib/i18n/server"

export const metadata = { title: "Alerts" }

/**
 * Every flagged sale in a chosen period.
 *
 * This page used to show one day, split across four stat tiles, an incident
 * log, a procedure checklist and three priority tabs — the same alerts three
 * times over, and none of those views answered "what happened, and when". It
 * is now three numbers and one searchable table; the review queue lives on the
 * Cases page rather than in both.
 */
export default async function AlertsPage(props: {
  searchParams: Promise<SearchParams>
}) {
  const t = await getT()
  const params = await props.searchParams

  const { reports, options, period, availableDates } =
    await getPeriodSlice(params)
  const alerts = collectAlerts(reports)
  const multiStation = await canCompareStations()

  const rows: AlertRow[] = alerts.map((a) => ({
    operatorId: a.operatorId,
    operator: a.operator,
    station: a.station,
    at: a.time.getTime(),
    amount: a.amount,
    reason: t.alerts.outsideHours,
  }))

  // Which day carried the most — the one fact a period adds that a single day
  // cannot show.
  const perDay = new Map<string, number>()
  for (const r of reports) {
    if (r.suspicious > 0) {
      perDay.set(r.date, (perDay.get(r.date) ?? 0) + r.suspicious)
    }
  }
  const worst = [...perDay.entries()].sort((a, b) => b[1] - a[1])[0]

  return (
    <PageShell
      options={options}
      title={t.alerts.title}
      description={t.alerts.description}
      actions={
        availableDates.length > 0 ? (
          <PeriodPicker
            from={period.from}
            to={period.to}
            available={availableDates}
          />
        ) : null
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MiniStat
          icon={IconFlag}
          label={t.alerts.totalFlagged}
          value={alerts.length}
        />
        <MiniStat
          icon={IconUsers}
          label={t.alerts.operatorsAffected}
          value={new Set(alerts.map((a) => a.operatorId)).size}
        />
        <MiniStat
          icon={IconCalendarEvent}
          label={t.alerts.worstDay}
          value={worst ? `${worst[0]} · ${worst[1]}` : "—"}
        />
      </div>

      {/* The review queue lives on the Cases page. Repeating it here meant
          two places to check and two places to keep in step. */}
      <Card>
        <CardHeader>
          <CardTitle>{t.alerts.incidentLog}</CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
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
              weekdays={t.staffing.weekdays}
              showStation={multiStation}
            />
          )}
        </CardContent>
      </Card>
    </PageShell>
  )
}
