import Link from "next/link"
import {
  IconChevronRight,
  IconFolderOpen,
  IconSearch,
  IconShieldCheck,
} from "@tabler/icons-react"

import { CaseStatusBadge, RiskBadge } from "@/components/case-badges"
import { PageShell } from "@/components/page-shell"
import { StatTile } from "@/components/stat-tile"
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
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item"
import {
  getCases,
  canTriageCase,
  CLOSED_STATUSES,
  RULE_LABEL_KEY,
} from "@/lib/cases"
import { getSessionUser } from "@/lib/auth"
import { notFound } from "next/navigation"
import { getT } from "@/lib/i18n/server"
import type { FraudRuleId } from "@/lib/fraud-rules"

export const metadata = { title: "Cases" }

export default async function CasesPage() {
  const t = await getT()
  const user = await getSessionUser()

  // 404 rather than a permission error: the queue's existence is itself
  // information an operator should not have.
  if (!user || !canTriageCase(user)) notFound()

  const cases = await getCases()

  const open = cases.filter((c) => c.status === "open")
  const investigating = cases.filter((c) => c.status === "investigating")
  const closed = cases.filter((c) => CLOSED_STATUSES.includes(c.status))

  return (
    <PageShell title={t.cases.title} description={t.cases.description}>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        <StatTile
          label={t.cases.openCases}
          value={open.length}
          icon={IconFolderOpen}
          caption={t.cases.queueDesc}
        />
        <StatTile
          label={t.cases.investigating}
          value={investigating.length}
          icon={IconSearch}
        />
        <StatTile
          label={t.cases.closed}
          value={closed.length}
          icon={IconShieldCheck}
        />
      </div>

      {/* The engine's opinion is framed as a proposal everywhere it appears.
          A queue that reads like a list of thieves invites people to treat it
          as one. */}
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

      <Card>
        <CardHeader>
          <CardTitle>{t.cases.queue}</CardTitle>
          <CardDescription>{t.cases.queueDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          {cases.length === 0 ? (
            <Empty className="py-10">
              <EmptyMedia variant="icon">
                <IconShieldCheck className="text-emerald-400" />
              </EmptyMedia>
              <EmptyTitle>{t.cases.noCases}</EmptyTitle>
              <EmptyDescription>{t.cases.noCasesDesc}</EmptyDescription>
            </Empty>
          ) : (
            <ItemGroup>
              {cases.map((record, index) => {
                const rules = Object.entries(record.repeatsByRule).sort(
                  (a, b) => b[1] - a[1]
                )
                return (
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
                        <ItemDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span>{record.station}</span>
                          <span>·</span>
                          <span>
                            {t.cases.daysCount(record.flaggedDays)}
                          </span>
                          {rules.map(([rule, days]) => (
                            <Badge
                              key={rule}
                              variant="outline"
                              className="font-normal"
                            >
                              {t.cases.rules[
                                RULE_LABEL_KEY[
                                  rule as FraudRuleId
                                ] as keyof typeof t.cases.rules
                              ] ?? rule}{" "}
                              × {days}
                            </Badge>
                          ))}
                        </ItemDescription>
                      </ItemContent>
                      <ItemActions className="gap-2">
                        <RiskBadge risk={record.proposedRisk} />
                        <IconChevronRight className="size-4 text-muted-foreground" />
                      </ItemActions>
                    </Item>
                  </div>
                )
              })}
            </ItemGroup>
          )}
        </CardContent>
      </Card>
    </PageShell>
  )
}
