/**
 * One tick of the live sales feed.
 *
 * Replays every worker's deterministic day plan (see simulator.js) up to
 * "now", writing ONLY what the clock has newly revealed:
 *
 *   /sales/{db1Id}                    — THE sales table (db3_satislar shape)
 *   /stations/{st}/logs/{...}         — attendance taps (db3_loglar shape)
 *   /stations/{st}/reports/{date}_{u} — the worker-day aggregates + alerts
 *   /meta/alerts, /meta/import        — nav badge totals + the date list
 *
 * The report document doubles as the feed cursor: its stored tap count and
 * salesCount say how much of the plan is already on record, so a tick that
 * finds nothing new writes nothing. Every write is a set() with a
 * deterministic id — replaying a tick, or two ticks racing, cannot duplicate
 * a row.
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

/** Mirror of lib/firebase/schema.ts stationId(). */
function stationId(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

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
 * Run one feed tick at `nowMs`. Returns a summary for the logs.
 */
async function runFeedTick(db, nowMs) {
  // Two operational days can be live at once: today, and yesterday while its
  // night shift (22:00 → 06:00) is still on the clock.
  const today = bakuDateKey(nowMs)
  const yesterday = bakuDateKey(nowMs - 24 * 3_600_000)
  const opDates = [yesterday, today]

  // ---- the cast: stations (for demand profile) and the roster -------------
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

  // ---- plan every live worker-day, then read its cursor (the report) ------
  const jobs = []
  for (const worker of workers) {
    for (const date of opDates) {
      const plan = planWorkerDay(worker, date)
      const taps = plan.taps.filter((t) => t.at <= nowMs)
      const sales = plan.sales.filter((s) => s.at <= nowMs)
      if (taps.length === 0 && sales.length === 0) continue

      jobs.push({
        worker,
        date,
        taps,
        sales,
        dayFinal: nowMs >= plan.shiftEndAt + DAY_FINAL_GRACE_MS,
        reportRef: db
          .collection("stations")
          .doc(worker.stationId)
          .collection("reports")
          .doc(`${date}_${worker.userid}`),
      })
    }
  }

  const reportSnaps = await getAllChunked(db, jobs.map((job) => job.reportRef))

  const writes = []
  const alertTally = new Map() // `${date}|${stationId}` -> count
  const activeDates = new Set()
  let salesWritten = 0
  let tapsWritten = 0
  let reportsWritten = 0

  jobs.forEach((job, i) => {
    const stored = reportSnaps[i].exists ? reportSnaps[i].data() : null
    const storedTaps = stored?.taps?.length ?? 0
    const storedSales = stored?.salesCount ?? 0
    const { worker, date, taps, sales, dayFinal } = job

    activeDates.add(date)

    const alerts = detectLiveAlerts(taps, sales, dayFinal)
    const tallyKey = `${date}|${worker.stationId}`
    alertTally.set(tallyKey, (alertTally.get(tallyKey) ?? 0) + alerts.length)

    // The cursor: everything before the stored counts is already on record.
    // (If a simulator change ever shrinks a plan, the slice clamps and the
    // deterministic ids make re-sets harmless.)
    const newTaps = taps.slice(Math.min(storedTaps, taps.length))
    const newSales = sales.slice(Math.min(storedSales, sales.length))
    const alertsChanged =
      JSON.stringify(stored?.alerts ?? []) !== JSON.stringify(alerts)
    if (newTaps.length === 0 && newSales.length === 0 && !alertsChanged) return

    // ---- THE sales table: db3_satislar row for row ----------------------
    for (const sale of newSales) {
      salesWritten += 1
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

    // ---- the attendance log: db3_loglar rows ----------------------------
    const firstNewTap = taps.length - newTaps.length
    taps.forEach((tap, index) => {
      if (index < firstNewTap) return
      tapsWritten += 1
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

    // ---- the worker-day report: aggregates + alerts, never sale rows ----
    const ins = taps.filter((t) => t.type === CHECK_TYPE_IN)
    const outs = taps.filter((t) => t.type === CHECK_TYPE_OUT)
    const checkIn = ins[0]?.at ?? null
    const checkOut = outs.at(-1)?.at ?? null

    reportsWritten += 1
    writes.push((batch) =>
      batch.set(job.reportRef, {
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
        litres: Math.round(sales.reduce((s, x) => s + x.litres, 0) * 100) / 100,
        revenue: Math.round(sales.reduce((s, x) => s + x.amount, 0) * 100) / 100,
        alerts,
      })
    )
  })

  await commitInBatches(db, writes)

  // ---- meta: the nav badge and the date picker stay linked ----------------
  if (activeDates.size > 0) {
    const alertsRef = db.collection("meta").doc("alerts")
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(alertsRef)
      const byDay = snap.exists ? { ...(snap.data().byDay ?? {}) } : {}
      for (const [key, count] of alertTally) {
        const [date, st] = key.split("|")
        if (count > 0) {
          byDay[date] = { ...(byDay[date] ?? {}), [st]: count }
        }
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

    await db
      .collection("meta")
      .doc("import")
      .set(
        {
          dates: FieldValue.arrayUnion(...activeDates),
          importedAt: Timestamp.fromMillis(nowMs),
          lastFeedTickAt: Timestamp.fromMillis(nowMs),
        },
        { merge: true }
      )
  }

  return {
    at: new Date(nowMs).toISOString(),
    bakuOffsetHours: BAKU_OFFSET_MS / 3_600_000,
    workers: workers.length,
    workerDays: jobs.length,
    salesWritten,
    tapsWritten,
    reportsWritten,
    dates: [...activeDates].sort(),
  }
}

module.exports = { runFeedTick, stationId }
