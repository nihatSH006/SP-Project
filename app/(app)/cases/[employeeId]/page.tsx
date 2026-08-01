import Link from "next/link"
import { notFound } from "next/navigation"
import {
  IconArrowLeft,
  IconDeviceCctv,
  IconHistory,
} from "@tabler/icons-react"

import { CaseStatusBadge, RiskBadge } from "@/components/case-badges"
import { CaseTriageForm } from "@/components/case-triage-form"
import { PageShell } from "@/components/page-shell"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { getSessionUser } from "@/lib/auth"
import {
  CLOSED_STATUSES,
  RULE_LABEL_KEY,
  canConcludeCase,
  canTriageCase,
  getCase,
  getCaseTimeline,
} from "@/lib/cases"
import { getEvidence } from "@/lib/evidence"
import type { FraudRuleId } from "@/lib/fraud-rules"
import { getT } from "@/lib/i18n/server"
import { fullTimestamp, money2 } from "@/lib/format"

export const metadata = { title: "Case" }

export default async function CaseDetailPage(props: {
  params: Promise<{ employeeId: string }>
}) {
  const { employeeId: raw } = await props.params
  const employeeId = Number(raw)
  if (!Number.isFinite(employeeId)) notFound()

  const t = await getT()
  const [user, record] = await Promise.all([getSessionUser(), getCase(employeeId)])

  // `getCase` reads through the station-scoped query, so a case outside the
  // user's scope is simply absent rather than forbidden — the 404 does not
  // confirm that some other station has a case open on this person.
  if (!user || !canTriageCase(user) || !record) notFound()

  const [timeline, evidence] = await Promise.all([
    getCaseTimeline(record.station, employeeId),
    getEvidence(record.station, employeeId, record.dates),
  ])

  const canTriage = canTriageCase(user)
  const canConclude = canConcludeCase(user)

  return (
    <PageShell
      title={record.employeeName}
      description={`${record.station} · ${record.fromDate} → ${record.toDate}`}
      actions={
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/cases" />}
        >
          <IconArrowLeft className="size-4" />
          {t.cases.backToCases}
        </Button>
      }
    >
      {/* One sentence in plain words. The four tiles this replaces —
          proposed risk, weighted score, flagged days, owner — were four
          numbers to assemble into the sentence yourself, and "score 76.8"
          means nothing to the person deciding. */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-lg">
              {t.cases.summary(
                record.flaggedDays,
                Object.keys(record.repeatsByRule)
                  .map(
                    (rule) =>
                      t.cases.rules[
                        RULE_LABEL_KEY[
                          rule as FraudRuleId
                        ] as keyof typeof t.cases.rules
                      ] ?? rule
                  )
                  .join(", ")
              )}
            </span>
            <span className="text-sm text-muted-foreground">
              {record.fromDate} → {record.toDate} · {t.cases.assignedTo}:{" "}
              {record.assignedTo ?? t.cases.unassigned}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <CaseStatusBadge status={record.status} t={t} />
              <RiskBadge risk={record.proposedRisk} />
            </div>
            {/* The risk badge is the ENGINE's opinion. Unlabelled next to a
                person's name it reads as a finding, which it is not. */}
            <span className="text-xs text-muted-foreground">
              {t.cases.proposedNote}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* ------------------------------------------------ evidence pack */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconDeviceCctv className="size-5" />
              {t.cases.evidence}
            </CardTitle>
            <CardDescription>{t.cases.evidenceDesc}</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {evidence.length === 0 ? (
              <p className="px-(--card-spacing) text-sm text-muted-foreground">
                {t.cases.noEvidence}
              </p>
            ) : (
              /* One row per finding, flat. The previous layout nested days
                 inside the card, rules inside days and windows inside rules —
                 three levels to walk before reaching the times someone came
                 here for. A table puts the date, the finding and the CCTV
                 windows on one line. */
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-5">{t.cases.colWhen}</TableHead>
                      <TableHead>{t.cases.colWhat}</TableHead>
                      <TableHead>{t.cases.colTimes}</TableHead>
                      <TableHead className="pr-5 text-right">
                        {t.cases.colAmounts}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evidence.flatMap((day) =>
                      day.hits.map((hit) => {
                        const key = RULE_LABEL_KEY[
                          hit.rule as FraudRuleId
                        ] as keyof typeof t.cases.rules
                        return (
                          <TableRow key={`${day.date}-${hit.rule}`}>
                            <TableCell className="pl-5 font-mono whitespace-nowrap tabular-nums">
                              {day.date}
                            </TableCell>
                            <TableCell>
                              <span className="flex items-center gap-2">
                                {t.cases.rules[key] ?? hit.rule}
                                <Badge variant="outline">× {hit.count}</Badge>
                              </span>
                            </TableCell>
                            <TableCell>
                              {/* The windows ARE the deliverable: nobody
                                  should have to work out which minutes of
                                  footage to pull. */}
                              <span className="flex flex-wrap gap-1.5">
                                {hit.windows.map((w) => (
                                  <span
                                    key={w.from}
                                    className="rounded-lg bg-muted/60 px-2 py-0.5 font-mono text-xs whitespace-nowrap"
                                  >
                                    {fullTimestamp(new Date(w.from))} →{" "}
                                    {fullTimestamp(new Date(w.to))}
                                  </span>
                                ))}
                              </span>
                            </TableCell>
                            <TableCell className="pr-5 text-right font-mono text-sm tabular-nums">
                              {hit.values && hit.values.length > 0
                                ? hit.values.map((v) => money2(v)).join(", ")
                                : hit.observed !== undefined
                                  ? `${money2(hit.observed)} · ${t.cases.baseline} ${money2(hit.baseline ?? 0)}`
                                  : "—"}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ------------------------------------------------------ triage */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {t.cases.statusLabel}
                <CaseStatusBadge status={record.status} t={t} />
                <RiskBadge risk={record.proposedRisk} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {canTriage ? (
                <CaseTriageForm
                  employeeId={employeeId}
                  station={record.station}
                  status={record.status}
                  note={record.note}
                  canConclude={canConclude}
                  closedStatuses={CLOSED_STATUSES}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t.cases.errors.notAllowed}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconHistory className="size-5" />
                {t.cases.timeline}
              </CardTitle>
              <CardDescription>{t.cases.timelineDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t.cases.noTimeline}
                </p>
              ) : (
                <ol className="flex flex-col gap-3">
                  {timeline.map((event, index) => (
                    <li key={`${event.at}-${index}`} className="text-sm">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-medium">
                          {event.byName ?? event.by}
                        </span>
                        {event.byRole ? (
                          <span className="text-xs text-muted-foreground">
                            {t.roles[event.byRole as keyof typeof t.roles] ??
                              event.byRole}
                          </span>
                        ) : null}
                        <span className="text-muted-foreground">
                          {event.from ?? "—"} → {event.to ?? "—"}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {event.at ? fullTimestamp(new Date(event.at)) : ""}
                      </div>
                      {event.note ? (
                        <p className="pt-1 text-muted-foreground">
                          {event.note}
                        </p>
                      ) : null}
                      {index < timeline.length - 1 ? (
                        <Separator className="mt-3" />
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      {/* One line rather than the amber card that used to sit above the
          evidence. It still has to be here: this page names a person as
          suspected of theft, and the patterns above have innocent
          explanations. */}
      <p className="text-xs text-muted-foreground">{t.cases.fairnessBody}</p>
    </PageShell>
  )
}
