import { FairRankingTable } from "@/components/fair-ranking-table"
import { PageShell } from "@/components/page-shell"
import { PeriodPicker } from "@/components/period-picker"
import { NoMatches } from "@/components/status"
import { Card, CardContent } from "@/components/ui/card"
import { getScorecardsForPeriod } from "@/lib/scorecards-server"
import { getT } from "@/lib/i18n/server"

export const metadata = { title: "Leaderboard" }

/**
 * One table, over a period the reader chooses.
 *
 * This page used to open with a three-card podium and three award cards, then
 * repeat the same people in a ranking below. All six restated rows already on
 * the page: the podium is now the top three rows, medalled in place, and each
 * award was "rank by this column", which is a button.
 *
 * The station/shift filter bar is deliberately absent. The ranking is built
 * from scorecards rather than the day slice, so those controls changed nothing
 * here — a filter that silently does nothing is worse than no filter, and the
 * table's own search covers finding a station.
 */
export default async function LeaderboardPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await props.searchParams
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

  const t = await getT()
  const { cards, period, availableDates } = await getScorecardsForPeriod(
    one(params.from),
    one(params.to)
  )

  return (
    <PageShell
      title={t.leaderboard.title}
      description={t.leaderboard.description}
      actions={
        // Same control as the board pack. Picking one date on both sides gives
        // a single day, which is why there is no separate single-day mode.
        availableDates.length > 0 ? (
          <PeriodPicker
            from={period.from}
            to={period.to}
            available={availableDates}
          />
        ) : null
      }
    >
      {cards.length === 0 ? (
        <NoMatches
          title={t.errors.noMatch(t.common.operators.toLowerCase())}
          description={t.errors.noMatchDesc(t.common.operators.toLowerCase())}
        />
      ) : (
        <Card>
          <CardContent>
            <FairRankingTable cards={cards} />
          </CardContent>
        </Card>
      )}
    </PageShell>
  )
}
