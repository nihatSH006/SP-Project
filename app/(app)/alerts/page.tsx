import Link from "next/link"
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconExclamationCircle,
  IconFlag,
  IconShieldCheck,
} from "@tabler/icons-react"

import { PageShell } from "@/components/page-shell"
import { StatTile } from "@/components/stat-tile"
import { StatusLine } from "@/components/status"
import { Badge } from "@/components/ui/badge"
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
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getSessionUser } from "@/lib/auth"
import { canTriageCase, getCases, CLOSED_STATUSES } from "@/lib/cases"
import { CaseStatusBadge } from "@/components/case-badges"
import { collectAlerts } from "@/lib/analytics"
import type { StoredReport } from "@/lib/data"
import { getSlice, type SearchParams } from "@/lib/data"
import { getT } from "@/lib/i18n/server"
import { fullTimestamp, money2 } from "@/lib/format"

export const metadata = { title: "Alerts" }

export default async function AlertsPage(props: {
  searchParams: Promise<SearchParams>
}) {
  const t = await getT()
  const user = await getSessionUser()
  const showCases = Boolean(user && canTriageCase(user))
  const [{ reports, options }, cases] = await Promise.all([
    getSlice(await props.searchParams),
    // An operator gets the day's flagged transactions but never the case
    // queue: those documents name colleagues as suspected of theft.
    showCases ? getCases() : Promise.resolve([]),
  ])
  const alerts = collectAlerts(reports)

  // A day's flagged sale is a single event. A case is the multi-day pattern
  // built from many of them, and it is the pattern that warrants acting on —
  // so the open cases are surfaced above the raw incident log.
  const liveCases = cases.filter((c) => !CLOSED_STATUSES.includes(c.status))

  // Priority per operator: >=2 flagged sales = high, 1 = medium.
  const high = reports.filter((r) => r.suspicious >= 2)
  const medium = reports.filter((r) => r.suspicious === 1)
  const clear = reports.filter((r) => r.suspicious === 0)

  const highIds = new Set(high.map((r) => r.id))

  return (
    <PageShell
      options={options}
      title={t.alerts.title}
      description={t.alerts.description}
    >
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatTile
          label={t.alerts.flaggedTransactions}
          value={alerts.length}
          icon={IconFlag}
          caption={t.alerts.inSlice}
        />
        <StatTile
          label={t.alerts.highPriority}
          value={high.length}
          icon={IconExclamationCircle}
          caption={
            <StatusLine band={high.length > 0 ? "crit" : "good"}>
              {t.alerts.twoPlusFlagged}
            </StatusLine>
          }
        />
        <StatTile
          label={t.alerts.mediumPriority}
          value={medium.length}
          icon={IconAlertTriangle}
          caption={
            <StatusLine band={medium.length > 0 ? "warn" : "good"}>
              {t.alerts.oneFlagged}
            </StatusLine>
          }
        />
        <StatTile
          label={t.alerts.clearOperators}
          value={clear.length}
          icon={IconShieldCheck}
          caption={<StatusLine band="good">{t.alerts.noFlagged}</StatusLine>}
        />
      </div>

      {showCases && liveCases.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t.cases.queue}</CardTitle>
            <CardDescription>{t.cases.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <ItemGroup>
              {liveCases.map((record, index) => (
                <div key={`${record.station}-${record.employeeId}`}>
                  {index > 0 ? <ItemSeparator /> : null}
                  <Item
                    size="sm"
                    className="px-0"
                    render={<Link href={`/cases/${record.employeeId}`} />}
                  >
                    <ItemContent>
                      <ItemTitle className="flex items-center gap-2">
                        {record.employeeName}
                        <CaseStatusBadge status={record.status} t={t} />
                      </ItemTitle>
                      <ItemDescription>
                        {record.station} ·{" "}
                        {t.cases.daysCount(record.flaggedDays)}
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <Badge variant="outline">{record.proposedRisk}</Badge>
                    </ItemActions>
                  </Item>
                </div>
              ))}
            </ItemGroup>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* ------------------------------------------- incident log */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>{t.alerts.incidentLog}</CardTitle>
            <CardDescription>
              {t.alerts.incidentLogDesc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <Empty className="py-10">
                <EmptyMedia variant="icon">
                  <IconCircleCheck className="text-emerald-400" />
                </EmptyMedia>
                <EmptyTitle>{t.alerts.noneDetected}</EmptyTitle>
                <EmptyDescription>
                  {t.alerts.noneDetectedDesc}
                </EmptyDescription>
              </Empty>
            ) : (
              <ScrollArea className="max-h-[32rem] pr-3">
                <ItemGroup>
                  {alerts.map((alert, index) => (
                    <div key={`${alert.operatorId}-${alert.time.getTime()}-${index}`}>
                      {index > 0 ? <ItemSeparator /> : null}
                      <Item size="sm" className="px-0">
                        <ItemMedia
                          variant="icon"
                          className="size-9 rounded-xl bg-red-500/10 text-red-400"
                        >
                          <IconAlertTriangle />
                        </ItemMedia>
                        <ItemContent>
                          <ItemTitle>
                            <Link
                              href={`/operators/${alert.operatorId}`}
                              className="underline-offset-4 hover:underline"
                            >
                              {alert.operator}
                            </Link>
                            <span className="text-muted-foreground">
                              {" · "}
                              {money2(alert.amount)} AZN
                            </span>
                          </ItemTitle>
                          <ItemDescription>
                            {t.alerts.outsideHours} · {fullTimestamp(alert.time)} ·{" "}
                            {alert.station}
                          </ItemDescription>
                        </ItemContent>
                        <ItemActions>
                          <Badge
                            variant={
                              highIds.has(alert.operatorId)
                                ? "destructive"
                                : "outline"
                            }
                          >
                            {highIds.has(alert.operatorId)
                              ? t.alerts.tabHigh
                              : t.alerts.tabMedium}
                          </Badge>
                        </ItemActions>
                      </Item>
                    </div>
                  ))}
                </ItemGroup>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* ------------------------------------------- procedure */}
        <Card>
          <CardHeader>
            <CardTitle>{t.alerts.recommendedActions}</CardTitle>
            <CardDescription>{t.alerts.standardProcedure}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-muted-foreground">
            {alerts.length === 0 ? (
              <>
                <StatusLine band="good">{t.alerts.noAction}</StatusLine>
                <p>{t.alerts.noActionDesc}</p>
              </>
            ) : (
              <>
                <p className="text-foreground">
                  {t.alerts.generated(alerts.length, high.length + medium.length)}
                </p>
                <p>{t.alerts.beforeEndOfDay}</p>
                <ol className="flex flex-col gap-2">
                  <Step n={1}>{t.alerts.step1}</Step>
                  <Step n={2}>{t.alerts.step2}</Step>
                  <Step n={3}>{t.alerts.step3}</Step>
                </ol>
                {high.length > 0 ? (
                  <div className="flex flex-col gap-2 rounded-xl border border-red-500/25 bg-red-500/[0.07] p-3">
                    <StatusLine band="crit">{t.alerts.priorityReview}</StatusLine>
                    <div className="flex flex-wrap gap-1.5">
                      {high.map((operator) => (
                        <PriorityLink key={operator.id} operator={operator} />
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------- priority breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>{t.alerts.byPriority}</CardTitle>
          <CardDescription>
            {t.alerts.byPriorityDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="high" className="gap-4">
            <TabsList>
              <TabsTrigger value="high">
                {t.alerts.tabHigh} · {high.length}
              </TabsTrigger>
              <TabsTrigger value="medium">
                {t.alerts.tabMedium} · {medium.length}
              </TabsTrigger>
              <TabsTrigger value="clear">
                {t.alerts.tabClear} · {clear.length}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="high">
              <OperatorList operators={high} emptyLabel={t.alerts.noHigh} />
            </TabsContent>
            <TabsContent value="medium">
              <OperatorList operators={medium} emptyLabel={t.alerts.noMedium} />
            </TabsContent>
            <TabsContent value="clear">
              <OperatorList operators={clear} emptyLabel={t.alerts.noClear} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </PageShell>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-lg bg-muted font-mono text-xs">
        {n}
      </span>
      <span>{children}</span>
    </li>
  )
}

function PriorityLink({ operator }: { operator: StoredReport }) {
  return (
    <Link
      href={`/operators/${operator.id}`}
      className="rounded-lg bg-red-500/10 px-2 py-1 text-xs font-medium text-red-400 underline-offset-4 transition-colors hover:bg-red-500/20 hover:underline"
    >
      {operator.name} · {operator.suspicious}
    </Link>
  )
}

function OperatorList({
  operators,
  emptyLabel,
}: {
  operators: StoredReport[]
  emptyLabel: string
}) {
  if (operators.length === 0) {
    return (
      <Empty className="py-8">
        <EmptyMedia variant="icon">
          <IconCircleCheck className="text-emerald-400" />
        </EmptyMedia>
        <EmptyTitle>{emptyLabel}</EmptyTitle>
      </Empty>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
      {operators.map((operator) => (
        <Item
          key={operator.id}
          variant="outline"
          size="sm"
          render={<Link href={`/operators/${operator.id}`} />}
        >
          <ItemContent>
            <ItemTitle>{operator.name}</ItemTitle>
            <ItemDescription>
              {operator.station} · {operator.shift} shift
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Badge variant={operator.suspicious > 0 ? "destructive" : "outline"}>
              {operator.suspicious} flagged
            </Badge>
          </ItemActions>
        </Item>
      ))}
    </div>
  )
}
