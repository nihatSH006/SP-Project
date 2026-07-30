/**
 * Seed Firestore with the generated multi-day test dataset.
 *
 *   npm run seed              # write/overwrite the dataset
 *   npm run seed -- --reset   # wipe the old single-day layout + all data first
 *
 * Deterministic: the generator is seeded and the end date is pinned, so ids
 * are stable and re-running overwrites rather than duplicating.
 *
 * Writes:
 *   /stations/{id}                      8 stations
 *   /stations/{id}/roster/{empId}       64 workers
 *   /stations/{id}/reports/{date}_{id}  ~1,750 computed daily reports
 *   /stations/{id}/sales/{saleId}       ~45,000 raw transactions
 *   /settings/global                    default business rules (idea #16)
 *   /meta/import                        dates list + counts
 */
import { buildOperatorReports, hourlyBuckets, type Employee } from "@/lib/analytics"
import { adminDb, usingEmulators } from "@/lib/firebase/admin"
import { COLLECTIONS, stationId } from "@/lib/firebase/schema"
import {
  generateDays,
  generateWorkers,
  STATIONS,
  TOTAL_DAYS,
} from "@/lib/testdata"
import { Timestamp, type Firestore } from "firebase-admin/firestore"

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
  // New layout + the legacy single-day `employees` collection.
  for (const group of ["sales", "reports", "roster", "employees"]) {
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
          .doc(String(worker.employeeId)),
        {
          employeeId: worker.employeeId,
          name: worker.name,
          department: worker.department,
          station: worker.station,
          active: worker.lastDay >= TOTAL_DAYS,
          hiredAt: Timestamp.fromDate(hired),
        }
      )
    }),
    "roster"
  )
  console.log(`  roster:    ${workers.length} workers`)

  // ------------------------------------------------- daily reports + sales
  let reportCount = 0
  let saleCount = 0
  const reportWrites: Write[] = []
  const saleWrites: Write[] = []

  for (const day of days) {
    // Group the day's sales per worker, then compute reports with the same
    // analytics engine the app uses.
    const salesByWorker = new Map<number, { soldAt: Date; amount: number }[]>()
    for (const sale of day.sales) {
      const list = salesByWorker.get(sale.employeeId)
      if (list) list.push(sale)
      else salesByWorker.set(sale.employeeId, [sale])
    }

    const employees: Employee[] = day.attendance.map((att) => {
      const worker = workerById.get(att.employeeId)!
      return {
        id: worker.employeeId,
        name: worker.name,
        department: worker.department,
        station: worker.station,
        entry: att.entry,
        exit: att.exit,
        sales: salesByWorker.get(att.employeeId) ?? [],
      }
    })

    for (const report of buildOperatorReports(employees)) {
      reportCount += 1
      reportWrites.push((batch) => {
        batch.set(
          db
            .collection(COLLECTIONS.stations)
            .doc(stationId(report.station))
            .collection(COLLECTIONS.reports)
            .doc(`${day.date}_${report.id}`),
          {
            date: day.date,
            employeeId: report.id,
            name: report.name,
            department: report.department,
            station: report.station,
            entry: Timestamp.fromDate(report.entry),
            exit: Timestamp.fromDate(report.exit),
            shift: report.shift,
            workingHours: report.workingHours,
            salesCount: report.salesCount,
            revenue: report.revenue,
            productivity: report.productivity,
            salesPerHour: report.salesPerHour,
            attendanceScore: report.attendanceScore,
            suspicious: report.suspicious,
            risk: report.risk,
            score: report.score,
            grade: report.grade,
            alerts: report.alerts.map((alert) => ({
              time: Timestamp.fromDate(alert.time),
              amount: alert.amount,
              reason: alert.reason,
            })),
            hourly: hourlyBuckets(report.sales),
          }
        )
      })
    }

    day.sales.forEach((sale, index) => {
      const worker = workerById.get(sale.employeeId)!
      saleCount += 1
      saleWrites.push((batch) => {
        batch.set(
          db
            .collection(COLLECTIONS.stations)
            .doc(stationId(worker.station))
            .collection(COLLECTIONS.sales)
            .doc(`${day.date}_${sale.employeeId}_${index}`),
          {
            date: day.date,
            employeeId: sale.employeeId,
            employeeName: worker.name,
            station: worker.station,
            soldAt: Timestamp.fromDate(sale.soldAt),
            amount: sale.amount,
          }
        )
      })
    })
  }

  await commitInBatches(db, reportWrites, "reports")
  console.log(`  reports:   ${reportCount} (over ${days.length} days)`)

  await commitInBatches(db, saleWrites, "sales")
  console.log(`  sales:     ${saleCount}`)

  // ---------------------------------------------------- per-station rollups
  // Station x day revenue totals in one small document, so "target from this
  // station's own average" is a single read instead of re-scanning history.
  const rollups: Record<string, Record<string, number>> = {}
  for (const day of days) {
    const byStation = new Map<string, number>()
    const attByWorker = new Set(day.attendance.map((a) => a.employeeId))
    for (const sale of day.sales) {
      if (!attByWorker.has(sale.employeeId)) continue
      const worker = workerById.get(sale.employeeId)!
      const id = stationId(worker.station)
      byStation.set(id, (byStation.get(id) ?? 0) + sale.amount)
    }
    for (const [id, revenue] of byStation) {
      ;(rollups[id] ??= {})[day.date] = Math.round(revenue * 100) / 100
    }
  }
  await db.collection(COLLECTIONS.meta).doc("rollups").set({ stationDaily: rollups })
  console.log(`  rollups:   ${Object.keys(rollups).length} stations x ${days.length} days`)

  // ------------------------------------------------------------- settings
  // Defaults mirror the historical constants; the admin settings UI (#16)
  // will edit this document instead of code.
  await db.collection(COLLECTIONS.settings).doc("global").set(
    {
      scheduledHours: 8,
      riskHighSuspicious: 2,
      riskMediumAttendance: 90,
      riskHighAttendance: 70,
      gradeBounds: { aPlus: 90, a: 80, b: 70, c: 60 },
      graceMinutes: 0,
      defaultLanguage: "az",
      updatedAt: now,
    },
    { merge: true }
  )
  console.log("  settings:  defaults written")

  // ----------------------------------------------------------------- meta
  await db
    .collection(COLLECTIONS.meta)
    .doc("import")
    .set({
      importedAt: now,
      source: "generated test data (lib/testdata.ts)",
      dates: days.map((d) => d.date),
      counts: {
        stations: STATIONS.length,
        workers: workers.length,
        reports: reportCount,
        sales: saleCount,
        days: days.length,
      },
    })

  console.log("Done.")
}

main().catch((error) => {
  console.error("\nSeed failed:", error instanceof Error ? error.message : error)
  process.exit(1)
})
