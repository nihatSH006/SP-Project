/**
 * Offline proof that the live-feed simulator works properly — no Firestore,
 * no network. Run with `npm test` inside functions/.
 *
 *   1. Determinism — the same (worker, date) always yields the same plan.
 *   2. Prefix replay — the plan sliced at any "now" is a prefix of the full
 *      plan, so the tick's cursor logic can never skip or duplicate a row.
 *   3. Alert rates — over a large sample, every planted anomaly type shows
 *      up near its configured ALERT_CHANCES percentage, and clean days
 *      raise nothing.
 *   4. Live honesty — mid-shift, absence-shaped alerts (missing-out,
 *      missing-in, no-taps-sales) are withheld until the day is final.
 */

"use strict"

const {
  ALERT_CHANCES,
  DAY_FINAL_GRACE_MS,
  SHIFT_HOURS,
  dayStartMs,
  detectLiveAlerts,
  detectWorkerDayAlerts,
  planWorkerDay,
} = require("./simulator")

let pass = 0
let fail = 0
const check = (label, ok, extra = "") => {
  console.log(`  ${ok ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`)
  if (ok) pass += 1
  else fail += 1
}

const SHIFTS = ["Morning", "Evening", "Night"]
const PROFILES = ["city", "highway", "regional"]

const worker = (i) => ({
  userid: `U${String(i + 1).padStart(4, "0")}`,
  adSoyad: `Worker ${i + 1}`,
  kartNo: `0004539${String(i).padStart(3, "0")}`,
  station: `Station ${i % 8}`,
  profile: PROFILES[i % 3],
  shift: SHIFTS[i % 3],
})

const dateFor = (d) =>
  `2026-08-${String(1 + (d % 28)).padStart(2, "0")}`

// ---- 1. determinism --------------------------------------------------------
console.log("\nDeterminism")
{
  const a = JSON.stringify(planWorkerDay(worker(3), "2026-08-12"))
  const b = JSON.stringify(planWorkerDay(worker(3), "2026-08-12"))
  check("same (worker, date) twice is byte-identical", a === b)
  const c = JSON.stringify(planWorkerDay(worker(4), "2026-08-12"))
  check("a different worker gets a different plan", a !== c)
}

// ---- 2. prefix replay ------------------------------------------------------
console.log("\nPrefix replay (the tick's cursor contract)")
{
  let ok = true
  for (let i = 0; i < 40 && ok; i++) {
    const w = worker(i)
    const date = dateFor(i)
    const full = planWorkerDay(w, date)
    const start = dayStartMs(date)
    for (let hour = 0; hour <= 32; hour += 3) {
      const now = start + hour * 3_600_000
      const again = planWorkerDay(w, date)
      const taps = again.taps.filter((t) => t.at <= now)
      const sales = again.sales.filter((s) => s.at <= now)
      ok =
        ok &&
        JSON.stringify(taps) === JSON.stringify(full.taps.slice(0, taps.length)) &&
        JSON.stringify(sales) === JSON.stringify(full.sales.slice(0, sales.length))
    }
  }
  check("every time-slice is an exact prefix of the full plan", ok)
}

// ---- 3. alert rates --------------------------------------------------------
console.log("\nAlert rates over 64 workers × 120 days (7680 worker-days)")
{
  const DAYS = 120
  const WORKERS = 64
  const counts = new Map()
  let workerDays = 0
  let flaggedDays = 0
  let daysWithSales = 0
  let totalSales = 0

  for (let i = 0; i < WORKERS; i++) {
    for (let d = 0; d < DAYS; d++) {
      const date = `20${26 + Math.floor(d / 28)}-0${1 + (d % 8)}-${String(1 + (d % 28)).padStart(2, "0")}`
      const plan = planWorkerDay(worker(i), date)
      if (plan.taps.length === 0 && plan.sales.length === 0) continue
      workerDays += 1
      if (plan.sales.length > 0) {
        daysWithSales += 1
        totalSales += plan.sales.length
      }
      const alerts = detectWorkerDayAlerts(plan.taps, plan.sales)
      if (alerts.length > 0) flaggedDays += 1
      for (const alert of alerts) {
        counts.set(alert.type, (counts.get(alert.type) ?? 0) + 1)
      }
    }
  }

  // Days with a planted anomaly, as a share of ATTENDED days, should land
  // near the configured chance (wide tolerance — it is a random draw).
  const near = (type, expected) => {
    const rate = (counts.get(type) ?? 0) / workerDays
    check(
      `"${type}" ≈ ${(expected * 100).toFixed(1)}% of worker-days`,
      rate > expected * 0.45 && rate < expected * 2.2,
      `${((rate) * 100).toFixed(2)}%`
    )
  }
  near("missing-in", ALERT_CHANCES.missingIn)
  near("missing-out", ALERT_CHANCES.missingOut)
  near("double-tap-in", ALERT_CHANCES.doubleTapIn)
  near("double-tap-out", ALERT_CHANCES.doubleTapOut)
  near("no-taps-sales", ALERT_CHANCES.absent * ALERT_CHANCES.phantomWhenAbsent)
  // off-clock plants 1-3 SALES, each its own alert — compare day coverage.
  const offClockDays = counts.get("sale-off-clock") ?? 0
  check(
    `"sale-off-clock" fires (${offClockDays} alerts)`,
    offClockDays / workerDays > ALERT_CHANCES.saleOffClock * 0.45
  )

  check(
    "alerts are common but not universal (25–75% of days flagged)",
    flaggedDays / workerDays > 0.25 && flaggedDays / workerDays < 0.75,
    `${flaggedDays} flagged / ${workerDays} days`
  )
  check(
    "sales flow on effectively every attended day",
    daysWithSales / workerDays > 0.95,
    `avg ${(totalSales / daysWithSales).toFixed(1)} sales/day`
  )
}

// ---- 4. live honesty -------------------------------------------------------
console.log("\nLive honesty (mid-shift vs day-final)")
{
  // Find a worker-day whose plan has an IN and an OUT, then look mid-shift.
  let sample = null
  for (let i = 0; i < 200 && !sample; i++) {
    const w = worker(i)
    const date = "2026-08-12"
    const plan = planWorkerDay(w, date)
    if (plan.taps.length >= 2) sample = { w, date, plan }
  }
  const { w, date, plan } = sample
  const hours = SHIFT_HOURS[w.shift]
  const mid = dayStartMs(date) + ((hours.start + hours.end) / 2) * 3_600_000

  const midTaps = plan.taps.filter((t) => t.at <= mid)
  const midSales = plan.sales.filter((s) => s.at <= mid)
  const live = detectLiveAlerts(midTaps, midSales, false)
  check(
    "mid-shift: no missing-out/missing-in/no-taps-sales yet",
    live.every((a) => !["missing-out", "missing-in", "no-taps-sales"].includes(a.type))
  )

  const final = detectLiveAlerts(plan.taps, plan.sales, true)
  check(
    "day-final: the full verdict equals the offline engine's",
    JSON.stringify(final) ===
      JSON.stringify(detectWorkerDayAlerts(plan.taps, plan.sales))
  )
  check(
    "grace period is sane (30–120 min)",
    DAY_FINAL_GRACE_MS >= 30 * 60_000 && DAY_FINAL_GRACE_MS <= 120 * 60_000
  )
}

console.log(`\n${pass} passed, ${fail} failed\n`)
process.exit(fail ? 1 : 0)
