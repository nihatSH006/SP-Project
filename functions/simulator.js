/**
 * The live-feed simulator core — PURE and DETERMINISTIC.
 *
 * Given a worker and an operational day it produces the whole day's feed
 * (attendance taps + fob sales) exactly once: the same (worker, date) always
 * yields the same plan, byte for byte. The scheduled function replays the
 * portion of the plan whose timestamps have passed, so repeated ticks are
 * idempotent and no state beyond Firestore itself is needed.
 *
 * ALERT_CHANCES below are the knobs the task asked for: each is the
 * per-worker-day probability that the plan deliberately contains one of the
 * database-provable anomalies the alert engine flags.
 *
 * Mirrors (keep in sync by hand — this package deploys standalone):
 *   lib/pos.ts       — CHECK_TYPE_*, detectWorkerDayAlerts
 *   lib/testdata.ts  — shift hours, demand shapes, amounts, grades
 *   lib/settings.ts  — tariff table
 */

"use strict"

// ---------------------------------------------------------------- constants

const CHECK_TYPE_IN = 0
const CHECK_TYPE_OUT = 1

/** Asia/Baku is UTC+4 with no DST — a constant offset is exact. */
const BAKU_OFFSET_MS = 4 * 3_600_000

const SHIFT_HOURS = {
  Morning: { start: 6, end: 14 },
  Evening: { start: 14, end: 22 },
  Night: { start: 22, end: 30 }, // 22:00 → 06:00 next day
}

const TARIFFS = { "AI-92": 1.1, "AI-95": 1.4, "AI-98": 1.65, Diesel: 1.0 }

const ROUND_AMOUNTS = [20, 30, 40, 50, 70, 100, 150, 200]

/** Hourly demand shape (0-23) by station profile, relative values. */
const HOUR_SHAPE = {
  city: [0.2, 0.15, 0.1, 0.1, 0.15, 0.4, 0.9, 1.4, 1.5, 1.1, 0.9, 0.9, 1.0, 1.0, 0.9, 1.0, 1.1, 1.5, 1.6, 1.3, 1.0, 0.7, 0.5, 0.3],
  highway: [0.4, 0.3, 0.3, 0.3, 0.4, 0.6, 0.9, 1.1, 1.2, 1.3, 1.4, 1.5, 1.5, 1.4, 1.4, 1.3, 1.2, 1.2, 1.1, 1.0, 0.8, 0.7, 0.6, 0.5],
  regional: [0.1, 0.1, 0.05, 0.05, 0.1, 0.3, 0.7, 1.0, 1.1, 1.0, 1.0, 1.1, 1.2, 1.1, 1.0, 1.0, 1.0, 1.1, 1.2, 1.0, 0.7, 0.5, 0.3, 0.2],
}

const PROFILE_VOLUME = { city: 1.1, highway: 1.25, regional: 0.8 }

/**
 * The alert knobs — per-worker-day probability of each planted anomaly.
 * Every one maps 1:1 to an alert id the engine proves from the two tables.
 */
const ALERT_CHANCES = {
  /** No show at all (not an alert by itself — no worker-day document). */
  absent: 0.05,
  /** GIVEN absent: the fob sells anyway → "no-taps-sales" (high). */
  phantomWhenAbsent: 0.25,
  /** OUT tap with no IN before it → "missing-in" (medium). */
  missingIn: 0.025,
  /** IN tap, never an OUT → "missing-out" (medium). */
  missingOut: 0.04,
  /** Card read twice on the way in → "double-tap-in" (low). */
  doubleTapIn: 0.03,
  /** Card read twice on the way out → "double-tap-out" (low). */
  doubleTapOut: 0.03,
  /** 1-3 sales 15-60 min AFTER the OUT tap → "sale-off-clock" (high). */
  saleOffClock: 0.04,
}

/** Tap-shape alerts are judged only after the shift is truly over. */
const DAY_FINAL_GRACE_MS = 60 * 60_000

// ---------------------------------------------------------------- utilities

/** mulberry32 — the same deterministic generator the seeder uses. */
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** FNV-1a — a stable string → uint32 seed. */
function hash(text) {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

const round2 = (v) => Math.round(v * 100) / 100
const pick = (r, xs) => xs[Math.floor(r() * xs.length)]

/** Midnight (Baku) of a `YYYY-MM-DD` day, as epoch ms. */
function dayStartMs(date) {
  const [y, m, d] = date.split("-").map(Number)
  return Date.UTC(y, m - 1, d) - BAKU_OFFSET_MS
}

/** The `YYYY-MM-DD` Baku calendar day an epoch instant falls on. */
function bakuDateKey(atMs) {
  return new Date(atMs + BAKU_OFFSET_MS).toISOString().slice(0, 10)
}

// ------------------------------------------------------------------- alerts
// Mirror of lib/pos.ts — same ids, severities and logic, to the letter.

const ALERT_SEVERITY = {
  "missing-out": "medium",
  "missing-in": "medium",
  "double-tap-in": "low",
  "double-tap-out": "low",
  "sale-off-clock": "high",
  "no-taps-sales": "high",
}

const WINDOW_MS = 2 * 60_000
const around = (at) => ({ from: at - WINDOW_MS, to: at + WINDOW_MS })

function detectWorkerDayAlerts(taps, sales) {
  const alerts = []
  const sorted = [...taps].sort((a, b) => a.at - b.at)

  const ins = sorted.filter((t) => t.type === CHECK_TYPE_IN)
  const outs = sorted.filter((t) => t.type === CHECK_TYPE_OUT)
  const firstIn = ins[0]?.at
  const lastOut = outs.at(-1)?.at

  if (sorted.length > 0) {
    if (ins.length > 0 && outs.length === 0) {
      const last = sorted.at(-1).at
      alerts.push({ type: "missing-out", severity: ALERT_SEVERITY["missing-out"], at: last, ...around(last) })
    }
    if (outs.length > 0 && ins.length === 0) {
      const first = sorted[0].at
      alerts.push({ type: "missing-in", severity: ALERT_SEVERITY["missing-in"], at: first, ...around(first) })
    }
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].type === sorted[i - 1].type) {
        const type = sorted[i].type === CHECK_TYPE_OUT ? "double-tap-out" : "double-tap-in"
        alerts.push({ type, severity: ALERT_SEVERITY[type], at: sorted[i].at, ...around(sorted[i].at) })
      }
    }
  }

  if (sales.length > 0 && sorted.length === 0) {
    const first = [...sales].sort((a, b) => a.at - b.at)[0]
    alerts.push({
      type: "no-taps-sales",
      severity: ALERT_SEVERITY["no-taps-sales"],
      at: first.at,
      ...around(first.at),
      amount: round2(sales.reduce((s, x) => s + x.amount, 0)),
    })
  } else {
    for (const sale of sales) {
      const beforeIn = firstIn !== undefined && sale.at < firstIn
      const afterOut = lastOut !== undefined && sale.at > lastOut
      if (beforeIn || afterOut) {
        alerts.push({
          type: "sale-off-clock",
          severity: ALERT_SEVERITY["sale-off-clock"],
          at: sale.at,
          ...around(sale.at),
          amount: sale.amount,
        })
      }
    }
  }

  return alerts.sort((a, b) => a.at - b.at)
}

/**
 * Alerts as a LIVE tick may honestly state them. Mid-shift, "no OUT tap yet"
 * is not "never tapped out", and "no taps yet" is not "no taps at all" — the
 * absence-shaped alerts are only judged once the shift is over plus a grace
 * period, exactly like an end-of-day import would see them.
 */
function detectLiveAlerts(taps, sales, dayFinal) {
  const alerts = detectWorkerDayAlerts(taps, sales)
  if (dayFinal) return alerts
  return alerts.filter(
    (a) =>
      a.type === "double-tap-in" ||
      a.type === "double-tap-out" ||
      a.type === "sale-off-clock"
  )
}

// --------------------------------------------------------------------- plan

function saleAmount(r) {
  if (r() < 0.7) return pick(r, ROUND_AMOUNTS)
  return round2(15 + r() * 285)
}

function fuelGrade(r) {
  const x = r()
  if (x < 0.62) return "AI-92"
  if (x < 0.84) return "AI-95"
  if (x < 0.96) return "Diesel"
  return "AI-98"
}

/**
 * The whole feed one worker produces on one operational day.
 *
 * worker: { userid, adSoyad, kartNo, station, profile, shift }
 * date:   YYYY-MM-DD (Baku)
 *
 * Returns { taps: [{at, type}], sales: [{at, db1Id, vNo, litres, grade,
 * amount}], shiftEndAt } with both lists sorted by time — the caller replays
 * prefixes of these arrays, so the ORDER is part of the contract.
 */
function planWorkerDay(worker, date) {
  const r = rng(hash(`${worker.userid}|${date}`))
  const hours = SHIFT_HOURS[worker.shift] ?? SHIFT_HOURS.Morning
  const start = dayStartMs(date)
  const shiftEndAt = start + hours.end * 3_600_000

  // A stable per-worker sales pace, like the seeded `performance` factor.
  const perf = 0.7 + (hash(worker.userid) % 1000) / 1000 * 0.6

  const plan = { taps: [], sales: [], shiftEndAt }
  let seq = 0
  const pushSale = (at) => {
    const amount = saleAmount(r)
    const grade = fuelGrade(r)
    seq += 1
    plan.sales.push({
      at,
      db1Id: `L${date.replace(/-/g, "")}-${worker.userid}-${String(seq).padStart(3, "0")}`,
      vNo: `V${1 + Math.floor(r() * 4)}`,
      litres: round2(amount / TARIFFS[grade]),
      grade,
      amount,
    })
  }

  // ---- the day's dice, rolled in a FIXED order (determinism) --------------
  const absent = r() < ALERT_CHANCES.absent
  const phantom = absent && r() < ALERT_CHANCES.phantomWhenAbsent
  const lateMin = r() < 0.6 ? r() * 8 : 8 + r() * 15
  const outDriftMin = (r() - 0.35) * 24
  const missIn = r() < ALERT_CHANCES.missingIn
  const missOut = r() < ALERT_CHANCES.missingOut
  const dblIn = !missIn && r() < ALERT_CHANCES.doubleTapIn
  const dblOut = !missOut && r() < ALERT_CHANCES.doubleTapOut
  const offClock = !missOut && r() < ALERT_CHANCES.saleOffClock

  if (absent && !phantom) return plan // a quiet no-show: nothing to feed

  const tapInAt = start + hours.start * 3_600_000 + Math.round(lateMin * 60_000) + Math.round(r() * 59_000)
  const tapOutAt = shiftEndAt + Math.round(outDriftMin * 60_000) + Math.round(r() * 59_000)

  if (phantom) {
    // The fob sells with zero presence recorded — the strongest fact.
    const n = 3 + Math.floor(r() * 4)
    for (let k = 0; k < n; k++) {
      pushSale(start + (hours.start + 1 + Math.floor(r() * 6)) * 3_600_000 + Math.floor(r() * 3_600_000))
    }
    plan.sales.sort((a, b) => a.at - b.at)
    return plan
  }

  if (!missIn) {
    plan.taps.push({ at: tapInAt, type: CHECK_TYPE_IN })
    if (dblIn) {
      // The reader catches the card twice on the way in.
      plan.taps.push({ at: tapInAt + 30_000 + Math.round(r() * 60_000), type: CHECK_TYPE_IN })
    }
  }
  if (!missOut) {
    plan.taps.push({ at: tapOutAt, type: CHECK_TYPE_OUT })
    if (dblOut) {
      // Twice on the way out — the LAST tap is the real check-out.
      plan.taps.push({ at: tapOutAt + 30_000 + Math.round(r() * 60_000), type: CHECK_TYPE_OUT })
    }
  }

  // ---- honest selling through the shift, following the demand curve -------
  const shape = HOUR_SHAPE[worker.profile] ?? HOUR_SHAPE.city
  const volume = PROFILE_VOLUME[worker.profile] ?? 1
  for (let h = hours.start; h < hours.end; h++) {
    const expected = 3.2 * shape[h % 24] * volume * perf
    const count = Math.max(0, Math.round(expected + (r() - 0.5) * 2.4))
    for (let k = 0; k < count; k++) {
      const at = start + h * 3_600_000 + Math.floor(r() * 3_600_000)
      if (at < tapInAt || at > tapOutAt) continue // like the seeder: in-window only
      pushSale(at)
    }
  }

  // ---- the planted off-clock sales: selling continues after the OUT -------
  if (offClock) {
    const n = 1 + Math.floor(r() * 3)
    for (let k = 0; k < n; k++) {
      pushSale(tapOutAt + Math.round((15 + r() * 45) * 60_000))
    }
  }

  plan.taps.sort((a, b) => a.at - b.at)
  plan.sales.sort((a, b) => a.at - b.at)
  return plan
}

module.exports = {
  ALERT_CHANCES,
  BAKU_OFFSET_MS,
  CHECK_TYPE_IN,
  CHECK_TYPE_OUT,
  DAY_FINAL_GRACE_MS,
  SHIFT_HOURS,
  bakuDateKey,
  dayStartMs,
  detectLiveAlerts,
  detectWorkerDayAlerts,
  planWorkerDay,
}
