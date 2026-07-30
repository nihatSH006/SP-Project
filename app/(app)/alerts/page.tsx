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
import { collectAlerts } from "@/lib/analytics"
import type { StoredReport } from "@/lib/data"
import { getSlice, type SearchParams } from "@/lib/data"
import { fullTimestamp, money2 } from "@/lib/format"

export const metadata = { title: "Alerts" }

export default async function AlertsPage(props: {
  searchParams: Promise<SearchParams>
}) {
  const { reports, options } = await getSlice(await props.searchParams)
  const alerts = collectAlerts(reports)

  // Priority per operator: >=2 flagged sales = high, 1 = medium.
  const high = reports.filter((r) => r.suspicious >= 2)
  const medium = reports.filter((r) => r.suspicious === 1)
  const clear = reports.filter((r) => r.suspicious === 0)

  const highIds = new Set(high.map((r) => r.id))

  return (
    <PageShell
      options={options}
      title="Alert center"
      description="Suspicious transactions — sales recorded outside an operator's working hours."
    >
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatTile
          label="Flagged transactions"
          value={alerts.length}
          icon={IconFlag}
          caption="in the current slice"
        />
        <StatTile
          label="High priority"
          value={high.length}
          icon={IconExclamationCircle}
          caption={
            <StatusLine band={high.length > 0 ? "crit" : "good"}>
              2+ flagged sales
            </StatusLine>
          }
        />
        <StatTile
          label="Medium priority"
          value={medium.length}
          icon={IconAlertTriangle}
          caption={
            <StatusLine band={medium.length > 0 ? "warn" : "good"}>
              1 flagged sale
            </StatusLine>
          }
        />
        <StatTile
          label="Clear operators"
          value={clear.length}
          icon={IconShieldCheck}
          caption={<StatusLine band="good">no flagged sales</StatusLine>}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* ------------------------------------------- incident log */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Incident log</CardTitle>
            <CardDescription>
              Newest first · click an operator for their full profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <Empty className="py-10">
                <EmptyMedia variant="icon">
                  <IconCircleCheck className="text-emerald-400" />
                </EmptyMedia>
                <EmptyTitle>No suspicious transactions detected</EmptyTitle>
                <EmptyDescription>
                  Every sale in this slice falls inside its operator&apos;s
                  registered working hours.
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
                            {alert.reason} · {fullTimestamp(alert.time)} ·{" "}
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
                            {highIds.has(alert.operatorId) ? "High" : "Medium"}
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
            <CardTitle>Recommended actions</CardTitle>
            <CardDescription>Standard incident procedure</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-muted-foreground">
            {alerts.length === 0 ? (
              <>
                <StatusLine band="good">No action required.</StatusLine>
                <p>
                  All sales in the current slice fall inside their
                  operators&apos; registered working hours.
                </p>
              </>
            ) : (
              <>
                <p>
                  Today&apos;s operations generated{" "}
                  <strong className="font-medium text-foreground">
                    {alerts.length}
                  </strong>{" "}
                  flagged transaction{alerts.length === 1 ? "" : "s"} across{" "}
                  <strong className="font-medium text-foreground">
                    {high.length + medium.length}
                  </strong>{" "}
                  operator{high.length + medium.length === 1 ? "" : "s"}.
                </p>
                <p>Before the end of the operating day:</p>
                <ol className="flex flex-col gap-2">
                  <Step n={1}>
                    Verify each flagged transaction against the till record.
                  </Step>
                  <Step n={2}>
                    Review CCTV footage for the flagged time windows.
                  </Step>
                  <Step n={3}>
                    Confirm the operator&apos;s shift schedule with the station
                    manager.
                  </Step>
                </ol>
                {high.length > 0 ? (
                  <div className="flex flex-col gap-2 rounded-xl border border-red-500/25 bg-red-500/[0.07] p-3">
                    <StatusLine band="crit">Priority review</StatusLine>
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
          <CardTitle>Operators by priority</CardTitle>
          <CardDescription>
            Grouped by how many flagged sales each operator carries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="high" className="gap-4">
            <TabsList>
              <TabsTrigger value="high">High · {high.length}</TabsTrigger>
              <TabsTrigger value="medium">Medium · {medium.length}</TabsTrigger>
              <TabsTrigger value="clear">Clear · {clear.length}</TabsTrigger>
            </TabsList>
            <TabsContent value="high">
              <OperatorList operators={high} emptyLabel="No high-priority operators." />
            </TabsContent>
            <TabsContent value="medium">
              <OperatorList
                operators={medium}
                emptyLabel="No medium-priority operators."
              />
            </TabsContent>
            <TabsContent value="clear">
              <OperatorList operators={clear} emptyLabel="No clear operators." />
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
