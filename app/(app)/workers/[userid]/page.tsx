import Link from "next/link"
import { notFound } from "next/navigation"
import { IconArrowLeft, IconCalendarOff } from "@tabler/icons-react"

import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

import { DayPickerNav } from "@/components/day-picker-nav"
import { MiniStat } from "@/components/mini-stat"
import { PageShell } from "@/components/page-shell"
import { WorkerSalesTable } from "@/components/worker-sales-table"
import { WorkerTimeline } from "@/components/worker-timeline"
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
  getAvailableDates,
  getRosterWorker,
  getWorkerDay,
  getWorkerDaySales,
  type SearchParams,
} from "@/lib/data"
import { getSessionUser, stationScopeFor } from "@/lib/auth"
import { stationId } from "@/lib/firebase/schema"
import { money, money2 } from "@/lib/format"
import { getT } from "@/lib/i18n/server"
import { ALERT_LABEL_KEY, CHECK_TYPE_IN, type ObviousAlertId } from "@/lib/pos"
import { STATIONS } from "@/lib/testdata"
import { cn } from "@/lib/utils"

export const metadata = { title: "Worker" }

const hm = (at: number) => {
  const d = new Date(at)
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`
}

/**
 * One worker, one day: the presence band and the sales lollipops on one
 * shared axis, then the same facts as lists — every tap, every sale, and
 * the alerts those two lists prove.
 */
export default async function WorkerDayPage(props: {
  params: Promise<{ userid: string }>
  searchParams: Promise<SearchParams>
}) {
  const { userid } = await props.params
  const params = await props.searchParams
  const t = await getT()

  const user = await getSessionUser()
  if (!user) notFound()

  const dates = await getAvailableDates()
  const requested = typeof params.date === "string" ? params.date : undefined
  const date =
    requested && dates.includes(requested) ? requested : dates.at(-1)
  if (!date) notFound()

  // The station travels in the URL (the list knows it); a pinned account's
  // own scope stands in when it is absent — and overrules it when it lies.
  const slug =
    typeof params.st === "string"
      ? params.st
      : stationScopeFor(user)
        ? stationId(stationScopeFor(user)!)
        : null
  const station = STATIONS.find((s) => stationId(s.name) === slug)?.name
  if (!station) notFound()

  const day = await getWorkerDay(station, userid, date)

  // No worker-day document = the worker was ABSENT that day. That is a fact
  // worth showing, not a missing page — 404 stays reserved for a worker or
  // station that genuinely does not exist (or is outside the caller's scope).
  if (!day) {
    const roster = await getRosterWorker(station, userid)
    if (!roster) notFound()

    return (
      <PageShell
        title={roster.adSoyad}
        description={`${roster.kartNo} · ${station}`}
        actions={
          <span className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href="/workers" />}
            >
              <IconArrowLeft className="size-4" />
              {t.workers.backToWorkers}
            </Button>
            <DayPickerNav
              date={date}
              available={dates}
              hrefBase={`/workers/${userid}?st=${slug}&date=`}
            />
          </span>
        }
      >
        <Card>
          <CardContent>
            <Empty className="py-12">
              <EmptyMedia variant="icon">
                <IconCalendarOff />
              </EmptyMedia>
              <EmptyTitle>{t.workers.absentTitle}</EmptyTitle>
              <EmptyDescription>{t.workers.absentDesc}</EmptyDescription>
            </Empty>
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  // The raw rows behind the aggregates — read from THE sales table by the
  // same join the report was computed with (kart_no + operational day).
  const sales = await getWorkerDaySales(station, day.kartNo, date)

  const alertName = (type: string) =>
    t.alerts.types[
      ALERT_LABEL_KEY[type as ObviousAlertId] as keyof typeof t.alerts.types
    ] ?? type

  return (
    <PageShell
      title={day.adSoyad}
      description={`${day.kartNo} · ${station} · ${t.shifts[day.shift]}`}
      actions={
        <span className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/workers" />}
          >
            <IconArrowLeft className="size-4" />
            {t.workers.backToWorkers}
          </Button>
          <DayPickerNav
            date={date}
            available={dates}
            hrefBase={`/workers/${userid}?st=${slug}&date=`}
          />
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <MiniStat
          label={t.workers.colInOut}
          value={
            <span className="whitespace-nowrap">
              {day.checkIn !== null ? hm(day.checkIn) : "—"}
              <span className="px-1 text-muted-foreground">→</span>
              {day.checkOut !== null ? hm(day.checkOut) : "—"}
            </span>
          }
        />
        <MiniStat
          label={t.workers.colHours}
          value={day.workedHours !== null ? day.workedHours.toFixed(1) : "—"}
        />
        <MiniStat label={t.workers.colSales} value={day.salesCount} />
        <MiniStat
          label={t.workers.colLitres}
          value={money(day.litres)}
          unit="L"
        />
      </div>

      {/* The two connected graphs. */}
      <Card>
        <CardHeader>
          <CardTitle>{t.workers.timeline}</CardTitle>
          <CardDescription>{t.workers.timelineDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <WorkerTimeline
            day={day}
            sales={sales}
            labels={{
              presence: t.workers.presence,
              sales: t.workers.colSales,
              missing: t.workers.offClock,
            }}
          />
        </CardContent>
      </Card>

      {day.alerts.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t.nav.alerts}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {day.alerts.map((alert, i) => (
              <span
                key={`${alert.type}-${alert.at}-${i}`}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2.5 py-1 text-sm",
                  alert.severity === "high" &&
                    "bg-red-500/15 text-red-700 dark:text-red-300",
                  alert.severity === "medium" &&
                    "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                  alert.severity === "low" && "bg-muted text-muted-foreground"
                )}
              >
                <span className="font-mono text-xs tabular-nums">
                  {hm(alert.at)}
                </span>
                {alertName(alert.type)}
                {alert.amount !== undefined ? (
                  <span className="font-mono text-xs tabular-nums">
                    {money2(alert.amount)} ₼
                  </span>
                ) : null}
              </span>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>{t.workers.salesTitle}</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <WorkerSalesTable sales={sales} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.workers.tapsTitle}</CardTitle>
            <CardDescription>{t.workers.tapsDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            {day.taps.length === 0 ? (
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                {t.workers.noTaps}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {day.taps.map((tap, i) => (
                  <li
                    key={`${tap.at}-${i}`}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="font-mono tabular-nums">{hm(tap.at)}</span>
                    <Badge
                      variant="outline"
                      className={
                        tap.type === CHECK_TYPE_IN
                          ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                          : "border-sky-500/40 text-sky-700 dark:text-sky-300"
                      }
                    >
                      {tap.type === CHECK_TYPE_IN
                        ? t.workers.tapIn
                        : t.workers.tapOut}
                    </Badge>
                    <span className="font-mono text-xs text-muted-foreground">
                      check_type={tap.type}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}
