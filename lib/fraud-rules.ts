/**
 * Named fraud-rule engine (ideas #6, #7, #13).
 *
 * SASIS previously had a single heuristic — "a sale outside the operator's
 * working hours" — which produced an unexplainable verdict: this person "looks
 * suspicious". This replaces it with an auditable library of NAMED rules, so
 * the output becomes evidence: "tripped 4 named rules on 3 separate nights".
 *
 * Every rule here runs on the data already imported — operator, timestamp,
 * amount, and the shift window. Nothing needs litres, payment method or POS
 * event codes; those unlock further rules later (see docs/IDEAS-SIMPLE.md #10,
 * #13 in the full list).
 *
 * Two design decisions worth keeping:
 *
 * 1. Rules score, they do not accuse. Each hit carries a severity and a plain
 *    explanation, and a supervisor reviews before anything hardens into a HIGH
 *    risk verdict against a named employee.
 *
 * 2. Statistics are ROBUST. With ~8 operators per station, a single outlier
 *    drags a mean badly, so peer comparisons use median and MAD rather than
 *    mean and standard deviation. Otherwise one genuinely great day makes
 *    everyone else look like a thief.
 */

import type { Settings } from "@/lib/settings"

export type FraudRuleId =
  | "after-hours"
  | "late-close"
  | "shift-end-burst"
  | "duplicate-amounts"
  | "velocity-outlier"
  | "round-amount"
  | "dead-hours"

export type RuleSeverity = "low" | "medium" | "high"

/**
 * What a rule is actually evidence OF. This distinction is load-bearing.
 *
 * `integrity`     — points at possible dishonesty. Feeds the fraud score.
 * `operational`   — points at a broken pump, an unmanned forecourt or a
 *                   coverage gap. Real and worth showing, but accusing someone
 *                   of theft because their dispenser died is exactly the
 *                   injustice this system must not commit. Scores zero.
 * `corroborating` — too weak to stand alone; only scores on a day when an
 *                   integrity rule also fired.
 *
 * Without this split, persistence weighting made things worse rather than
 * better: an honest operator whose pump was slow on 18 days out-ranked a
 * genuine repeat offender, because low-grade noise repeated more often than
 * real fraud did.
 */
export type RuleCategory = "integrity" | "operational" | "corroborating"

export const RULE_CATEGORY: Record<FraudRuleId, RuleCategory> = {
  "after-hours": "integrity",
  "late-close": "integrity",
  "shift-end-burst": "integrity",
  "duplicate-amounts": "integrity",
  "round-amount": "integrity",
  "velocity-outlier": "corroborating",
  "dead-hours": "operational",
}

export type RuleHit = {
  rule: FraudRuleId
  severity: RuleSeverity
  /** How many events tripped it. */
  count: number
  /** Weighted contribution to the operator's suspicion score. */
  score: number
  /** Machine-readable detail for the UI to render and translate. */
  detail: {
    /** Time windows to pull on CCTV — the evidence pointer (idea #9). */
    windows: { from: number; to: number }[]
    /** Free numbers a rule wants to show, e.g. the offending amount. */
    values?: number[]
    /** What "normal" looked like, so a supervisor can judge the gap. */
    baseline?: number
    observed?: number
  }
  /** True when the events fell in the overnight window (idea #7). */
  overnight: boolean
  category: RuleCategory
}

export type RuleConfig = {
  enabled: boolean
  /** Multiplier on this rule's contribution; 0 mutes it without disabling. */
  weight: number
}

export type FraudSettings = {
  rules: Record<FraudRuleId, RuleConfig>
  /** Multiplier applied to hits landing between nightFrom and nightTo. */
  nightMultiplier: number
  nightFrom: number
  nightTo: number
  /** Minutes after clock-out still treated as "late close" rather than fraud. */
  lateCloseGraceMinutes: number
  /** Identical amounts within this window count as a burst. */
  duplicateWindowMinutes: number
  duplicateMinCount: number
  /** Robust z-score beyond which sales pace is an outlier. */
  velocityZThreshold: number
  /** Percentage points above the station's round-amount share to flag. */
  roundAmountExcess: number
  /** An hour below this share of the per-operator norm is "dead". */
  deadHourShare: number
  /** Ignore hours whose per-operator norm is below this (naturally quiet). */
  deadHourMinNorm: number
  /** Only report when this many dead hours pile up in one shift. */
  deadHourMinRun: number
  /** Suspicion score at which an operator is proposed as HIGH risk. */
  highRiskScore: number
  mediumRiskScore: number
}

export const DEFAULT_FRAUD_SETTINGS: FraudSettings = {
  rules: {
    "after-hours": { enabled: true, weight: 1 },
    "late-close": { enabled: true, weight: 0.6 },
    "shift-end-burst": { enabled: true, weight: 0.8 },
    "duplicate-amounts": { enabled: true, weight: 1 },
    "velocity-outlier": { enabled: true, weight: 0.5 },
    "round-amount": { enabled: true, weight: 0.5 },
    "dead-hours": { enabled: true, weight: 0.7 },
  },
  nightMultiplier: 2,
  nightFrom: 22,
  nightTo: 6,
  lateCloseGraceMinutes: 15,
  duplicateWindowMinutes: 30,
  duplicateMinCount: 5,
  velocityZThreshold: 4.5,
  roundAmountExcess: 25,
  deadHourShare: 0.1,
  deadHourMinNorm: 150,
  deadHourMinRun: 2,
  highRiskScore: 6,
  mediumRiskScore: 2.5,
}

const SEVERITY_SCORE: Record<RuleSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
}

// --------------------------------------------------------------- statistics

/** Median — the robust centre. */
export function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * Median absolute deviation, scaled to be comparable with a standard
 * deviation. Unlike SD, one extreme value cannot inflate it — which matters at
 * 8 operators per station.
 */
export function mad(values: number[]): number {
  if (values.length === 0) return 0
  const m = median(values)
  return 1.4826 * median(values.map((v) => Math.abs(v - m)))
}

/** Robust z-score. Returns 0 when the peer group is too uniform to judge. */
export function robustZ(value: number, peers: number[]): number {
  const spread = mad(peers)
  if (spread === 0) return 0
  return (value - median(peers)) / spread
}

// -------------------------------------------------------------------- input

export type RuleInput = {
  employeeId: number
  name: string
  station: string
  entry: Date
  exit: Date
  sales: { soldAt: Date; amount: number }[]
  /** Every operator at the same station that day, for peer comparison. */
  peers: {
    employeeId: number
    salesPerHour: number
    roundShare: number
  }[]
  /** This operator's own sales-per-hour, precomputed. */
  salesPerHour: number
  /**
   * Typical revenue for ONE operator at this station in each hour.
   * Must be per-operator, not per-station: comparing one person's hour against
   * the whole forecourt's takings marks almost everybody "dead".
   */
  stationHourlyNorm?: Map<number, number>
}

const isRound = (amount: number) => amount % 10 === 0

function inNightWindow(d: Date, s: FraudSettings): boolean {
  const h = d.getHours()
  return s.nightFrom > s.nightTo
    ? h >= s.nightFrom || h < s.nightTo
    : h >= s.nightFrom && h < s.nightTo
}

// -------------------------------------------------------------------- rules

/**
 * Run every enabled rule against one operator-day.
 * Pure and synchronous, so it can run at import time or on demand.
 */
export function runFraudRules(
  input: RuleInput,
  settings: FraudSettings = DEFAULT_FRAUD_SETTINGS
): RuleHit[] {
  const hits: RuleHit[] = []
  const { rules } = settings

  const push = (
    rule: FraudRuleId,
    severity: RuleSeverity,
    count: number,
    detail: RuleHit["detail"],
    overnight: boolean
  ) => {
    const config = rules[rule]
    if (!config?.enabled || count === 0) return
    const nightFactor = overnight ? settings.nightMultiplier : 1
    hits.push({
      rule,
      severity,
      count,
      score: SEVERITY_SCORE[severity] * config.weight * nightFactor,
      detail,
      overnight,
      category: RULE_CATEGORY[rule],
    })
  }

  const graceMs = settings.lateCloseGraceMinutes * 60_000

  // ---- 6.0 after-hours: the original rule, now one of many ---------------
  const afterHours = input.sales.filter(
    (s) =>
      s.soldAt < input.entry ||
      s.soldAt.getTime() > input.exit.getTime() + graceMs
  )
  if (afterHours.length) {
    push(
      "after-hours",
      afterHours.length >= 2 ? "high" : "medium",
      afterHours.length,
      {
        windows: afterHours.map((s) => ({
          from: s.soldAt.getTime() - 120_000,
          to: s.soldAt.getTime() + 120_000,
        })),
        values: afterHours.map((s) => s.amount),
      },
      afterHours.some((s) => inNightWindow(s.soldAt, settings))
    )
  }

  // ---- 6.1 late close: transacting past clock-out, as a habit ------------
  const lateCloses = input.sales.filter(
    (s) =>
      s.soldAt.getTime() > input.exit.getTime() &&
      s.soldAt.getTime() <= input.exit.getTime() + graceMs
  )
  if (lateCloses.length) {
    push(
      "late-close",
      "low",
      lateCloses.length,
      {
        windows: [
          {
            from: input.exit.getTime(),
            to: input.exit.getTime() + graceMs,
          },
        ],
        values: lateCloses.map((s) => s.amount),
      },
      inNightWindow(input.exit, settings)
    )
  }

  // ---- 6.2 shift-end burst: fraud clusters where oversight is lowest -----
  const lastThirty = input.sales.filter(
    (s) =>
      s.soldAt.getTime() >= input.exit.getTime() - 30 * 60_000 &&
      s.soldAt.getTime() <= input.exit.getTime()
  )
  const shiftHours =
    (input.exit.getTime() - input.entry.getTime()) / 3_600_000
  const expectedInHalfHour = shiftHours > 0 ? input.sales.length / (shiftHours * 2) : 0
  if (expectedInHalfHour > 0 && lastThirty.length >= Math.max(4, expectedInHalfHour * 3)) {
    push(
      "shift-end-burst",
      "medium",
      lastThirty.length,
      {
        windows: [
          { from: input.exit.getTime() - 30 * 60_000, to: input.exit.getTime() },
        ],
        baseline: Math.round(expectedInHalfHour * 10) / 10,
        observed: lastThirty.length,
      },
      inNightWindow(input.exit, settings)
    )
  }

  // ---- 6.3 duplicate amounts: replayed or fabricated sales ---------------
  const windowMs = settings.duplicateWindowMinutes * 60_000
  const byAmount = new Map<number, Date[]>()
  for (const s of input.sales) {
    const list = byAmount.get(s.amount)
    if (list) list.push(s.soldAt)
    else byAmount.set(s.amount, [s.soldAt])
  }
  const bursts: { from: number; to: number }[] = []
  const burstAmounts: number[] = []
  for (const [amount, times] of byAmount) {
    if (times.length < settings.duplicateMinCount) continue
    const sorted = times.map((t) => t.getTime()).sort((a, b) => a - b)
    for (let i = 0; i + settings.duplicateMinCount - 1 < sorted.length; i++) {
      const j = i + settings.duplicateMinCount - 1
      if (sorted[j] - sorted[i] <= windowMs) {
        bursts.push({ from: sorted[i] - 60_000, to: sorted[j] + 60_000 })
        burstAmounts.push(amount)
        break
      }
    }
  }
  if (bursts.length) {
    push(
      "duplicate-amounts",
      "high",
      bursts.length,
      { windows: bursts, values: burstAmounts },
      bursts.some((b) => inNightWindow(new Date(b.from), settings))
    )
  }

  // ---- 6.4 velocity outlier vs same-station peers ------------------------
  const peerRates = input.peers
    .filter((p) => p.employeeId !== input.employeeId)
    .map((p) => p.salesPerHour)
  // A peer group that barely varies produces a near-zero MAD, which turns any
  // ordinary difference into a huge z-score. Require real spread before judging.
  const rateSpread = mad(peerRates)
  const rateCentre = median(peerRates)
  if (peerRates.length >= 3 && rateSpread >= rateCentre * 0.1) {
    const z = robustZ(input.salesPerHour, peerRates)
    if (Math.abs(z) >= settings.velocityZThreshold) {
      push(
        "velocity-outlier",
        Math.abs(z) >= settings.velocityZThreshold * 1.5 ? "medium" : "low",
        1,
        {
          windows: [
            { from: input.entry.getTime(), to: input.exit.getTime() },
          ],
          baseline: Math.round(median(peerRates) * 100) / 100,
          observed: Math.round(input.salesPerHour * 100) / 100,
        },
        inNightWindow(input.entry, settings)
      )
    }
  }

  // ---- 6.5 round-amount fingerprint --------------------------------------
  // Deliberately compared to the STATION's own norm, not to Benford's law:
  // fixed tariff prices and a cash culture of "fill it for 20 manat" make
  // round amounts legitimately common here, so absolute tests flag everyone.
  if (input.sales.length >= 10) {
    const share = (input.sales.filter((s) => isRound(s.amount)).length / input.sales.length) * 100
    const peerShares = input.peers
      .filter((p) => p.employeeId !== input.employeeId)
      .map((p) => p.roundShare)
    if (peerShares.length >= 3) {
      const norm = median(peerShares)
      if (share - norm >= settings.roundAmountExcess) {
        push(
          "round-amount",
          share - norm >= settings.roundAmountExcess * 1.6 ? "medium" : "low",
          1,
          {
            windows: [
              { from: input.entry.getTime(), to: input.exit.getTime() },
            ],
            baseline: Math.round(norm),
            observed: Math.round(share),
          },
          inNightWindow(input.entry, settings)
        )
      }
    }
  }

  // ---- #13 dead hours: staffed and open, but nothing rung up -------------
  // One rule, three possible causes: a broken pump, an unmanned forecourt, or
  // sales not being rung up at all. The UI must offer all three, so an honest
  // operator with a dead dispenser is not branded a thief.
  if (input.stationHourlyNorm && input.stationHourlyNorm.size > 0) {
    const byHour = new Map<number, number>()
    for (const s of input.sales) {
      const h = s.soldAt.getHours()
      byHour.set(h, (byHour.get(h) ?? 0) + s.amount)
    }

    const deadWindows: { from: number; to: number }[] = []
    for (
      let t = new Date(input.entry);
      t < input.exit;
      t.setHours(t.getHours() + 1)
    ) {
      const hour = t.getHours()
      const norm = input.stationHourlyNorm.get(hour) ?? 0
      // Skip hours the station is normally quiet anyway: a dead 04:00 at a
      // regional site is the timetable, not a missing pump.
      if (norm < settings.deadHourMinNorm) continue
      const actual = byHour.get(hour) ?? 0
      if (actual < norm * settings.deadHourShare) {
        const from = new Date(t)
        from.setMinutes(0, 0, 0)
        deadWindows.push({
          from: from.getTime(),
          to: from.getTime() + 3_600_000,
        })
      }
    }

    if (deadWindows.length >= settings.deadHourMinRun) {
      push(
        "dead-hours",
        deadWindows.length >= 3 ? "medium" : "low",
        deadWindows.length,
        { windows: deadWindows },
        deadWindows.some((w) => inNightWindow(new Date(w.from), settings))
      )
    }
  }

  return hits
}

export type FraudVerdict = {
  hits: RuleHit[]
  /** Operational findings, surfaced separately from any accusation. */
  operational?: RuleHit[]
  /** Weighted sum across all hits. */
  score: number
  /** Risk this engine PROPOSES; a supervisor confirms it (idea #8). */
  proposed: "LOW" | "MEDIUM" | "HIGH"
}

export function scoreFraud(
  hits: RuleHit[],
  settings: FraudSettings = DEFAULT_FRAUD_SETTINGS
): FraudVerdict {
  // Only integrity rules accuse. Operational findings (a dead hour) are
  // reported but never count against a person, and corroborating signals only
  // count on a day when something substantive already fired.
  const hasIntegrity = hits.some((h) => h.category === "integrity")
  const score =
    Math.round(
      hits.reduce((sum, h) => {
        if (h.category === "operational") return sum
        if (h.category === "corroborating" && !hasIntegrity) return sum
        return sum + h.score
      }, 0) * 100
    ) / 100
  const proposed =
    score >= settings.highRiskScore
      ? "HIGH"
      : score >= settings.mediumRiskScore
        ? "MEDIUM"
        : "LOW"
  return {
    hits,
    operational: hits.filter((h) => h.category === "operational"),
    score,
    proposed,
  }
}

/** Combine the fraud verdict with attendance-based risk from settings. */
export function combineRisk(
  fraud: FraudVerdict["proposed"],
  attendanceScore: number,
  settings: Settings
): "LOW" | "MEDIUM" | "HIGH" {
  if (fraud === "HIGH" || attendanceScore < settings.riskHighAttendance) {
    return "HIGH"
  }
  if (fraud === "MEDIUM" || attendanceScore < settings.riskMediumAttendance) {
    return "MEDIUM"
  }
  return "LOW"
}

// ------------------------------------------------------------- persistence

/**
 * Roll a series of daily verdicts into one judgement about a person.
 *
 * A single flagged sale is usually a mistake: a forgotten clock-out, a late
 * customer, a clock skew. The same rule firing on many separate days is a
 * pattern. So a per-day score alone is the wrong unit for accusing anyone —
 * it either sets the bar so low that honest staff get caught, or so high that
 * a persistent small-scale thief never trips it.
 *
 * The loss-prevention research is explicit about this: require multi-day
 * persistence before escalating. That is what this adds.
 */
export type OperatorFraudSummary = {
  /** Sum of every daily score in the window. */
  totalScore: number
  /** Days on which at least one rule fired. */
  flaggedDays: number
  /** Distinct rules tripped across the window. */
  rulesTripped: FraudRuleId[]
  /** Days each rule fired on — repetition is the signal. */
  repeatsByRule: Record<string, number>
  /** Score after the persistence multiplier. */
  weightedScore: number
  proposed: "LOW" | "MEDIUM" | "HIGH"
}

export function summariseOperator(
  daily: FraudVerdict[],
  settings: FraudSettings = DEFAULT_FRAUD_SETTINGS
): OperatorFraudSummary {
  const repeatsByRule: Record<string, number> = {}
  let totalScore = 0
  let flaggedDays = 0

  for (const day of daily) {
    totalScore += day.score
    if (day.hits.some((h) => h.category === "integrity")) flaggedDays += 1
    const seen = new Set<FraudRuleId>()
    for (const hit of day.hits) {
      // ONLY integrity rules build persistence.
      //
      // Repeated equipment problems are not repeated dishonesty, and a
      // corroborating signal that contributed nothing to the score must not
      // silently double it here. Counting them cost the network's best
      // operator a HIGH-risk flag: his sales pace tripped `velocity-outlier`
      // on seven days — scoring zero every time, correctly — and those seven
      // zero-score hits doubled his multiplier. Being excellent looked like
      // being a thief.
      if (hit.category !== "integrity") continue
      if (seen.has(hit.rule)) continue
      seen.add(hit.rule)
      repeatsByRule[hit.rule] = (repeatsByRule[hit.rule] ?? 0) + 1
    }
  }

  // Persistence multiplier: the most-repeated rule drives it, so tripping one
  // rule on six days outweighs tripping six rules once.
  const maxRepeat = Math.max(0, ...Object.values(repeatsByRule))
  const persistence = maxRepeat >= 5 ? 2 : maxRepeat >= 3 ? 1.5 : 1
  const weightedScore = Math.round(totalScore * persistence * 100) / 100

  const proposed =
    weightedScore >= settings.highRiskScore * 2
      ? "HIGH"
      : weightedScore >= settings.mediumRiskScore * 2
        ? "MEDIUM"
        : "LOW"

  return {
    totalScore: Math.round(totalScore * 100) / 100,
    flaggedDays,
    rulesTripped: Object.keys(repeatsByRule) as FraudRuleId[],
    repeatsByRule,
    weightedScore,
    proposed,
  }
}
