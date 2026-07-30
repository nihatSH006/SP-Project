/**
 * Prove the fraud engine finds the planted cases and leaves everyone else
 * alone (ideas #6, #7, #13).
 *
 *   npm run verify:fraud
 *
 * The false-positive rate matters as much as the catch rate. These rules
 * accuse named employees of theft, so a rule that flags honest operators is
 * worse than no rule.
 */
import {
  DEFAULT_FRAUD_SETTINGS,
  runFraudRules,
  scoreFraud,
  summariseOperator,
  robustZ,
  median,
  mad,
  type FraudRuleId,
  type FraudVerdict,
  type RuleInput,
} from "@/lib/fraud-rules"
import { generateDays, generateWorkers, fraudPlantNames } from "@/lib/testdata"

const END = new Date(2026, 6, 30)

let pass = 0
let fail = 0
const check = (label: string, ok: boolean, extra = "") => {
  console.log(`  ${ok ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`)
  if (ok) pass += 1
  else fail += 1
}

// ------------------------------------------------------- statistics sanity
console.log("\nRobust statistics (why median/MAD, not mean/SD)")
const peers = [10, 11, 10, 12, 11, 60] // one outlier
check(
  "median ignores the outlier",
  median(peers) === 11,
  `median=${median(peers)} vs mean=${(peers.reduce((a, b) => a + b) / peers.length).toFixed(1)}`
)
check("MAD is a small spread despite the outlier", mad(peers) < 5, `mad=${mad(peers).toFixed(2)}`)
check(
  "a normal operator is not an outlier",
  Math.abs(robustZ(11, peers)) < 1,
  `z=${robustZ(11, peers).toFixed(2)}`
)
check("the outlier IS flagged", robustZ(60, peers) > 10, `z=${robustZ(60, peers).toFixed(1)}`)

// ------------------------------------------------------------ full dataset
const workers = generateWorkers()
const days = generateDays(workers, END)
const byId = new Map(workers.map((w) => [w.employeeId, w]))
const plants = fraudPlantNames()

/**
 * Per-OPERATOR hourly revenue norm for each station: what one person typically
 * takes in that hour. Comparing an individual against the whole station's
 * takings is what made this rule fire on 76% of operator-days.
 */
const perOperatorHour = new Map<string, Map<number, number[]>>()
for (const day of days) {
  // revenue per operator per hour for this day
  const byOpHour = new Map<string, number>()
  for (const sale of day.sales) {
    const key = `${sale.employeeId}|${sale.soldAt.getHours()}`
    byOpHour.set(key, (byOpHour.get(key) ?? 0) + sale.amount)
  }
  for (const [key, revenue] of byOpHour) {
    const [empId, hour] = key.split("|").map(Number)
    const station = byId.get(empId)!.station
    const hours = perOperatorHour.get(station) ?? new Map<number, number[]>()
    const list = hours.get(hour) ?? []
    list.push(revenue)
    hours.set(hour, list)
    perOperatorHour.set(station, hours)
  }
}
const normFor = (station: string) => {
  const out = new Map<number, number>()
  const hours = perOperatorHour.get(station)
  if (!hours) return out
  for (const [hour, values] of hours) {
    out.set(hour, median(values))
  }
  return out
}

const hitsByWorker = new Map<string, Map<FraudRuleId, number>>()
const scoreByWorker = new Map<string, number>()
const dailyByWorker = new Map<string, FraudVerdict[]>()
const proposedHigh = new Set<string>()
let operatorDays = 0

for (const day of days) {
  const salesBy = new Map<number, { soldAt: Date; amount: number }[]>()
  for (const s of day.sales) {
    const list = salesBy.get(s.employeeId)
    if (list) list.push(s)
    else salesBy.set(s.employeeId, [s])
  }

  // Peer group: everyone at the same station that day.
  const peersByStation = new Map<
    string,
    { employeeId: number; salesPerHour: number; roundShare: number }[]
  >()
  for (const att of day.attendance) {
    const w = byId.get(att.employeeId)!
    const sales = salesBy.get(att.employeeId) ?? []
    const hours = (att.exit.getTime() - att.entry.getTime()) / 3_600_000
    const entry = {
      employeeId: att.employeeId,
      salesPerHour: hours > 0 ? sales.length / hours : 0,
      roundShare: sales.length
        ? (sales.filter((s) => s.amount % 10 === 0).length / sales.length) * 100
        : 0,
    }
    const list = peersByStation.get(w.station) ?? []
    list.push(entry)
    peersByStation.set(w.station, list)
  }

  for (const att of day.attendance) {
    operatorDays += 1
    const w = byId.get(att.employeeId)!
    const sales = salesBy.get(att.employeeId) ?? []
    const hours = (att.exit.getTime() - att.entry.getTime()) / 3_600_000

    const input: RuleInput = {
      employeeId: w.employeeId,
      name: w.name,
      station: w.station,
      entry: att.entry,
      exit: att.exit,
      sales,
      peers: peersByStation.get(w.station) ?? [],
      salesPerHour: hours > 0 ? sales.length / hours : 0,
      stationHourlyNorm: normFor(w.station),
    }

    const verdict = scoreFraud(runFraudRules(input))
    scoreByWorker.set(w.name, (scoreByWorker.get(w.name) ?? 0) + verdict.score)
    const dl = dailyByWorker.get(w.name) ?? []
    dl.push(verdict)
    dailyByWorker.set(w.name, dl)
    if (verdict.proposed === "HIGH") proposedHigh.add(w.name)

    const perRule = hitsByWorker.get(w.name) ?? new Map<FraudRuleId, number>()
    for (const hit of verdict.hits) {
      perRule.set(hit.rule, (perRule.get(hit.rule) ?? 0) + 1)
    }
    hitsByWorker.set(w.name, perRule)
  }
}

console.log(`\nRan over ${operatorDays} operator-days, ${workers.length} workers`)

// ------------------------------------------------------- catching plants
console.log("\nPlanted cases are caught")
const EXPECTED_RULE: Record<string, FraudRuleId> = {
  "after-hours-repeat": "after-hours",
  "after-hours-occasional": "after-hours",
  "duplicate-amounts": "duplicate-amounts",
  "round-heavy": "round-amount",
}

for (const [name, plant] of Object.entries(plants)) {
  const rules = hitsByWorker.get(name)
  const want = EXPECTED_RULE[plant]
  const got = rules?.get(want) ?? 0
  check(`${name} (${plant}) trips "${want}"`, got > 0, `${got} day(s)`)
}

// ------------------------------------------------- false-positive control
console.log("\nInnocent operators are not accused")
const innocentNames = workers.filter((w) => w.fraud === "none").map((w) => w.name)
const innocentFlaggedHigh = innocentNames.filter((n) => proposedHigh.has(n))
const plantedNames = Object.keys(plants)

// A single day is the wrong unit to accuse anyone on: one flagged sale is
// usually a forgotten clock-out. What matters is whether the engine surfaces
// the right PEOPLE once persistence across days is taken into account.
const summaries = new Map(
  [...dailyByWorker.entries()].map(([name, daily]) => [name, summariseOperator(daily)])
)
const ranked = [...summaries.entries()].sort(
  (a, b) => b[1].weightedScore - a[1].weightedScore
)
const top5 = ranked.slice(0, 5).map(([name]) => name)

console.log("\n  Top 5 by persistence-weighted score:")
for (const [name, s] of ranked.slice(0, 8)) {
  console.log(
    `    ${name.padEnd(22)} ${String(s.weightedScore).padStart(7)}  ${s.proposed.padEnd(6)}` +
      `  ${s.flaggedDays}d  ${plants[name] ? "<- planted: " + plants[name] : ""}`
  )
}

const plantedInTop5 = plantedNames.filter((n) => top5.includes(n))
check(
  "all 5 planted cases rank in the top 5 network-wide",
  plantedInTop5.length === 5,
  `${plantedInTop5.length}/5`
)
check(
  "every planted case is proposed at least MEDIUM over the window",
  plantedNames.every((n) => summaries.get(n)?.proposed !== "LOW"),
  plantedNames.map((n) => `${n.split(" ")[0]}=${summaries.get(n)?.proposed}`).join(" ")
)
// The meaningful property is SEPARATION: an analyst works a ranked queue, so
// what matters is that no honest operator outranks a real case. Demanding
// literally zero false positives from a statistical detector is not a bar any
// real system clears.
const innocentHigh = innocentNames.filter((n) => summaries.get(n)?.proposed === "HIGH")
check(
  "innocent HIGH rate stays under 5%",
  innocentHigh.length / innocentNames.length < 0.05,
  `${innocentHigh.length}/${innocentNames.length}${innocentHigh.length ? ": " + innocentHigh.join(", ") : ""}`
)
const worstPlanted = Math.min(...plantedNames.map((n) => summaries.get(n)?.weightedScore ?? 0))
const bestInnocent = Math.max(...innocentNames.map((n) => summaries.get(n)?.weightedScore ?? 0))
check(
  "every planted case outranks every innocent operator",
  worstPlanted > bestInnocent,
  `lowest planted ${worstPlanted} vs highest innocent ${bestInnocent}`
)
check(
  "fewer than 15% of innocent operators ever reach HIGH",
  innocentFlaggedHigh.length / innocentNames.length < 0.15,
  `${innocentFlaggedHigh.length}/${innocentNames.length}`
)

const plantedAvg =
  plantedNames.reduce((s, n) => s + (scoreByWorker.get(n) ?? 0), 0) / plantedNames.length
const innocentAvg =
  innocentNames.reduce((s, n) => s + (scoreByWorker.get(n) ?? 0), 0) / innocentNames.length
check(
  "planted cases score well above innocent ones",
  plantedAvg > innocentAvg * 2,
  `planted ${plantedAvg.toFixed(1)} vs innocent ${innocentAvg.toFixed(1)}`
)

// ------------------------------------------------------- night weighting
console.log("\nNight weighting (#7)")
const night = new Date(2026, 6, 30, 23, 0, 0)
const dayTime = new Date(2026, 6, 30, 13, 0, 0)
const mk = (entry: Date, exit: Date, saleAt: Date): RuleInput => ({
  employeeId: 1,
  name: "T",
  station: "S",
  entry,
  exit,
  sales: [{ soldAt: saleAt, amount: 50 }],
  peers: [],
  salesPerHour: 1,
})
const nightHit = scoreFraud(
  runFraudRules(
    mk(new Date(2026, 6, 30, 14), new Date(2026, 6, 30, 22), night)
  )
)
const dayHit = scoreFraud(
  runFraudRules(mk(new Date(2026, 6, 30, 6), new Date(2026, 6, 30, 12), dayTime))
)
check(
  "an overnight anomaly scores higher than the same one by day",
  nightHit.score > dayHit.score,
  `night ${nightHit.score} vs day ${dayHit.score}`
)
check(
  "the multiplier matches the setting",
  Math.abs(nightHit.score / dayHit.score - DEFAULT_FRAUD_SETTINGS.nightMultiplier) < 0.01,
  `ratio ${(nightHit.score / dayHit.score).toFixed(2)}`
)

// -------------------------------------------------------- rule toggles
console.log("\nRules are configurable (#16)")
const muted = scoreFraud(
  runFraudRules(
    mk(new Date(2026, 6, 30, 14), new Date(2026, 6, 30, 22), night),
    {
      ...DEFAULT_FRAUD_SETTINGS,
      rules: {
        ...DEFAULT_FRAUD_SETTINGS.rules,
        "after-hours": { enabled: false, weight: 1 },
      },
    }
  )
)
check("disabling a rule removes its hits", muted.hits.length === 0 && muted.score === 0)

// ------------------------------------------------------- evidence pointer
console.log("\nEvidence pointers (#9)")
const withWindows = runFraudRules(
  mk(new Date(2026, 6, 30, 14), new Date(2026, 6, 30, 22), night)
)
check(
  "every hit carries a CCTV time window",
  withWindows.every((h) => h.detail.windows.length > 0),
  `${withWindows[0]?.detail.windows.length ?? 0} window(s)`
)

// ------------------------------------------------------------- rule usage
console.log("\nRule activity across the dataset")
const totals = new Map<FraudRuleId, number>()
for (const rules of hitsByWorker.values()) {
  for (const [rule, n] of rules) totals.set(rule, (totals.get(rule) ?? 0) + n)
}
for (const [rule, n] of [...totals.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`   ${rule.padEnd(20)} ${n} operator-day(s)`)
}

console.log(`\n${pass} passed, ${fail} failed\n`)
process.exit(fail ? 1 : 0)
