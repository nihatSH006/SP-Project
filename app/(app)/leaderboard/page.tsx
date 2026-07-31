import Link from "next/link"
import {
  IconBolt,
  IconClockHour4,
  IconCoin,
  IconMedal,
} from "@tabler/icons-react"

import { PageShell } from "@/components/page-shell"
import { GradeBadge } from "@/components/risk-badge"
import { NoMatches } from "@/components/status"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { rankOperators } from "@/lib/analytics"
import { FairLeaderboard } from "@/components/fair-leaderboard"
import { getScorecards } from "@/lib/scorecards-server"
import type { StoredReport } from "@/lib/data"
import { getSlice, type SearchParams } from "@/lib/data"
import { getT } from "@/lib/i18n/server"
import { money } from "@/lib/format"
import { cn } from "@/lib/utils"

export const metadata = { title: "Leaderboard" }

/** Podium tint per place — gold, silver, bronze. */
const podium = [
  "ring-amber-400/40 bg-amber-400/[0.07]",
  "ring-zinc-300/30 bg-zinc-300/[0.05]",
  "ring-orange-700/40 bg-orange-700/[0.07]",
]
const medalTint = ["text-amber-400", "text-zinc-300", "text-orange-600"]

export default async function LeaderboardPage(props: {
  searchParams: Promise<SearchParams>
}) {
  const t = await getT()
  const [{ reports, options }, scorecards] = await Promise.all([
    getSlice(await props.searchParams),
    getScorecards(),
  ])
  const ranking = rankOperators(reports)

  const best = (pick: (r: StoredReport) => number) =>
    ranking.length
      ? ranking.reduce((top, r) => (pick(r) > pick(top) ? r : top))
      : null

  const awards = {
    revenue: best((r) => r.revenue),
    productivity: best((r) => r.productivity),
    attendance: best((r) => r.attendanceScore),
  }

  return (
    <PageShell
      options={options}
      title={t.leaderboard.title}
      description={t.leaderboard.description}
    >
      {/* The fair, window-based ranking leads (idea #11). The single-day
          podium below it is kept for the daily standings, but it is no longer
          what the page is about. */}
      {scorecards.length > 0 ? (
        <FairLeaderboard cards={scorecards} t={t} />
      ) : null}

      {ranking.length === 0 ? (
        <NoMatches
          title={t.errors.noMatch(t.common.operators.toLowerCase())}
          description={t.errors.noMatchDesc(t.common.operators.toLowerCase())}
        />
      ) : (
        <>
          {/* ------------------------------------------- podium */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {ranking.slice(0, 3).map((r, index) => (
              <Card
                key={r.id}
                className={cn("relative", podium[index])}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Avatar size="lg" className="rounded-2xl">
                      <AvatarFallback className="rounded-2xl">
                        {r.name.slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <Link
                        href={`/operators/${r.id}`}
                        className="font-semibold underline-offset-4 hover:underline"
                      >
                        {r.name}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {r.station} · {t.leaderboard.shiftSuffix(t.shifts[r.shift])}
                      </span>
                    </div>
                  </div>
                  <div className="absolute top-4 right-4 flex items-center gap-1.5">
                    <IconMedal className={cn("size-5", medalTint[index])} />
                    <span className="font-mono text-sm tabular-nums">
                      #{index + 1}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <dl className="flex flex-col gap-2.5 text-sm">
                    <Row label={t.common.revenue}>{money(r.revenue)} AZN</Row>
                    <Row label={t.common.productivity}>
                      {money(r.productivity)} AZN/h
                    </Row>
                    <Row label={t.common.attendance}>{r.attendanceScore}%</Row>
                    <Row label={t.common.grade}>
                      <GradeBadge grade={r.grade} />
                    </Row>
                  </dl>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ------------------------------------------- awards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <AwardCard
              icon={IconCoin}
              title={t.leaderboard.revenueChampion}
              description={t.leaderboard.revenueChampionDesc}
              operator={awards.revenue!}
              value={`${money(awards.revenue!.revenue)} AZN`}
            />
            <AwardCard
              icon={IconBolt}
              title={t.leaderboard.productivityChampion}
              description={t.leaderboard.productivityChampionDesc}
              operator={awards.productivity!}
              value={`${money(awards.productivity!.productivity)} AZN/h`}
            />
            <AwardCard
              icon={IconClockHour4}
              title={t.leaderboard.attendanceChampion}
              description={t.leaderboard.attendanceChampionDesc}
              operator={awards.attendance!}
              value={`${awards.attendance!.attendanceScore}%`}
            />
          </div>

          {/* The full 64-row table that used to sit here has gone. It ranked
              the same people again, by raw revenue — the exact measure #11
              exists to stop using — and rendering both rankings made this the
              heaviest page in the app for no added information. The daily
              podium above answers "who did well today"; the fair board answers
              "who is performing", and lists everyone. */}
        </>
      )}
    </PageShell>
  )
}

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium tabular-nums">{children}</dd>
    </div>
  )
}

function AwardCard({
  icon: Icon,
  title,
  description,
  operator,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  operator: StoredReport
  value: string
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          <Icon className="size-4 text-primary" />
          {title}
        </CardDescription>
        <CardTitle className="text-base">
          <Link
            href={`/operators/${operator.id}`}
            className="underline-offset-4 hover:underline"
          >
            {operator.name}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-3">
        <span className="text-muted-foreground">{description}</span>
        <span className="text-lg font-semibold tabular-nums">{value}</span>
      </CardContent>
    </Card>
  )
}
