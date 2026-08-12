/**
 * Seed Firestore with the v3 core dataset: attendance TAPS + fob SALES in
 * the real db3_loglar / db3_satislar shape, plus the computed worker-days
 * and their OBVIOUS alerts.
 *
 *   npm run seed              # write/overwrite the dataset
 *   npm run seed -- --reset   # wipe previous layouts first
 *
 * Deterministic: the generator is seeded and the end date is pinned, so ids
 * are stable and re-running overwrites rather than duplicating.
 */
import { Timestamp, type Firestore } from "firebase-admin/firestore"

import { adminDb, usingEmulators } from "@/lib/firebase/admin"
import { COLLECTIONS, stationId, type StoredAlert } from "@/lib/firebase/schema"
import {
  CHECK_TYPE_IN,
  CHECK_TYPE_OUT,
  detectWorkerDayAlerts,
} from "@/lib/pos"
import {
  generateDays,
  generateWorkers,
  STATIONS,
  TOTAL_DAYS,
  type GeneratedSale,
  type GeneratedTap,
} from "@/lib/testdata"

/** Pinned so document ids never shift between runs. */
const END_DATE = new Date(2026, 6, 30) // 30 Jul 2026

const BATCH_LIMIT = 450

type Write = (batch: FirebaseFirestore.WriteBatch) => void

async function commitInBatches(db: Firestore, writes: Write[], label: string) {
  const total = Math.ceil(writes.length / BATCH_LIMIT)
  for (let i = 0; i < writes.length; i += BATCH_LIMIT) {
    const batch = db.batch()
    for (const write of writes.slice(i, i + BATCH_LIMIT)) write(batch)
    await batch.commit()
    const n = i / BATCH_LIMIT + 1
    if (n % 10 === 0 || n === total) {
      console.log(`    ${label}: batch ${n}/${total}`)
    }
  }
}

async function deleteCollection(db: Firestore, ref: FirebaseFirestore.Query) {
  const snapshot = await ref.limit(BATCH_LIMIT).get()
  if (snapshot.empty) return
  const batch = db.batch()
  snapshot.docs.forEach((doc) => batch.delete(doc.ref))
  await batch.commit()
  await deleteCollection(db, ref)
}

async function reset(db: Firestore) {
  console.log("  clearing existing data…")
  // v3 layout plus every legacy collection earlier versions wrote.
  for (const group of [
    "logs", "sales", "reports", "anomalies", "roster",
    "cases", "scorecards", "staffing", "employees",
  ]) {
    await deleteCollection(db, db.collectionGroup(group))
    console.log(`    cleared collection group: ${group}`)
  }
  await deleteCollection(db, db.collection(COLLECTIONS.stations))
  console.log("    cleared stations")
}

async function main() {
  const db = adminDb()
  if (process.argv.includes("--reset")) await reset(db)

  console.log(
    `Seeding ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "(no project)"}` +
      `${usingEmulators ? " via emulators" : " on live Firebase"}`
  )

  const workers = generateWorkers()
  const days = generateDays(workers, END_DATE)
  const workerById = new Map(workers.map((w) => [w.employeeId, w]))
  const now = Timestamp.now()
  const startedAt = Date.now()

  // ------------------------------------------------------------- stations
  await commitInBatches(
    db,
    STATIONS.map((station) => (batch) => {
      batch.set(db.collection(COLLECTIONS.stations).doc(stationId(station.name)), {
        name: station.name,
        region: station.region,
        profile: station.profile,
        employeeCount: workers.filter((w) => w.station === station.name).length,
        updatedAt: now,
      })
    }),
    "stations"
  )
  console.log(`  stations:  ${STATIONS.length}`)

  // --------------------------------------------------------------- roster
  await commitInBatches(
    db,
    workers.map((worker) => (batch) => {
      const hired = new Date(END_DATE)
      hired.setDate(END_DATE.getDate() - (TOTAL_DAYS - worker.firstDay))
      batch.set(
        db
          .collection(COLLECTIONS.stations)
          .doc(stationId(worker.station))
          .collection(COLLECTIONS.roster)
          .doc(worker.userid),
        {
          userid: worker.userid,
          adSoyad: worker.name,
          deptid: worker.deptid,
          deptname: worker.station,
          kartNo: worker.kartNo,
          shift: worker.shift,
          active: worker.lastDay >= TOTAL_DAYS,
          hiredAt: Timestamp.fromDate(hired),
        }
      )
    }),
    "roster"
  )
  console.log(`  roster:    ${workers.length} workers`)

  // ------------------------------------------ raw logs + sales, worker-days
  // Older layouts kept sale rows under /stations/{id}/sales — the one sales
  // table now lives at the top level, so any per-station copy is deleted.
  for (const station of STATIONS) {
    await deleteCollection(
      db,
      db
        .collection(COLLECTIONS.stations)
        .doc(stationId(station.name))
        .collection(COLLECTIONS.sales)
    )
  }
  console.log("  legacy per-station sales cleared")

  const logWrites: Write[] = []
  const saleWrites: Write[] = []
  const reportWrites: Write[] = []
  // total + byStation feed the nav badge; byDay is the per-day breakdown the
  // live-feed function edits in place to keep those two consistent.
  const alertsByStation: Record<string, number> = {}
  const alertsByDay: Record<string, Record<string, number>> = {}
  let alertsTotal = 0
  let reportCount = 0
  let logCount = 0
  let saleCount = 0

  const countAlerts = (date: string, station: string, alerts: StoredAlert[]) => {
    if (alerts.length === 0) return
    alertsTotal += alerts.length
    const key = stationId(station)
    alertsByStation[key] = (alertsByStation[key] ?? 0) + alerts.length
    const day = (alertsByDay[date] ??= {})
    day[key] = (day[key] ?? 0) + alerts.length
  }

  for (const day of days) {
    const tapsByWorker = new Map<number, GeneratedTap[]>()
    for (const tap of day.taps) {
      const list = tapsByWorker.get(tap.employeeId)
      if (list) list.push(tap)
      else tapsByWorker.set(tap.employeeId, [tap])
    }
    const salesByWorker = new Map<number, GeneratedSale[]>()
    for (const sale of day.sales) {
      const list = salesByWorker.get(sale.employeeId) ?? []
      list.push(sale)
      salesByWorker.set(sale.employeeId, list)
    }

    // ---- raw rows, exactly as the source tables would carry them ---------
    let logSeq = 0
    for (const tap of day.taps) {
      const worker = workerById.get(tap.employeeId)!
      logCount += 1
      logSeq += 1
      const docId = `${day.date}_${String(logSeq).padStart(4, "0")}`
      logWrites.push((batch) => {
        batch.set(
          db
            .collection(COLLECTIONS.stations)
            .doc(stationId(worker.station))
            .collection(COLLECTIONS.logs)
            .doc(docId),
          {
            userid: worker.userid,
            adSoyad: worker.name,
            deptid: worker.deptid,
            deptname: worker.station,
            kartNo: worker.kartNo,
            checkTime: Timestamp.fromDate(tap.at),
            checkType: tap.type,
          }
        )
      })
    }

    // THE sales table — one top-level collection, db3_satislar row for row.
    for (const sale of day.sales) {
      const worker = workerById.get(sale.employeeId)!
      saleCount += 1
      saleWrites.push((batch) => {
        batch.set(db.collection(COLLECTIONS.sales).doc(sale.db1Id), {
          db1Id: sale.db1Id,
          istasyon: sale.station,
          satisZamani: Timestamp.fromDate(sale.at),
          db1Personel: worker.name,
          kartNo: sale.kartNo,
          vNo: sale.vNo,
          analizEdildi: 1,
          litres: sale.litres,
          grade: sale.grade,
          amount: sale.amount,
          opDate: day.date,
        })
      })
    }

    // ---- computed worker-days: taps + sales + the alerts they prove ------
    const attended = new Set([
      ...tapsByWorker.keys(),
      ...salesByWorker.keys(),
    ])
    for (const employeeId of attended) {
      const worker = workerById.get(employeeId)!
      const taps = (tapsByWorker.get(employeeId) ?? []).map((t) => ({
        at: t.at.getTime(),
        type: t.type,
      }))
      const sales = (salesByWorker.get(employeeId) ?? []).map((s) => ({
        at: s.at.getTime(),
        db1Id: s.db1Id,
        kartNo: s.kartNo,
        vNo: s.vNo,
        litres: s.litres,
        grade: s.grade,
        amount: s.amount,
      }))

      const alerts = detectWorkerDayAlerts(
        taps.map((t) => ({ at: t.at, type: t.type })),
        sales.map((s) => ({ ...s, at: s.at }))
      )
      countAlerts(day.date, worker.station, alerts)

      const ins = taps.filter((t) => t.type === CHECK_TYPE_IN)
      const outs = taps.filter((t) => t.type === CHECK_TYPE_OUT)
      const checkIn = ins[0]?.at ?? null
      const checkOut = outs.at(-1)?.at ?? null

      reportCount += 1
      reportWrites.push((batch) => {
        batch.set(
          db
            .collection(COLLECTIONS.stations)
            .doc(stationId(worker.station))
            .collection(COLLECTIONS.reports)
            .doc(`${day.date}_${worker.userid}`),
          {
            date: day.date,
            userid: worker.userid,
            adSoyad: worker.name,
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
            // Aggregates only — the rows themselves live in /sales, linked
            // by (kartNo, opDate == date).
            salesCount: sales.length,
            litres: Math.round(sales.reduce((s, x) => s + x.litres, 0) * 100) / 100,
            revenue: Math.round(sales.reduce((s, x) => s + x.amount, 0) * 100) / 100,
            alerts,
          }
        )
      })
    }

  }

  await commitInBatches(db, logWrites, "logs")
  console.log(`  logs:      ${logCount} taps`)
  await commitInBatches(db, saleWrites, "sales")
  console.log(`  sales:     ${saleCount}`)
  await commitInBatches(db, reportWrites, "reports")
  console.log(`  reports:   ${reportCount} worker-days`)

  await db.collection(COLLECTIONS.meta).doc("alerts").set({
    total: alertsTotal,
    byStation: alertsByStation,
    byDay: alertsByDay,
    updatedAt: Timestamp.now(),
  })
  console.log(`  alerts:    ${alertsTotal} across ${days.length} days`)

  await db.collection(COLLECTIONS.settings).doc("global").set(
    { defaultLanguage: "az", updatedAt: now },
    { merge: true }
  )

  const manifest = {
    importedAt: now,
    source: "generated test data (lib/testdata.ts, v3 core)",
    dates: days.map((d) => d.date),
    counts: {
      stations: STATIONS.length,
      workers: workers.length,
      logs: logCount,
      sales: saleCount,
      reports: reportCount,
      days: days.length,
    },
    durationMs: Date.now() - startedAt,
  }
  await db.collection(COLLECTIONS.meta).doc("import").set(manifest)
  await db
    .collection(COLLECTIONS.meta)
    .doc("import")
    .collection("history")
    .add({ ...manifest, by: "seed-script" })

  console.log("Done.")
}

main().catch((error) => {
  console.error("\nSeed failed:", error instanceof Error ? error.message : error)
  process.exit(1)
})
