import Link from "next/link"
import { notFound } from "next/navigation"
import {
  IconArrowLeft,
  IconCalendarEvent,
  IconDeviceCctv,
  IconHistory,
  IconUser,
} from "@tabler/icons-react"

import { CaseStatusBadge, RiskBadge } from "@/components/case-badges"
import { CaseTriageForm } from "@/components/case-triage-form"
import { PageShell } from "@/components/page-shell"
import { StatTile } from "@/components/stat-tile"
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
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item"
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
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatTile
          label={t.cases.proposed}
          value={record.proposedRisk}
          icon={IconUser}
          caption={t.cases.proposedNote}
        />
        <StatTile label={t.cases.score} value={record.score} />
        <StatTile
          label={t.cases.flaggedDays}
          value={record.flaggedDays}
          icon={IconCalendarEvent}
        />
        <StatTile
          label={t.cases.assignedTo}
          value={record.assignedTo ?? t.cases.unassigned}
        />
      </div>

      <Card className="border-amber-500/25 bg-amber-500/[0.05]">
        <CardHeader>
          <CardTitle className="text-amber-300">
            {t.cases.fairnessTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {t.cases.fairnessBody}
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
          <CardContent className="flex flex-col gap-6">
            {evidence.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t.cases.noEvidence}
              </p>
            ) : (
              evidence.map((day) => (
                <div key={day.date} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-medium">{day.date}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      nativeButton={false}
                      render={
                        <Link href={`/operators/${employeeId}?date=${day.date}`} />
                      }
                    >
                      {t.cases.viewDay}
                    </Button>
                  </div>
                  <ItemGroup>
                    {day.hits.map((hit, index) => {
                      const key = RULE_LABEL_KEY[
                        hit.rule as FraudRuleId
                      ] as keyof typeof t.cases.rules
                      return (
                        <div key={`${day.date}-${hit.rule}`}>
                          {index > 0 ? <ItemSeparator /> : null}
                          <Item size="sm" className="px-0" variant="outline">
                            <ItemMedia
                              variant="icon"
                              className="size-9 rounded-xl bg-red-500/10 text-red-400"
                            >
                              <IconDeviceCctv />
                            </ItemMedia>
                            <ItemContent className="gap-1.5">
                              <ItemTitle className="flex flex-wrap items-center gap-2">
                                {t.cases.rules[key] ?? hit.rule}
                                <Badge variant="outline">× {hit.count}</Badge>
                                {hit.overnight ? (
                                  <Badge
                                    variant="outline"
                                    className="border-indigo-500/35 text-indigo-300"
                                  >
                                    22:00–06:00
                                  </Badge>
                                ) : null}
                              </ItemTitle>
                              <ItemDescription>
                                {t.cases.ruleHelp[key] ?? ""}
                              </ItemDescription>

                              {/* The windows ARE the deliverable: an
                                  investigator should never have to work out
                                  which minutes of footage to pull. */}
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {hit.windows.map((w) => (
                                  <span
                                    key={w.from}
                                    className="rounded-lg bg-muted/60 px-2 py-1 font-mono text-xs"
                                    title={t.cases.cctvWindow}
                                  >
                                    {fullTimestamp(new Date(w.from))} →{" "}
                                    {fullTimestamp(new Date(w.to))}
                                  </span>
                                ))}
                              </div>

                              {hit.values && hit.values.length > 0 ? (
                                <p className="pt-1 text-xs text-muted-foreground">
                                  {t.cases.amounts}:{" "}
                                  {hit.values
                                    .map((v) => `${money2(v)} AZN`)
                                    .join(", ")}
                                </p>
                              ) : null}
                              {hit.baseline !== undefined &&
                              hit.observed !== undefined ? (
                                <p className="pt-1 text-xs text-muted-foreground">
                                  {t.cases.observed}: {money2(hit.observed)} ·{" "}
                                  {t.cases.baseline}: {money2(hit.baseline)}
                                </p>
                              ) : null}
                            </ItemContent>
                          </Item>
                        </div>
                      )
                    })}
                  </ItemGroup>
                </div>
              ))
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
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{event.by}</span>
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
    </PageShell>
  )
}
