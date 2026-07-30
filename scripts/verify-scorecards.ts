/**
 * Prove the fair leaderboard is actually fairer (idea #11).
 *
 *   npm run verify:fair
 *
 * A ranking is easy to change and hard to justify. The claim being tested is
 * specific: the old board ranked people by where they were rostered, and the
 * new one does not. So the assertions measure exactly that — how strongly rank
 * tracks the station and shift someone happens to work, which is the thing
 * nobody can influence.
 */
import {
  buildScorecards,
  mostImproved,
  tierFor,
  type ScorecardDay,
} from "@/lib/scorecards"
import { generateDays, generateWorkers } from "@/lib/testdata"

const END = new Date(2026, 6, 30)

let pass = 0
let fail = 0
const check = (label: string, ok: boolean, extra = "") => {
  console.log(`  ${ok ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`)
  if (ok) pass += 1
  else fail += 1
}

const workers = generateWorkers()
const days = generateDays(workers, END)
const byId = new Map(workers.map((w) => [w.employeeId, w]))
const names = new Map(workers.map((w) => [w.employeeId, w.name]))

// Rebuild the per-operator-day facts the scorecards need.
const rows: ScorecardDay[] = []
for (const day of days) {
  const revenueBy = new Map<number, number>()
  for (const sale of day.sales) {
    revenueBy.set(sale.employeeId, (revenueBy.get(sale.employeeId) ?? 0) + sale.amount)
  }
  for (const att of day.attendance) {
    const worker = byId.get(att.employeeId)!
    const hours = (att.exit.getTime() - att.entry.getTime()) / 3_600_000
    const revenue = revenueBy.get(att.employeeId) ?? 0
    const hour = att.entry.getHours()
    const shift = hour >= 22 || hour < 6 ? "Night" : hour < 14 ? "Morning" : "Evening"
    rows.push({
      date: day.date,
      employeeId: att.employeeId,
      station: worker.station,
      shift,
      revenue,
      attendanceScore: Math.min(100, (hours / 8) * 100),
      productivity: hours > 0 ? revenue / hours : 0,
    })
  }
}

const cards = buildScorecards(rows, names)
console.log(`\n${cards.length} operators over ${days.length} days`)

// ---------------------------------------------------------------- fairness
console.log("\nDoes rank still track where you were rostered?")

// Revenue per station, to identify the busy and quiet ends of the network.
const stationRevenue = new Map<string, number>()
for (const row of rows) {
  stationRevenue.set(row.station, (stationRevenue.get(row.station) ?? 0) + row.revenue)
}
const stationsByRevenue = [...stationRevenue.entries()].sort((a, b) => b[1] - a[1])
const busiest = stationsByRevenue[0][0]
const quietest = stationsByRevenue[stationsByRevenue.length - 1][0]

/** Spearman rank correlation, as a plain fairness measure. */
function rankCorrelation(a: number[], b: number[]): number {
  const rank = (xs: number[]) => {
    const order = xs.map((v, i) => [v, i]).sort((x, y) => y[0] - x[0])
    const out = new Array(xs.length).fill(0)
    order.forEach(([, i], r) => (out[i as number] = r))
    return out
  }
  const ra = rank(a)
  const rb = rank(b)
  const n = a.length
  const d2 = ra.reduce((sum, v, i) => sum + (v - rb[i]) ** 2, 0)
  return 1 - (6 * d2) / (n * (n * n - 1))
}

const stationTotal = cards.map((c) => stationRevenue.get(c.station) ?? 0)
const oldRank = cards.map((c) => c.totalRevenue)
const newRank = cards.map((c) => c.percentOfExpected)

const oldBias = Math.abs(rankCorrelation(oldRank, stationTotal))
const newBias = Math.abs(rankCorrelation(newRank, stationTotal))

check(
  "ranking by raw revenue tracks the station you work at",
  oldBias > 0.4,
  `correlation ${oldBias.toFixed(2)}`
)
check(
  "ranking by % of expected does NOT",
  newBias < 0.25,
  `correlation ${newBias.toFixed(2)}`
)
check(
  "the new ranking is markedly less station-biased",
  newBias < oldBias / 2,
  `${newBias.toFixed(2)} vs ${oldBias.toFixed(2)}`
)

// ------------------------------------------------------------------ shifts
console.log("\nCan a night operator place at all?")

const nightCards = cards.filter((c) => c.shift === "Night")
const topQuarter = cards.slice(0, Math.ceil(cards.length / 4))
const nightInTop = topQuarter.filter((c) => c.shift === "Night").length

check("there are night operators to rank", nightCards.length > 0, `${nightCards.length}`)
check(
  "night operators reach the top quartile",
  nightInTop > 0,
  `${nightInTop} of ${topQuarter.length}`
)

const byRawRevenue = [...cards].sort((a, b) => b.totalRevenue - a.totalRevenue)
const nightInRawTop = byRawRevenue
  .slice(0, Math.ceil(cards.length / 4))
  .filter((c) => c.shift === "Night").length
check(
  "…which raw revenue did not allow",
  nightInRawTop < nightInTop,
  `raw: ${nightInRawTop}, fair: ${nightInTop}`
)

const quietTop = topQuarter.filter((c) => c.station === quietest).length
check(
  `the quietest station (${quietest}) is represented at the top`,
  quietTop > 0,
  `${quietTop} operator(s)`
)
console.log(`    busiest: ${busiest} · quietest: ${quietest}`)

// -------------------------------------------------------------- most improved
console.log("\nMost improved")
const improved = mostImproved(cards)
check("some operators are improving", improved.length > 0, `${improved.length}`)
check(
  "improvement is measured in ratio points, not money",
  improved.every((c) => Math.abs(c.improvement) < 500),
  improved.map((c) => `${c.name} +${c.improvement}`).slice(0, 3).join(", ")
)
check(
  "a low earner can be most-improved",
  improved.some((c) => c.percentOfExpected < 115),
  "improvement is independent of absolute level"
)
check(
  "operators without a long enough window are excluded",
  improved.every((c) => c.hasImprovement && c.days >= 8),
  "no short-window operators ranked"
)

// -------------------------------------------------------------------- tiers
console.log("\nTiers")
check("tier boundaries are ordered", tierFor(130) === "exceptional" && tierFor(110) === "strong" && tierFor(100) === "expected" && tierFor(80) === "below" && tierFor(50) === "needs-support")
check(
  "most people land in the middle, not at an extreme",
  cards.filter((c) => c.tier === "expected" || c.tier === "strong").length >
    cards.length * 0.3,
  `${cards.filter((c) => c.tier === "expected" || c.tier === "strong").length}/${cards.length}`
)
// A scale on which almost everyone fails is measuring the scale, not the people.
check(
  "the scale does not condemn most of the workforce",
  cards.filter((c) => c.tier === "needs-support").length < cards.length * 0.15,
  `${cards.filter((c) => c.tier === "needs-support").length}/${cards.length} flagged`
)

const spread = cards[0].percentOfExpected - cards[cards.length - 1].percentOfExpected
check("the scale still separates people", spread > 20, `${spread.toFixed(1)} point spread`)

console.log("\nTop 5 (fair)")
for (const c of cards.slice(0, 5)) {
  console.log(
    `   ${String(c.percentOfExpected).padStart(6)}%  ${c.name.padEnd(22)} ${c.station.padEnd(18)} ${c.shift}`
  )
}
console.log("Top 5 (raw revenue, for contrast)")
for (const c of byRawRevenue.slice(0, 5)) {
  console.log(
    `   ${String(c.totalRevenue).padStart(6)}   ${c.name.padEnd(22)} ${c.station.padEnd(18)} ${c.shift}`
  )
}

console.log(`\n${pass} passed, ${fail} failed\n`)
process.exit(fail ? 1 : 0)
