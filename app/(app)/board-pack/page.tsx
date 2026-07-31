import {
  IconAlertTriangle,
  IconCircleCheck,
  IconShieldCheck,
} from "@tabler/icons-react"

import { PageShell } from "@/components/page-shell"
import { PrintButton } from "@/components/print-button"
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
import { getBoardPack } from "@/lib/board-pack"
import { fullTimestamp, money } from "@/lib/format"
import { getT } from "@/lib/i18n/server"

export const metadata = { title: "Board pack" }

export default async function BoardPackPage() {
  const t = await getT()
  const pack = await getBoardPack()

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

  const weekday = (n: number) => t.staffing.weekdays[n]
  const clock = (h: number) => `${String(h).padStart(2, "0")}:00`

  return (
    <PageShell
      title={t.boardPack.title}
      description={t.boardPack.description}
      actions={<PrintButton />}
    >
      {/* `print:` variants collapse the app chrome so the printed sheet is the
          report and nothing else. */}
      <div className="flex flex-col gap-6 print:gap-4">
        <Card>
          <CardHeader>
            <CardTitle>
              {pack.month} · {pack.scope || t.boardPack.scopeNetwork}
            </CardTitle>
            <CardDescription>
              {t.boardPack.period}: {pack.fromDate} → {pack.toDate} ·{" "}
              {t.boardPack.generatedOn(fullTimestamp(new Date(pack.generatedAt)))}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {stat(t.boardPack.revenue, `${money(pack.revenue)} AZN`)}
            {stat(t.boardPack.transactions, pack.transactions.toLocaleString("en-US"))}
            {stat(t.boardPack.operators, String(pack.operators))}
          </CardContent>
        </Card>

        {/* Data quality is placed BEFORE the figures, not in a footnote. A
            reader should know how complete the month is before they read a
            total from it. */}
        <Card
          className={
            pack.dataHealth.complete
              ? "border-emerald-500/25 bg-emerald-500/[0.04]"
              : "border-amber-500/30 bg-amber-500/[0.06]"
          }
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {pack.dataHealth.complete ? (
                <IconCircleCheck className="size-5 text-emerald-400" />
              ) : (
                <IconAlertTriangle className="size-5 text-amber-400" />
              )}
              {t.boardPack.dataHealth}
            </CardTitle>
            <CardDescription>{t.boardPack.dataHealthDesc}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <p className={pack.dataHealth.complete ? "" : "text-amber-300"}>
              {pack.dataHealth.complete
                ? t.boardPack.complete
                : t.boardPack.incomplete}{" "}
              ·{" "}
              {t.boardPack.daysCovered(
                pack.dataHealth.daysCovered,
                pack.dataHealth.daysExpected
              )}
            </p>
            {pack.dataHealth.warnings.length === 0 ? (
              <p className="text-muted-foreground">{t.boardPack.noWarnings}</p>
            ) : (
              <>
                <p className="font-medium">{t.boardPack.warningsTitle}</p>
                <ul className="list-inside list-disc text-muted-foreground">
                  {pack.dataHealth.warnings.slice(0, 6).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle>{t.boardPack.perStation}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.boardPack.station}</TableHead>
                  <TableHead className="text-right">{t.boardPack.revenue}</TableHead>
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
                    <TableCell className="text-right font-mono">
                      {money(s.revenue)}
                    </TableCell>
                    <TableCell className="text-right font-mono">{s.days}</TableCell>
                    <TableCell className="text-right font-mono">
                      {money(s.dailyAverage)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconShieldCheck className="size-5" />
              {t.boardPack.integrity}
            </CardTitle>
            <CardDescription>{t.boardPack.integrityDesc}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {stat(t.boardPack.casesOpen, String(pack.cases.open))}
              {stat(t.boardPack.casesInvestigating, String(pack.cases.investigating))}
              {stat(t.boardPack.casesConfirmed, String(pack.cases.confirmed))}
              {stat(t.boardPack.casesExplained, String(pack.cases.explained))}
              {stat(t.boardPack.casesDismissed, String(pack.cases.dismissed))}
            </div>
            <div>
              <p className="mb-1 text-sm font-medium">{t.boardPack.outstanding}</p>
              {pack.cases.outstanding.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t.boardPack.noOutstanding}
                </p>
              ) : (
                <ul className="text-sm text-muted-foreground">
                  {pack.cases.outstanding.map((c) => (
                    <li key={`${c.station}-${c.employeeId}`}>
                      {c.employeeName} — {c.station} ·{" "}
                      {t.cases.daysCount(c.flaggedDays)} ·{" "}
                      {c.assignedTo ?? t.cases.unassigned}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle>{t.boardPack.people}</CardTitle>
            <CardDescription>{t.boardPack.topPerformersDesc}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium">
                {t.boardPack.topPerformers}
              </p>
              <ul className="flex flex-col gap-1 text-sm">
                {pack.topPerformers.map((c) => (
                  <li key={c.employeeId} className="flex justify-between gap-3">
                    <span className="truncate">
                      {c.name}{" "}
                      <span className="text-muted-foreground">
                        · {c.station}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono">
                      {c.percentOfExpected}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">{t.boardPack.improved}</p>
              {pack.mostImproved.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t.leaderboard.fair.noImproved}
                </p>
              ) : (
                <ul className="flex flex-col gap-1 text-sm">
                  {pack.mostImproved.map((c) => (
                    <li key={c.employeeId} className="flex justify-between gap-3">
                      <span className="truncate">
                        {c.name}{" "}
                        <span className="text-muted-foreground">
                          · {c.station}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-emerald-400">
                        {t.leaderboard.fair.improvementPoints(c.improvement)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle>{t.boardPack.rota}</CardTitle>
            <CardDescription>{t.boardPack.rotaDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            {pack.staffing.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.boardPack.noRota}</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {pack.staffing.map((s) => (
                  <li
                    key={`${s.weekday}-${s.hour}`}
                    className="flex justify-between gap-3"
                  >
                    <span>
                      {weekday(s.weekday)} {clock(s.hour)} —{" "}
                      {s.kind === "stretched"
                        ? t.staffing.stretched
                        : t.staffing.idle}
                    </span>
                    <span className="shrink-0 font-mono text-muted-foreground">
                      ×{s.ratio}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Printed copies get separated from the system they came from. The
            handling note has to travel on the paper. */}
        <p className="text-xs text-muted-foreground">
          {t.boardPack.confidential}
        </p>
      </div>
    </PageShell>
  )
}
