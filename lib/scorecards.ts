/**
 * Fair performance scoring (idea #11).
 *
 * The old leaderboard ranked by raw revenue, which does not measure how well
 * anyone works. It measures where they were rostered. An operator on a busy
 * highway forecourt outsold a regional colleague every single day no matter
 * what either of them did, and the night shift could never place at all —
 * there simply are not enough customers between 22:00 and 06:00.
 *
 * So nobody is compared against the network. Everyone is compared against what
 * their OWN context normally produces: same station, same shift. The number
 * that ranks people is the ratio between what they took and what that slot
 * typically takes, which is a quantity a person can actually influence.
 *
 * Two deliberate choices:
 *
 * 1. Expectations are MEDIANS, not means. One exceptional day by one colleague
 *    would otherwise raise the bar everyone else is judged against.
 * 2. A peer group that is too small to be meaningful is widened rather than
 *    used. Comparing a lone night operator against "their peer group" of one
 *    would score everyone exactly 100% and quietly say nothing.
 */

export type ScorecardDay = {
  date: string
  employeeId: number
  station: string
  shift: string
  revenue: number
  attendanceScore: number
  productivity: number
}

export type Scorecard = {
  employeeId: number
  name: string
  station: string
  /** Shift they worked most often in the window. */
  shift: string
  days: number
  totalRevenue: number
  /** Mean of their daily revenue ÷ what that slot normally takes, as a %. */
  percentOfExpected: number
  /** What the median day in their slots would have produced. */
  expectedRevenue: number
  attendanceAvg: number
  productivityAvg: number
  /**
   * Change between the first and second half of the window, in percentage
   * points of `percentOfExpected`. Computed on ratios, not raw money, so
   * improving from a quiet station counts the same as improving from a busy
   * one — otherwise "most improved" just finds the busiest forecourt again.
   */
  improvement: number
  /**
   * The two halves the improvement is the difference between. Stored so the
   * UI can say "104% -> 132%" rather than "+28 points" — a point is a unit
   * nobody outside this codebase should have to learn, and writing it as a
   * percentage instead would be wrong: a rise from 80 to 108 is 28 points but
   * a 35% increase.
   */
  improvedFrom: number
  improvedTo: number
  /** Null when the window is too short to split in two honestly. */
  hasImprovement: boolean
  tier: Tier
}

/**
 * Bands, not a pass/fail line. The wording matters: this data is about people,
 * and "below expected" is a prompt to ask why — a broken pump, a new starter,
 * a slot whose expectation is simply wrong — not a verdict about effort.
 */
export type Tier = "exceptional" | "strong" | "expected" | "below" | "needs-support"

export function tierFor(percentOfExpected: number): Tier {
  if (percentOfExpected >= 125) return "exceptional"
  if (percentOfExpected >= 108) return "strong"
  if (percentOfExpected >= 92) return "expected"
  if (percentOfExpected >= 75) return "below"
  return "needs-support"
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const mean = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0

/** Below this, a peer group is too thin to judge anyone against. */
const MIN_PEER_SAMPLES = 5

export function buildScorecards(
  days: ScorecardDay[],
  names: Map<number, string>
): Scorecard[] {
  // ---- expectations, from most specific context to least.
  const byStationShift = new Map<string, number[]>()
  const byStation = new Map<string, number[]>()
  const all: number[] = []

  for (const day of days) {
    const key = `${day.station}|${day.shift}`
    byStationShift.set(key, [...(byStationShift.get(key) ?? []), day.revenue])
    byStation.set(day.station, [...(byStation.get(day.station) ?? []), day.revenue])
    all.push(day.revenue)
  }

  const expectations = new Map<string, number>()
  const globalMedian = median(all)

  const expectedFor = (station: string, shift: string): number => {
    const key = `${station}|${shift}`
    const cached = expectations.get(key)
    if (cached !== undefined) return cached

    const exact = byStationShift.get(key) ?? []
    // Widen the group rather than trust a handful of days: a lone operator
    // compared against themselves scores 100% forever and says nothing.
    const sample =
      exact.length >= MIN_PEER_SAMPLES
        ? exact
        : (byStation.get(station) ?? []).length >= MIN_PEER_SAMPLES
          ? byStation.get(station)!
          : all

    const value = median(sample) || globalMedian
    expectations.set(key, value)
    return value
  }

  // ---- per operator
  const byOperator = new Map<number, ScorecardDay[]>()
  for (const day of days) {
    byOperator.set(day.employeeId, [...(byOperator.get(day.employeeId) ?? []), day])
  }

  const cards: Scorecard[] = []
  for (const [employeeId, operatorDays] of byOperator) {
    const sorted = [...operatorDays].sort((a, b) => a.date.localeCompare(b.date))

    const ratios = sorted.map((day) => {
      const expected = expectedFor(day.station, day.shift)
      return expected > 0 ? (day.revenue / expected) * 100 : 100
    })

    // Most-frequent shift, for display only — scoring always uses the shift
    // actually worked on each day.
    const shiftCounts = new Map<string, number>()
    for (const day of sorted) {
      shiftCounts.set(day.shift, (shiftCounts.get(day.shift) ?? 0) + 1)
    }
    const shift =
      [...shiftCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Morning"

    // Improvement needs enough days on both sides to mean anything.
    const hasImprovement = sorted.length >= 8
    let improvement = 0
    let improvedFrom = 0
    let improvedTo = 0
    if (hasImprovement) {
      const split = Math.floor(ratios.length / 2)
      improvedFrom = mean(ratios.slice(0, split))
      improvedTo = mean(ratios.slice(split))
      improvement = improvedTo - improvedFrom
    }

    const percentOfExpected = Math.round(mean(ratios) * 10) / 10

    cards.push({
      employeeId,
      name: names.get(employeeId) ?? `#${employeeId}`,
      station: sorted[sorted.length - 1].station,
      shift,
      days: sorted.length,
      totalRevenue: Math.round(sorted.reduce((sum, d) => sum + d.revenue, 0)),
      percentOfExpected,
      expectedRevenue: Math.round(
        mean(sorted.map((d) => expectedFor(d.station, d.shift)))
      ),
      attendanceAvg: Math.round(mean(sorted.map((d) => d.attendanceScore)) * 10) / 10,
      productivityAvg: Math.round(mean(sorted.map((d) => d.productivity)) * 10) / 10,
      improvement: Math.round(improvement * 10) / 10,
      improvedFrom: Math.round(improvedFrom),
      improvedTo: Math.round(improvedTo),
      hasImprovement,
      tier: tierFor(percentOfExpected),
    })
  }

  return cards.sort((a, b) => b.percentOfExpected - a.percentOfExpected)
}

/** Biggest climbers. Only operators with a long enough window qualify. */
export function mostImproved(cards: Scorecard[], limit = 5): Scorecard[] {
  return cards
    .filter((c) => c.hasImprovement && c.improvement > 0)
    .sort((a, b) => b.improvement - a.improvement)
    .slice(0, limit)
}
