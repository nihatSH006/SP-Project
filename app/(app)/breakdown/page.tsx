import Link from "next/link"
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react"

import { RevenueRankChart, ShiftDonutChart } from "@/components/charts"
import { Meter } from "@/components/meter"
import { PageShell } from "@/components/page-shell"
import { RiskBadge } from "@/components/risk-badge"
import { NoMatches } from "@/components/status"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
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
import {
  groupRevenue,
  rankOperators,
  shiftDistribution,
  summarise,
} from "@/lib/analytics"
import { getSlice, type SearchParams } from "@/lib/data"
import { getT } from "@/lib/i18n/server"
import { money } from "@/lib/format"

export const metadata = { title: "Breakdown" }

/**
 * The composition views that used to crowd the overview.
 *
 * None of this answers "do I need to act today" — it answers "where did it
 * come from", which is a question you go looking for rather than one that
 * should be shouting from the landing page.
 */
export default async function BreakdownPage(props: {
  searchParams: Promise<SearchParams>
}) {
  const t = await getT()
  const { reports, options, target } = await getSlice(await props.searchParams)
  const summary = summarise(reports, target)
  const top5 = rankOperators(reports).slice(0, 5)

  return (
    <PageShell
      options={options}
      title={t.breakdown.title}
      description={t.breakdown.description}
      actions={
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/" />}
        >
          <IconArrowLeft data-icon="inline-start" />
          {t.breakdown.backToOverview}
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Summary
              label={t.breakdown.perOperator}
              value={`${money(summary.revenue / summary.operators)} AZN`}
            />
            <Summary
              label={t.breakdown.bestStation}
              value={summary.bestStation ?? "—"}
            />
            <Summary
              label={t.breakdown.bestDepartment}
              value={summary.bestDepartment ?? "—"}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t.overview.byStation}</CardTitle>
              </CardHeader>
              <CardContent>
                <RevenueRankChart data={groupRevenue(reports, "station")} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t.breakdown.byDepartment}</CardTitle>
              </CardHeader>
              <CardContent>
                <RevenueRankChart data={groupRevenue(reports, "department")} />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t.breakdown.byShift}</CardTitle>
              </CardHeader>
              <CardContent>
                <ShiftDonutChart data={shiftDistribution(reports)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t.breakdown.byRisk}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {(["LOW", "MEDIUM", "HIGH"] as const).map((level) => (
                  <Meter
                    key={level}
                    label={<RiskBadge risk={level} label={t.risk[level]} />}
                    value={(summary.riskCounts[level] / summary.operators) * 100}
                    display={String(summary.riskCounts[level])}
                    band={
                      level === "LOW" ? "good" : level === "MEDIUM" ? "warn" : "crit"
                    }
                  />
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t.breakdown.topPerformers}</CardTitle>
              <CardAction>
                <Button
                  variant="ghost"
                  size="sm"
                  nativeButton={false}
                  render={<Link href="/leaderboard" />}
                >
                  {t.overview.seeAll}
                  <IconArrowRight data-icon="inline-end" />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">{t.common.operator}</TableHead>
                    <TableHead>{t.common.station}</TableHead>
                    <TableHead className="text-right">{t.common.revenue}</TableHead>
                    <TableHead className="pr-5 text-right">
                      {t.common.risk}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {top5.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="pl-5">
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
                      <TableCell className="pr-5 text-right">
                        <RiskBadge risk={r.risk} label={t.risk[r.risk]} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </PageShell>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-0.5 py-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="truncate text-lg font-semibold tracking-tight">
          {value}
        </span>
      </CardContent>
    </Card>
  )
}
