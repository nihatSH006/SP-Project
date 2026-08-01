import { IconAlertTriangle, IconShieldCheck } from "@tabler/icons-react"

import { PageShell } from "@/components/page-shell"
import { PeriodPicker } from "@/components/period-picker"
import { PrintButton } from "@/components/print-button"
import { SocarLogo } from "@/components/socar-logo"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { canCompareStations } from "@/lib/auth"
import { getBoardPack } from "@/lib/board-pack"
import { fullTimestamp, money } from "@/lib/format"
import { getT } from "@/lib/i18n/server"

export const metadata = { title: "Board pack" }

/**
 * The monthly pack.
 *
 * The screen keeps its tiles; the PRINTED sheet turns them into tables. On a
 * page you can scan, a tile is quicker to read — but on paper a row of tiles
 * becomes floating numbers with nothing to line up against, and paper is what
 * this page exists for. The pairs below are marked `print:hidden` and
 * `hidden print:block` so each medium gets the shape that suits it.
 */
export default async function BoardPackPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await props.searchParams
  const one = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v

  const t = await getT()
  const pack = await getBoardPack(one(params.from), one(params.to))
  const multiStation = await canCompareStations()

  if (!pack) {
    return (
      <PageShell title={t.boardPack.title} description={t.boardPack.description}>
        <p className="text-muted-foreground">{t.staffing.noData}</p>
      </PageShell>
    )
  }

  const stat = (label: string, value: string) => (
    <div className="rounded-xl border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-mono text-xl">{value}</div>
    </div>
  )

  /** Rows shared by the printed summary table. */
  const summaryRows: [string, string][] = [
    [t.boardPack.revenue, `${money(pack.revenue)} ₼`],
    ...(pack.target
      ? ([[t.overview.target, `${money(pack.target)} ₼`]] as [string, string][])
      : []),
    [t.boardPack.transactions, pack.transactions.toLocaleString("en-US")],
    [t.boardPack.operators, String(pack.operators)],
  ]

  const caseRows: [string, number][] = [
    [t.cases.statusOpen, pack.cases.open],
    [t.cases.statusInvestigating, pack.cases.investigating],
    [t.cases.statusConfirmed, pack.cases.confirmed],
    [t.cases.statusExplained, pack.cases.explained],
    [t.cases.statusDismissed, pack.cases.dismissed],
  ]

  return (
    <PageShell
      title={t.boardPack.title}
      description={t.boardPack.description}
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <PeriodPicker
            from={pack.fromDate}
            to={pack.toDate}
            available={pack.availableDates}
          />
          <PrintButton />
        </div>
      }
    >
      <div className="flex flex-col gap-6 print:gap-5">
        {/* Letterhead — printed sheets only. On screen the app already says
            whose system this is; on paper, once it leaves the building, the
            mark and the date are the only provenance it carries. */}
        <div className="hidden print:block">
          {/* The wordmark is `currentColor`, so this same asset prints black
              and renders white on the dark screen. */}
          <SocarLogo className="mb-3 h-10 text-black" />
          <div className="text-xl font-semibold">
            {t.boardPack.title} · {pack.fromDate} → {pack.toDate} ·{" "}
            {pack.scope || t.boardPack.scopeNetwork}
          </div>
        </div>

        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle className="print:hidden">
              {pack.fromDate} → {pack.toDate} ·{" "}
              {pack.scope || t.boardPack.scopeNetwork}
            </CardTitle>
            <CardDescription>
              {t.boardPack.period}: {pack.fromDate} → {pack.toDate} ·{" "}
              {t.boardPack.generatedOn(fullTimestamp(new Date(pack.generatedAt)))}
              {/* An incomplete month is stated with the period rather than in a
                  section of its own. It still has to be said — 28 days
                  presented as a whole month reads as a bad month. */}
              {!pack.dataHealth.complete ? (
                <>
                  {" · "}
                  <span className="font-medium text-amber-500 print:text-black">
                    {t.boardPack.daysCovered(
                      pack.dataHealth.daysCovered,
                      pack.dataHealth.daysExpected
                    )}
                  </span>
                </>
              ) : null}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div
              // Carries the plain figure so tooling can read it whatever the
              // currency mark or markup becomes.
              data-metric="pack-revenue"
              data-value={pack.revenue}
              className="grid grid-cols-1 gap-3 md:grid-cols-3 print:hidden"
            >
              {stat(t.boardPack.revenue, `${money(pack.revenue)} ₼`)}
              {stat(
                t.boardPack.transactions,
                pack.transactions.toLocaleString("en-US")
              )}
              {stat(t.boardPack.operators, String(pack.operators))}
            </div>

            <div className="hidden print:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.boardPack.colMetric}</TableHead>
                    <TableHead className="text-right">
                      {t.boardPack.colValue}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaryRows.map(([label, value]) => (
                    <TableRow key={label}>
                      <TableCell>{label}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {value}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* One row per site. A station manager sees only their own, so the
            comparison has nothing to compare. */}
        {multiStation ? (
          <Card className="break-inside-avoid">
            <CardHeader>
              <CardTitle>{t.boardPack.perStation}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.boardPack.station}</TableHead>
                    <TableHead className="text-right">
                      {t.boardPack.revenue}
                    </TableHead>
                    <TableHead className="text-right">{t.boardPack.days}</TableHead>
                    <TableHead className="text-right">
                      {t.boardPack.dailyAverage}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pack.stations.map((s) => (
                    <TableRow key={s.station}>
                      <TableCell className="capitalize">
                        {s.station.replace(/-/g, " ")}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {money(s.revenue)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {s.days}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {money(s.dailyAverage)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}

        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconShieldCheck className="size-5" />
              {t.boardPack.integrity}
            </CardTitle>
            <CardDescription className="print:hidden">{t.boardPack.integrityDesc}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5 print:hidden">
              {caseRows.map(([label, count]) => (
                <div key={label}>{stat(label, String(count))}</div>
              ))}
            </div>

            <div className="hidden print:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.boardPack.colStatus}</TableHead>
                    <TableHead className="text-right">
                      {t.boardPack.colCases}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {caseRows.map(([label, count]) => (
                    <TableRow key={label}>
                      <TableCell>{label}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {count}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">
                {t.boardPack.outstanding}
              </p>
              {pack.cases.outstanding.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t.boardPack.noOutstanding}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.boardPack.colOperator}</TableHead>
                      <TableHead>{t.boardPack.station}</TableHead>
                      <TableHead className="text-right">
                        {t.boardPack.colDays}
                      </TableHead>
                      <TableHead>{t.boardPack.colOwner}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pack.cases.outstanding.map((c) => (
                      <TableRow key={`${c.station}-${c.employeeId}`}>
                        <TableCell className="font-medium">
                          {c.employeeName}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {c.station}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {c.flaggedDays}
                        </TableCell>
                        <TableCell
                          className={c.owner ? "" : "text-muted-foreground italic"}
                        >
                          {c.owner ?? t.cases.unassigned}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle>{t.boardPack.people}</CardTitle>
            <CardDescription className="print:hidden">{t.boardPack.topPerformersDesc}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2 print:grid-cols-1">
            <div>
              <p className="mb-2 text-sm font-medium">
                {t.boardPack.topPerformers}
              </p>
              <ul className="flex flex-col gap-1 text-sm print:hidden">
                {pack.topPerformers.map((c) => (
                  <li key={c.employeeId} className="flex justify-between gap-3">
                    <span className="truncate">
                      {c.name}{" "}
                      <span className="text-muted-foreground">· {c.station}</span>
                    </span>
                    <span className="shrink-0 font-mono">
                      {c.percentOfExpected}%
                    </span>
                  </li>
                ))}
              </ul>

              <div className="hidden print:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.boardPack.colOperator}</TableHead>
                      <TableHead>{t.boardPack.station}</TableHead>
                      <TableHead className="text-right">
                        {t.boardPack.colResult}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pack.topPerformers.map((c) => (
                      <TableRow key={c.employeeId}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>{c.station}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {c.percentOfExpected}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">{t.boardPack.improved}</p>
              {pack.mostImproved.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t.leaderboard.fair.noImproved}
                </p>
              ) : (
                <>
                  <ul className="flex flex-col gap-1 text-sm print:hidden">
                    {pack.mostImproved.map((c) => (
                      <li
                        key={c.employeeId}
                        className="flex justify-between gap-3"
                      >
                        <span className="truncate">
                          {c.name}{" "}
                          <span className="text-muted-foreground">
                            · {c.station}
                          </span>
                        </span>
                        {/* From -> to, never "+N points": a point is a unit
                            nobody should have to learn, and calling the delta a
                            percentage would misstate it. */}
                        <span className="shrink-0 font-mono text-sm tabular-nums">
                          <span className="text-muted-foreground">
                            {c.improvedFrom}%
                          </span>
                          <span className="mx-1 text-muted-foreground">→</span>
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {c.improvedTo}%
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="hidden print:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t.boardPack.colOperator}</TableHead>
                          <TableHead>{t.boardPack.station}</TableHead>
                          <TableHead className="text-right">
                            {t.boardPack.improvedFromTo}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pack.mostImproved.map((c) => (
                          <TableRow key={c.employeeId}>
                            <TableCell className="font-medium">
                              {c.name}
                            </TableCell>
                            <TableCell>{c.station}</TableCell>
                            <TableCell className="text-right font-mono tabular-nums">
                              {c.improvedFrom}% → {c.improvedTo}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Shown only when the import recorded something. A section that reports
            "no issues" on every clean month is one people learn to skip — and
            then they skip it on the month it matters. */}
        {pack.dataHealth.warnings.length > 0 ? (
          <Card className="break-inside-avoid border-amber-500/30 bg-amber-500/[0.06]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconAlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />
                {t.boardPack.dataHealth}
              </CardTitle>
              <CardDescription className="print:hidden">{t.boardPack.dataHealthDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.boardPack.warningsTitle}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pack.dataHealth.warnings.slice(0, 8).map((w, i) => (
                    <TableRow key={i}>
                      <TableCell>{w}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}

        {/* Printed copies get separated from the system they came from. The
            handling note has to travel on the paper. */}
        <p className="text-xs text-muted-foreground">
          {t.boardPack.confidential}
        </p>
      </div>
    </PageShell>
  )
}
