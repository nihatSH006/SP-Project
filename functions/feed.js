/**
 * The live sales feed — runs IN THE CLOUD, never from the website.
 *
 * Replays every worker's deterministic day plan (see simulator.js) up to
 * "now", writing ONLY what the clock has newly revealed:
 *
 *   /sales/{db1Id}                    — THE sales table (db3_satislar shape)
 *   /stations/{st}/logs/{...}         — attendance taps (db3_loglar shape)
 *   /stations/{st}/reports/{date}_{u} — the worker-day aggregates + alerts
 *   /meta/alerts, /meta/import        — nav badge totals + the date list
 *   /meta/feedLog                     — rolling event journal the dashboard
 *                                       READS (who sold what, who tapped)
 *
 * Two entry points share the core:
 *
 *   runFeedTick(db, now)  — one tick (the manual feedNow kick)
 *   runFeedLoop(db, ms)   — the every-minute scheduled run: loads context
 *                           once, then ticks every second for ~52s,
 *                           re-checking the /meta/feed master switch each
 *                           second so OFF stops it within a second.
 *
 * Everything is idempotent: deterministic ids, set() writes, and in-memory
 * cursors that mirror what the report documents record. Two instances
 * racing can only re-write identical rows.
 */

"use strict"

const { Timestamp, FieldValue } = require("firebase-admin/firestore")

const {
  BAKU_OFFSET_MS,
  CHECK_TYPE_IN,
  CHECK_TYPE_OUT,
  DAY_FINAL_GRACE_MS,
  bakuDateKey,
  detectLiveAlerts,
  planWorkerDay,
} = require("./simulator")

const BATCH_LIMIT = 450
const FEED_LOG_LIMIT = 50

/** Mirror of lib/firebase/schema.ts stationId(). */
function stationId(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function commitInBatches(db, writes) {
  for (let i = 0; i < writes.length; i += BATCH_LIMIT) {
    const batch = db.batch()
    for (const write of writes.slice(i, i + BATCH_LIMIT)) write(batch)
    await batch.commit()
  }
}

async function getAllChunked(db, refs) {
  const out = []
  for (let i = 0; i < refs.length; i += 300) {
    out.push(...(await db.getAll(...refs.slice(i, i + 300))))
  }
  return out
}

/**
 * The master switch — /meta/feed { enabled }. The dashboard toggles it; BOTH
 * entry points run through here, so OFF means the feed does not run at all,
 * from anywhere. Missing document counts as OFF.
 */
async function feedEnabled(db) {
  const doc = await db.collection("meta").doc("feed").get()
  return doc.exists && doc.data().enabled === true
}

/** The operational days that can be live at `nowMs` (today + last night's). */
function liveDates(nowMs) {
  return [bakuDateKey(nowMs - 24 * 3_600_000), bakuDateKey(nowMs)]
}

// ------------------------------------------------------------------ context

/**
 * Everything a tick needs that does NOT change second to second: the cast
 * (stations + roster), the feed cursors (mirrors of the report documents),
 * and the rolling event journal. Loaded once per invocation, then kept
 * current in memory by the ticks themselves.
 */
async function loadContext(db, nowMs) {
  const stationsSnap = await db.collection("stations").get()
  const profileByName = new Map(
    stationsSnap.docs.map((doc) => [doc.data().name, doc.data().profile])
  )

  const rosterSnap = await db.collectionGroup("roster").get()
  const workers = rosterSnap.docs
    .map((doc) => {
      const data = doc.data()
      return {
        userid: data.userid,
        adSoyad: data.adSoyad,
        kartNo: data.kartNo,
        station: data.deptname,
        stationId: doc.ref.parent.parent.id,
        profile: profileByName.get(data.deptname) ?? "city",
        shift: data.shift ?? "Morning",
        active: data.active !== false,
      }
    })
    .filter((worker) => worker.active && worker.userid && worker.kartNo)

  // Cursor per worker-day: how much of the plan the reports already record.
  const cursors = new Map() // `${date}|${stationId}|${userid}` -> {taps, sales, alertsJson}
  const refs = []
  const keys = []
  for (const worker of workers) {
    for (const date of liveDates(nowMs)) {
      keys.push(`${date}|${worker.stationId}|${worker.userid}`)
      refs.push(
        db
          .collection("stations")
          .doc(worker.stationId)
          .collection("reports")
          .doc(`${date}_${worker.userid}`)
      )
    }
  }
  const snaps = await getAllChunked(db, refs)
  snaps.forEach((snap, i) => {
    if (!snap.exists) return
    const data = snap.data()
    cursors.set(keys[i], {
      taps: data.taps?.length ?? 0,
      sales: data.salesCount ?? 0,
      alertsJson: JSON.stringify(data.alerts ?? []),
    })
  })

  // The rolling journal the dashboard reads — continue its sequence.
  const logSnap = await db.collection("meta").doc("feedLog").get()
  const journal = logSnap.exists ? (logSnap.data().events ?? []) : []
  const seq = journal.reduce((max, event) => Math.max(max, event.seq ?? 0), 0)

  return {
    workers,
    cursors,
    journal, // newest first
    seq,
    dates: new Set(),
    tallyDirty: false,
  }
}

// --------------------------------------------------------------------- tick

/**
 * One pass at `nowMs` against a loaded context. Writes new rows, keeps the
 * context's cursors/journal current, and returns what happened.
 */
async function tickWithContext(db, ctx, nowMs) {
  const writes = []
  const events = []
  let salesWritten = 0
  let tapsWritten = 0
  let reportsWritten = 0

  for (const worker of ctx.workers) {
    for (const date of liveDates(nowMs)) {
      const plan = planWorkerDay(worker, date)
      const taps = plan.taps.filter((t) => t.at <= nowMs)
      const sales = plan.sales.filter((s) => s.at <= nowMs)
      if (taps.length === 0 && sales.length === 0) continue

      ctx.dates.add(date)
      const key = `${date}|${worker.stationId}|${worker.userid}`
      const cursor = ctx.cursors.get(key) ?? {
        taps: 0,
        sales: 0,
        alertsJson: "[]",
      }

      const dayFinal = nowMs >= plan.shiftEndAt + DAY_FINAL_GRACE_MS
      const alerts = detectLiveAlerts(taps, sales, dayFinal)
      const alertsJson = JSON.stringify(alerts)

      const newTaps = taps.slice(Math.min(cursor.taps, taps.length))
      const newSales = sales.slice(Math.min(cursor.sales, sales.length))
      if (
        newTaps.length === 0 &&
        newSales.length === 0 &&
        alertsJson === cursor.alertsJson
      ) {
        continue
      }

      // ---- THE sales table: db3_satislar row for row --------------------
      for (const sale of newSales) {
        salesWritten += 1
        events.push({
          seq: ++ctx.seq,
          at: sale.at,
          kind: "sale",
          adSoyad: worker.adSoyad,
          istasyon: worker.station,
          amount: sale.amount,
          grade: sale.grade,
        })
        writes.push((batch) =>
          batch.set(db.collection("sales").doc(sale.db1Id), {
            db1Id: sale.db1Id,
            istasyon: worker.station,
            satisZamani: Timestamp.fromMillis(sale.at),
            db1Personel: worker.adSoyad,
            kartNo: worker.kartNo,
            vNo: sale.vNo,
            analizEdildi: 1,
            litres: sale.litres,
            grade: sale.grade,
            amount: sale.amount,
            opDate: date,
          })
        )
      }

      // ---- the attendance log: db3_loglar rows --------------------------
      const firstNewTap = taps.length - newTaps.length
      taps.forEach((tap, index) => {
        if (index < firstNewTap) return
        tapsWritten += 1
        events.push({
          seq: ++ctx.seq,
          at: tap.at,
          kind: "tap",
          adSoyad: worker.adSoyad,
          istasyon: worker.station,
          type: tap.type,
        })
        writes.push((batch) =>
          batch.set(
            db
              .collection("stations")
              .doc(worker.stationId)
              .collection("logs")
              .doc(`${date}_${worker.userid}_${String(index).padStart(2, "0")}`),
            {
              userid: worker.userid,
              adSoyad: worker.adSoyad,
              deptid: 0,
              deptname: worker.station,
              kartNo: worker.kartNo,
              checkTime: Timestamp.fromMillis(tap.at),
              checkType: tap.type,
            }
          )
        )
      })

      // ---- the worker-day report: aggregates + alerts, never sale rows --
      const ins = taps.filter((t) => t.type === CHECK_TYPE_IN)
      const outs = taps.filter((t) => t.type === CHECK_TYPE_OUT)
      const checkIn = ins[0]?.at ?? null
      const checkOut = outs.at(-1)?.at ?? null

      reportsWritten += 1
      writes.push((batch) =>
        batch.set(
          db
            .collection("stations")
            .doc(worker.stationId)
            .collection("reports")
            .doc(`${date}_${worker.userid}`),
          {
            date,
            userid: worker.userid,
            adSoyad: worker.adSoyad,
            kartNo: worker.kartNo,
            station: worker.station,
            shift: worker.shift,
            checkIn,
            checkOut,
            workedHours:
              checkIn !== null && checkOut !== null
                ? Math.round(((checkOut - checkIn) / 3_600_000) * 100) / 100
                : null,
            taps,
            salesCount: sales.length,
            litres:
              Math.round(sales.reduce((s, x) => s + x.litres, 0) * 100) / 100,
            revenue:
              Math.round(sales.reduce((s, x) => s + x.amount, 0) * 100) / 100,
            alerts,
          }
        )
      )

      if (alertsJson !== cursor.alertsJson) ctx.tallyDirty = true
      ctx.cursors.set(key, {
        taps: taps.length,
        sales: sales.length,
        alertsJson,
      })
    }
  }

  // The journal: newest first, capped — one small doc the dashboard polls.
  if (events.length > 0) {
    events.sort((a, b) => b.at - a.at)
    ctx.journal = [...events, ...ctx.journal].slice(0, FEED_LOG_LIMIT)
    writes.push((batch) =>
      batch.set(db.collection("meta").doc("feedLog"), {
        events: ctx.journal,
        updatedAt: Timestamp.fromMillis(nowMs),
      })
    )
  }

  await commitInBatches(db, writes)
  return { salesWritten, tapsWritten, reportsWritten, events }
}

// --------------------------------------------------------------------- meta

/**
 * Settle the linked meta documents: per-day alert counts (recomputed from
 * the plans, deterministic) and the date list the date picker reads.
 */
async function finalizeMeta(db, ctx, nowMs) {
  if (ctx.dates.size === 0) return

  if (ctx.tallyDirty) {
    const tally = new Map() // `${date}|${stationId}` -> count
    for (const worker of ctx.workers) {
      for (const date of liveDates(nowMs)) {
        const plan = planWorkerDay(worker, date)
        const taps = plan.taps.filter((t) => t.at <= nowMs)
        const sales = plan.sales.filter((s) => s.at <= nowMs)
        if (taps.length === 0 && sales.length === 0) continue
        const dayFinal = nowMs >= plan.shiftEndAt + DAY_FINAL_GRACE_MS
        const count = detectLiveAlerts(taps, sales, dayFinal).length
        if (count === 0) continue
        const key = `${date}|${worker.stationId}`
        tally.set(key, (tally.get(key) ?? 0) + count)
      }
    }

    const alertsRef = db.collection("meta").doc("alerts")
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(alertsRef)
      const byDay = snap.exists ? { ...(snap.data().byDay ?? {}) } : {}
      for (const [key, count] of tally) {
        const [date, st] = key.split("|")
        byDay[date] = { ...(byDay[date] ?? {}), [st]: count }
      }
      const byStation = {}
      let total = 0
      for (const perStation of Object.values(byDay)) {
        for (const [st, count] of Object.entries(perStation)) {
          byStation[st] = (byStation[st] ?? 0) + count
          total += count
        }
      }
      tx.set(alertsRef, {
        total,
        byStation,
        byDay,
        updatedAt: Timestamp.fromMillis(nowMs),
      })
    })
    ctx.tallyDirty = false
  }

  await db
    .collection("meta")
    .doc("import")
    .set(
      {
        dates: FieldValue.arrayUnion(...ctx.dates),
        importedAt: Timestamp.fromMillis(nowMs),
        lastFeedTickAt: Timestamp.fromMillis(nowMs),
      },
      { merge: true }
    )
}

// ------------------------------------------------------------- entry points

/** One single tick — the manual feedNow kick. */
async function runFeedTick(db, nowMs) {
  if (!(await feedEnabled(db))) {
    return { disabled: true, at: new Date(nowMs).toISOString() }
  }
  const ctx = await loadContext(db, nowMs)
  const result = await tickWithContext(db, ctx, nowMs)
  await finalizeMeta(db, ctx, nowMs)
  return {
    at: new Date(nowMs).toISOString(),
    bakuOffsetHours: BAKU_OFFSET_MS / 3_600_000,
    workers: ctx.workers.length,
    salesWritten: result.salesWritten,
    tapsWritten: result.tapsWritten,
    reportsWritten: result.reportsWritten,
    dates: [...ctx.dates].sort(),
  }
}

/**
 * The scheduled minute: tick every second for ~`budgetMs`, re-checking the
 * master switch each second. This IS the "1-second timer in the cloud" —
 * the next scheduled minute picks up where this one stopped.
 */
async function runFeedLoop(db, budgetMs) {
  const deadline = Date.now() + budgetMs
  let ticks = 0
  let salesWritten = 0
  let tapsWritten = 0
  let switchedOff = false
  let ctx = null

  while (Date.now() < deadline) {
    const startedAt = Date.now()

    if (!(await feedEnabled(db))) {
      switchedOff = true
      break
    }
    ctx ??= await loadContext(db, Date.now())

    const result = await tickWithContext(db, ctx, Date.now())
    ticks += 1
    salesWritten += result.salesWritten
    tapsWritten += result.tapsWritten

    const wait = 1_000 - (Date.now() - startedAt)
    if (wait > 0) await sleep(wait)
  }

  if (ctx) await finalizeMeta(db, ctx, Date.now())

  return {
    at: new Date().toISOString(),
    ticks,
    salesWritten,
    tapsWritten,
    switchedOff,
  }
}

module.exports = { runFeedTick, runFeedLoop, stationId }
