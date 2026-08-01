"use client"

import * as React from "react"
import Link from "next/link"
import {
  IconBolt,
  IconClockHour4,
  IconCoin,
  IconMedal,
  IconSearch,
  IconTargetArrow,
  IconTrendingUp,
  IconX,
} from "@tabler/icons-react"

import { useT } from "@/components/i18n-provider"
import {
  PageSizeSelect,
  TablePagination,
  usePaging,
} from "@/components/table-pager"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
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
import type { Scorecard, Tier } from "@/lib/scorecards"
import { cn } from "@/lib/utils"

/**
 * Starts at 20 rather than 50: a leaderboard is read from the top, while the
 * roster list is scanned for a particular name. Different reading, different
 * default.
 */
const PAGE_SIZES = [20, 100, 150] as const

/** What the ranking can be ordered by. All descending — best first. */
type Basis =
  | "percentOfExpected"
  | "totalRevenue"
  | "productivityAvg"
  | "attendanceAvg"
  | "improvement"

/**
 * First three places, tinted and medalled in the table itself.
 *
 * Keyed on RANK, not row position, so filtering to one station does not crown
 * whoever happens to be at the top of the filtered list. It also means the
 * podium follows whichever measure is selected — the revenue leader gets gold
 * when ranking by revenue, and loses it when ranking by improvement.
 */
const PODIUM_ROW = [
  "bg-amber-400/[0.07] hover:bg-amber-400/[0.1]",
  "bg-zinc-300/[0.05] hover:bg-zinc-300/[0.08]",
  "bg-orange-700/[0.07] hover:bg-orange-700/[0.1]",
]
const MEDAL_TINT = ["text-amber-600 dark:text-amber-400", "text-zinc-300", "text-orange-600"]

const TIER_STYLE: Record<Tier, string> = {
  exceptional: "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  strong: "border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  expected: "border-border bg-muted/40 text-muted-foreground",
  below: "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  // Not red. This band is a prompt to go and ask why, and colouring it like a
  // fraud alert would tell every manager to read it as one.
  "needs-support": "border-orange-500/35 bg-orange-500/10 text-orange-700 dark:text-orange-300",
}

function TierBadge({ tier, t }: { tier: Tier; t: Dictionary }) {
  return (
    <Badge variant="outline" className={cn("font-normal", TIER_STYLE[tier])}>
      {t.leaderboard.fair.tiers[tier]}
    </Badge>
  )
}

/**
 * The whole leaderboard as one table.
 *
 * Two things it gets right that a plain sorted list would not:
 *
 * 1. The number in the first column is the operator's RANK, not the row's
 *    position. Searching for one person shows "#34", which is the fact
 *    somebody searching wants; renumbering the filtered rows 1, 2, 3 would
 *    invent a standing that does not exist.
 * 2. Ranks are computed over everyone before filtering, so they do not shift
 *    as you type.
 *
 * The separate "most improved" card is gone: it was the same people ranked by
 * one of the columns already here, so it is a choice in the selector instead.
 */
export function FairRankingTable({ cards }: { cards: Scorecard[] }) {
  const t = useT()
  const [query, setQuery] = React.useState("")
  const [basis, setBasis] = React.useState<Basis>("percentOfExpected")

  // Ranked over the FULL set, so a rank means the same thing no matter what is
  // typed in the search box.
  const ranked = React.useMemo(() => {
    const sorted = [...cards].sort((a, b) => b[basis] - a[basis])
    return sorted.map((card, index) => ({ ...card, rank: index + 1 }))
  }, [cards, basis])

  // Filtered as you type — no debounce. The ranking is already in memory, so
  // waiting would only add latency to a local search.
  const matches = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return ranked
    return ranked.filter((c) =>
      `${c.name} ${c.station} ${c.shift}`.toLowerCase().includes(needle)
    )
  }, [ranked, query])

  const paging = usePaging(matches.length, PAGE_SIZES)
  const rows = matches.slice(paging.start, paging.start + paging.pageSize)

  const bases: {
    value: Basis
    label: string
    icon: React.ComponentType<{ className?: string }>
  }[] = [
    {
      value: "percentOfExpected",
      label: t.leaderboard.fair.percentOfExpected,
      icon: IconTargetArrow,
    },
    { value: "totalRevenue", label: t.common.revenue, icon: IconCoin },
    {
      value: "productivityAvg",
      label: t.common.productivity,
      icon: IconBolt,
    },
    {
      value: "attendanceAvg",
      label: t.common.attendance,
      icon: IconClockHour4,
    },
    {
      value: "improvement",
      label: t.leaderboard.fair.improvement,
      icon: IconTrendingUp,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Buttons rather than a dropdown: there are five, they are the
            page's main control, and a segmented row shows every option at once
            instead of hiding four behind a click. */}
        <ButtonGroup aria-label={t.leaderboard.fair.rankBy}>
          {bases.map((b) => (
            <Button
              key={b.value}
              size="sm"
              variant={basis === b.value ? "default" : "outline"}
              aria-pressed={basis === b.value}
              onClick={() => {
                setBasis(b.value)
                // Rank 1 under one measure is rank 40 under another; staying on
                // page 3 would land somewhere meaningless.
                paging.reset()
              }}
            >
              <b.icon className="size-4" />
              <span className="hidden sm:inline">{b.label}</span>
            </Button>
          ))}
        </ButtonGroup>

        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          <InputGroup className="w-full sm:w-64">
            <InputGroupAddon>
              <IconSearch />
            </InputGroupAddon>
            <InputGroupInput
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                paging.reset()
              }}
              placeholder={t.operators.searchPlaceholder}
              aria-label={t.common.search}
            />
            {query ? (
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  size="icon-xs"
                  variant="ghost"
                  aria-label={t.operators.clearSearch}
                  onClick={() => {
                    setQuery("")
                    paging.reset()
                  }}
                >
                  <IconX />
                </InputGroupButton>
              </InputGroupAddon>
            ) : null}
          </InputGroup>

          <PageSizeSelect
            id="ranking-per-page"
            value={paging.pageSize}
            sizes={PAGE_SIZES}
            onChange={paging.setPageSize}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>{t.common.operators}</TableHead>
              <TableHead>{t.leaderboard.fair.percentOfExpected}</TableHead>
              <TableHead className="text-right">{t.common.revenue}</TableHead>
              <TableHead className="text-right">
                {t.common.productivity}
              </TableHead>
              <TableHead className="text-right">
                {t.common.attendance}
              </TableHead>
              <TableHead className="text-right">
                {t.leaderboard.fair.improvement}
              </TableHead>
              <TableHead className="text-right">
                {t.leaderboard.fair.tierLabel}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((card) => (
              <TableRow
                key={card.employeeId}
                className={cn(card.rank <= 3 && PODIUM_ROW[card.rank - 1])}
              >
                <TableCell className="font-mono tabular-nums">
                  <span className="flex items-center gap-1.5">
                    {card.rank <= 3 ? (
                      <IconMedal
                        className={cn("size-4", MEDAL_TINT[card.rank - 1])}
                      />
                    ) : null}
                    <span
                      className={
                        card.rank <= 3
                          ? "font-semibold"
                          : "text-muted-foreground"
                      }
                    >
                      {card.rank}
                    </span>
                  </span>
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
                    {/* Capped at 150% so one outlier does not squash the bar
                        for everyone below them. */}
                    <div
                      className="h-1.5 w-20 overflow-hidden rounded-full bg-muted"
                      role="presentation"
                    >
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${Math.min(100, (card.percentOfExpected / 150) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="font-mono text-sm tabular-nums">
                      {card.percentOfExpected}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {money(card.totalRevenue)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {money(card.productivityAvg)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {card.attendanceAvg}%
                </TableCell>
                <TableCell className="text-right font-mono text-sm tabular-nums">
                  {/* From -> to, never "+N points": a point is a unit nobody
                      should have to learn, and calling the delta a percentage
                      would misstate it. */}
                  {card.hasImprovement ? (
                    <>
                      <span className="text-muted-foreground">
                        {card.improvedFrom}%
                      </span>
                      <span className="mx-1 text-muted-foreground">→</span>
                      <span
                        className={
                          card.improvement > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : card.improvement < 0
                              ? "text-amber-600 dark:text-amber-400"
                              : ""
                        }
                      >
                        {card.improvedTo}%
                      </span>
                    </>
                  ) : (
                    // Too few days to split the window in two honestly.
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <TierBadge tier={card.tier} t={t} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        page={paging.page}
        totalPages={paging.totalPages}
        total={matches.length}
        start={paging.start}
        pageSize={paging.pageSize}
        onPage={paging.setPage}
      />
    </div>
  )
}
