import Link from "next/link"
import {
  IconChevronRight,
  IconFolderOpen,
  IconSearch,
  IconShieldCheck,
} from "@tabler/icons-react"

import { CaseStatusBadge, RiskBadge } from "@/components/case-badges"
import { MiniStat } from "@/components/mini-stat"
import { PageShell } from "@/components/page-shell"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { canCompareStations } from "@/lib/auth"
import { getCases, CLOSED_STATUSES, RULE_LABEL_KEY } from "@/lib/cases"
import { getT } from "@/lib/i18n/server"
import type { FraudRuleId } from "@/lib/fraud-rules"

export const metadata = { title: "Cases" }

/**
 * The review queue, as a table.
 *
 * It used to be a list of stacked badges — a status pill, a risk pill and one
 * pill per rule tripped, wrapped under each name. Reading it meant decoding a
 * row of coloured chips before knowing whether a case mattered. A table puts
 * the same facts in columns you can run an eye down: who, where, what set it
 * off, how many days, and where it has got to.
 *
 * The role gate is in `cases/layout.tsx`, above the streaming boundary, so an
 * unauthorised request gets a real 404 rather than a 200 carrying this page.
 */
export default async function CasesPage() {
  const t = await getT()
  const cases = await getCases()
  const multiStation = await canCompareStations()

  const open = cases.filter((c) => c.status === "open")
  const investigating = cases.filter((c) => c.status === "investigating")
  const closed = cases.filter((c) => CLOSED_STATUSES.includes(c.status))

  /** Rule ids as words, most-repeated first. */
  const triggers = (repeats: Record<string, number>) =>
    Object.entries(repeats)
      .sort((a, b) => b[1] - a[1])
      .map(
        ([rule]) =>
          t.cases.rules[
            RULE_LABEL_KEY[rule as FraudRuleId] as keyof typeof t.cases.rules
          ] ?? rule
      )

  return (
    <PageShell title={t.cases.title} description={t.cases.description}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MiniStat
          icon={IconFolderOpen}
          label={t.cases.openCases}
          value={open.length}
        />
        <MiniStat
          icon={IconSearch}
          label={t.cases.investigating}
          value={investigating.length}
        />
        <MiniStat
          icon={IconShieldCheck}
          label={t.cases.closed}
          value={closed.length}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.cases.queue}</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {cases.length === 0 ? (
            <Empty className="py-10">
              <EmptyMedia variant="icon">
                <IconShieldCheck className="text-emerald-600 dark:text-emerald-400" />
              </EmptyMedia>
              <EmptyTitle>{t.cases.noCases}</EmptyTitle>
              <EmptyDescription>{t.cases.noCasesDesc}</EmptyDescription>
            </Empty>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">
                      {t.boardPack.colOperator}
                    </TableHead>
                    {multiStation ? (
                      <TableHead>{t.common.station}</TableHead>
                    ) : null}
                    <TableHead>{t.cases.colWhat}</TableHead>
                    <TableHead className="text-right">
                      {t.cases.flaggedDays}
                    </TableHead>
                    <TableHead>{t.cases.statusLabel}</TableHead>
                    <TableHead className="pr-5" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cases.map((record) => (
                    <TableRow key={`${record.station}-${record.employeeId}`}>
                      <TableCell className="pl-5">
                        <Link
                          href={`/cases/${record.employeeId}`}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {record.employeeName}
                        </Link>
                      </TableCell>
                      {multiStation ? (
                        <TableCell className="text-muted-foreground">
                          {record.station}
                        </TableCell>
                      ) : null}
                      {/* Words, not a row of rule chips. */}
                      <TableCell className="text-muted-foreground">
                        {triggers(record.repeatsByRule).join(", ")}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {record.flaggedDays}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <CaseStatusBadge status={record.status} t={t} />
                          <RiskBadge risk={record.proposedRisk} />
                        </span>
                      </TableCell>
                      <TableCell className="pr-5 text-right">
                        <Link
                          href={`/cases/${record.employeeId}`}
                          aria-label={t.cases.openCase}
                        >
                          <IconChevronRight className="size-4 text-muted-foreground" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* One line, at the bottom. The paragraph that used to sit above the
          queue said this at ten times the length, and a warning read before
          any case is open is a warning read once. */}
      <p className="text-xs text-muted-foreground">{t.cases.fairnessBody}</p>
    </PageShell>
  )
}
