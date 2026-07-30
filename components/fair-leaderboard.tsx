import Link from "next/link"
import { IconInfoCircle, IconTrendingUp } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { money } from "@/lib/format"
import type { Dictionary } from "@/lib/i18n"
import { mostImproved, type Scorecard, type Tier } from "@/lib/scorecards"
import { cn } from "@/lib/utils"

const TIER_STYLE: Record<Tier, string> = {
  exceptional: "border-emerald-500/35 bg-emerald-500/10 text-emerald-300",
  strong: "border-sky-500/35 bg-sky-500/10 text-sky-300",
  expected: "border-border bg-muted/40 text-muted-foreground",
  below: "border-amber-500/35 bg-amber-500/10 text-amber-300",
  // Not red. This band is a prompt to go and ask why, and colouring it like a
  // fraud alert would tell every manager to read it as one.
  "needs-support": "border-orange-500/35 bg-orange-500/10 text-orange-300",
}

function TierBadge({ tier, t }: { tier: Tier; t: Dictionary }) {
  return (
    <Badge variant="outline" className={cn("font-normal", TIER_STYLE[tier])}>
      {t.leaderboard.fair.tiers[tier]}
    </Badge>
  )
}

export function FairLeaderboard({
  cards,
  t,
}: {
  cards: Scorecard[]
  t: Dictionary
}) {
  const improved = mostImproved(cards)
  const days = cards[0]?.days ?? 0

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconInfoCircle className="size-5 text-muted-foreground" />
            {t.leaderboard.fair.why}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {t.leaderboard.fair.whyBody}
        </CardContent>
      </Card>

      {improved.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconTrendingUp className="size-5 text-emerald-400" />
              {t.leaderboard.fair.mostImproved}
            </CardTitle>
            <CardDescription>
              {t.leaderboard.fair.mostImprovedDesc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {improved.map((card) => (
                <Link
                  key={card.employeeId}
                  href={`/operators/${card.employeeId}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2 transition-colors hover:bg-emerald-500/10"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {card.name}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {card.station} · {card.shift}
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-sm text-emerald-300">
                    {t.leaderboard.fair.improvementPoints(card.improvement)}
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t.leaderboard.fair.title}</CardTitle>
          <CardDescription>
            {t.leaderboard.fair.subtitle}
            {days ? ` · ${t.leaderboard.fair.overWindow(days)}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>{t.common.operators}</TableHead>
                  <TableHead>{t.leaderboard.fair.percentOfExpected}</TableHead>
                  <TableHead className="text-right">
                    {t.leaderboard.fair.expected}
                  </TableHead>
                  <TableHead className="text-right">
                    {t.leaderboard.fair.actual}
                  </TableHead>
                  <TableHead className="text-right">
                    {t.leaderboard.fair.tierLabel}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cards.map((card, index) => (
                  <TableRow key={card.employeeId}>
                    <TableCell className="font-mono text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/operators/${card.employeeId}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {card.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {card.station} · {card.shift}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {/* Capped at 150 so one outlier does not squash the
                            bar for everyone below them. */}
                        <Progress
                          value={Math.min(100, (card.percentOfExpected / 150) * 100)}
                          className="h-1.5 w-24"
                        />
                        <span className="font-mono text-sm">
                          {card.percentOfExpected}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {money(card.expectedRevenue)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {money(card.totalRevenue)}
                    </TableCell>
                    <TableCell className="text-right">
                      <TierBadge tier={card.tier} t={t} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
            {t.leaderboard.fair.tierNote}
          </p>
          <p className="text-xs text-muted-foreground">
            {t.leaderboard.fair.rawNote}
          </p>
        </CardContent>
      </Card>
    </>
  )
}
