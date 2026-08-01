import Link from "next/link"
import { notFound } from "next/navigation"
import {
  IconArrowLeft,
  IconClockHour4,
  IconCoin,
  IconReceipt,
  IconTargetArrow,
} from "@tabler/icons-react"

import { HourlyRevenueChart } from "@/components/charts"
import { Meter } from "@/components/meter"
import { MiniStat } from "@/components/mini-stat"
import { PageShell } from "@/components/page-shell"
import { RiskBadge } from "@/components/risk-badge"
import { StatusLine } from "@/components/status"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SCHEDULED_HOURS, toChartSeries } from "@/lib/analytics"
import { canCompareStations } from "@/lib/auth"
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

/**
 * One operator's day.
 *
 * The page used to carry six KPI tiles each with a caption, then an
 * "Assessment" card that repeated two of those figures as meters underneath
 * three paragraphs of generated prose, then the flagged sales as a stack of
 * cards. Between them the same facts appeared three times, and the reader
 * still had to hunt for the comparison that actually decides anything: is this
 * person ahead of or behind everyone else on shift.
 *
 * So: four figures, that comparison as a table, and the verdict as one line
 * beside the name instead of three paragraphs in a card of its own. Nothing
 * was dropped that the page did not already say somewhere else.
 */
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

  const multiStation = await canCompareStations()

  // "Everyone else", not "everyone": including this operator in the average
  // they are being measured against drags the bar toward them, most visibly at
  // a small station where one person is a large share of the mean.
  const peers = reports.filter((r) => r.id !== report.id)
  const avg = (pick: (r: (typeof reports)[number]) => number) =>
    peers.length ? peers.reduce((s, r) => s + pick(r), 0) / peers.length : null

  const comparisons = [
    {
      label: t.common.revenue,
      value: report.revenue,
      average: avg((r) => r.revenue),
      format: (n: number) => `${money(n)} ₼`,
    },
    {
      label: t.common.productivity,
      value: report.productivity,
      average: avg((r) => r.productivity),
      format: (n: number) => `${money(n)} ₼/h`,
    },
    {
      label: t.common.attendance,
      value: report.attendanceScore,
      average: avg((r) => r.attendanceScore),
      format: (n: number) => `${n.toFixed(1)}%`,
    },
  ]

  const assessment =
    report.score >= 90
      ? { band: "good" as const, verdict: t.operatorDetail.topTier }
      : report.score >= 75
        ? { band: "good" as const, verdict: t.operatorDetail.performingWell }
        : { band: "warn" as const, verdict: t.operatorDetail.needsAttention }

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
      {/* ---------------------------------------------------------- who */}
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
              {/* Every operator a station manager can open is at their own
                  station, so the badge is a constant. */}
              {multiStation ? (
                <Badge variant="secondary">{report.station}</Badge>
              ) : null}
              <Badge variant="outline">
                {t.shifts[report.shift]} · {window}
              </Badge>
              <RiskBadge risk={report.risk} label={t.risk[report.risk]} />
            </div>
          </div>
          {/* The verdict reads beside the name rather than as a card of prose
              three sections down the page. */}
          <StatusLine band={assessment.band}>{assessment.verdict}</StatusLine>
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

      {/* ------------------------------------------------ the four figures */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat
          icon={IconCoin}
          label={t.common.revenue}
          value={money(report.revenue)}
          unit="₼"
        />
        <MiniStat
          icon={IconReceipt}
          label={t.common.transactions}
          value={report.salesCount}
        />
        <MiniStat
          icon={IconTargetArrow}
          label={t.operatorDetail.performanceScore}
          value={report.score}
          unit="/100"
        />
        <MiniStat
          icon={IconClockHour4}
          label={t.operatorDetail.workingHours}
          value={report.workingHours}
          unit={`/ ${SCHEDULED_HOURS} h`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t.operatorDetail.revenueThroughShift}</CardTitle>
          </CardHeader>
          <CardContent>
            <HourlyRevenueChart data={toChartSeries(report.hourly)} />
          </CardContent>
        </Card>

        {/* ----------------------------- ahead of, or behind, everyone else */}
        <Card>
          <CardHeader>
            <CardTitle>{t.operatorDetail.comparison}</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">
                    {t.operatorDetail.colMeasure}
                  </TableHead>
                  <TableHead className="text-right">
                    {t.operatorDetail.colThisOperator}
                  </TableHead>
                  <TableHead className="pr-5 text-right">
                    {t.operatorDetail.colFleetAverage}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisons.map((row) => {
                  // Colour carries the comparison; a repeated "above"/"below"
                  // word down the column would say the same thing twice.
                  const ahead = row.average !== null && row.value >= row.average
                  return (
                    <TableRow key={row.label}>
                      <TableCell className="pl-5">{row.label}</TableCell>
                      <TableCell
                        className={`text-right font-mono font-medium tabular-nums ${
                          row.average === null
                            ? ""
                            : ahead
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {row.format(row.value)}
                      </TableCell>
                      <TableCell className="pr-5 text-right font-mono text-muted-foreground tabular-nums">
                        {row.average === null ? "—" : row.format(row.average)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

            <div className="flex flex-col gap-4 px-5 pt-5">
              <Meter
                label={
                  <span className="font-medium">
                    {t.operatorDetail.performanceScore}
                  </span>
                }
                value={report.score}
                display={`${report.score}/100`}
                band={bandFor(report.score, 90, 75)}
              />
              {report.risk === "HIGH" ? (
                <StatusLine band="crit">
                  {t.operatorDetail.riskHigh(report.suspicious)}
                </StatusLine>
              ) : report.risk === "MEDIUM" ? (
                <StatusLine band="warn">{t.operatorDetail.riskMedium}</StatusLine>
              ) : (
                <StatusLine band="good">{t.operatorDetail.riskLow}</StatusLine>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --------------------------------------- flagged sales, as a table */}
      {report.alerts.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t.operatorDetail.flagged}</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">{t.alerts.colWhen}</TableHead>
                  <TableHead className="text-right">
                    {t.alerts.colAmount}
                  </TableHead>
                  <TableHead className="pr-5">{t.alerts.colWhy}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.alerts.map((alert, index) => (
                  <TableRow key={`${alert.time.getTime()}-${index}`}>
                    <TableCell className="pl-5 font-mono whitespace-nowrap tabular-nums">
                      {dayAndTime(alert.time)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium tabular-nums">
                      {money2(alert.amount)} ₼
                    </TableCell>
                    <TableCell className="pr-5 text-muted-foreground">
                      {t.alerts.outsideHours}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </PageShell>
  )
}
