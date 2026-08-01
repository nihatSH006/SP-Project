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
import { validateImport } from "@/lib/import-validation"
import { runFraudRules, scoreFraud, summariseOperator, type FraudVerdict } from "@/lib/fraud-rules"
import { buildFraudInputs } from "@/lib/fraud-context"
import { buildScorecards, type ScorecardDay } from "@/lib/scorecards"
import {
  buildStaffingProfiles,
  type StaffingDay,
  type StaffingSale,
} from "@/lib/staffing"
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
  //
  // `cases` is cleared here because a seed is a full rebuild of a synthetic
  // dataset. A real incremental import MUST NOT do this: a case carries human
  // triage — who owns it, what they concluded — which no importer may discard.
  for (const group of ["sales", "reports", "roster", "employees", "cases", "scorecards", "staffing"]) {
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

  // ------------------------------------------------------------ validation
  // Check before writing: a bad import does not fail loudly, it produces a
  // plausible-looking day of wrong scores and fraud flags (idea #14).
  const validation = validateImport({
    attendance: days.flatMap((day) =>
      day.attendance.map((a) => {
        const w = workerById.get(a.employeeId)!
        return {
          name: `${w.name}#${day.date}`, // per-day identity: one shift per day
          department: w.department,
          station: w.station,
          entry: a.entry,
          exit: a.exit,
        }
      })
    ),
    sales: days.flatMap((day) =>
      day.sales.map((sale) => ({
        employee: `${workerById.get(sale.employeeId)!.name}#${day.date}`,
        soldAt: sale.soldAt,
        amount: sale.amount,
      }))
    ),
    now: new Date(END_DATE.getFullYear(), END_DATE.getMonth(), END_DATE.getDate()),
  })

  const errors = validation.issues.filter((i) => i.severity === "error")
  const warnings = validation.issues.filter((i) => i.severity === "warning")

  console.log(
    `  validation: ${validation.stats.attendanceRows} shifts, ` +
      `${validation.stats.salesRows} sales, ${errors.length} error(s), ` +
      `${warnings.length} warning(s)`
  )
  for (const i of validation.issues) {
    console.log(`    [${i.severity}] ${i.code}: ${i.message} (${i.count})`)
    if (i.samples.length) console.log(`        e.g. ${i.samples.slice(0, 2).join("; ")}`)
  }

  if (!validation.ok && !process.argv.includes("--force")) {
    throw new Error(
      "Import blocked by validation errors. Fix the data, or re-run with --force to write it anyway."
    )
  }

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
  // Fraud rules run HERE, at import time, not when a page is opened. Two
  // reasons: the rules need peer/hourly context spanning every day (far too
  // much to read per request), and a case must show the evidence as it stood
  // when it was raised rather than silently re-scoring itself later.
  const fraudInputs = buildFraudInputs(days, workerById)
  let caseCount = 0
  const caseWrites: Write[] = []
  // Daily verdicts accumulate per operator; cases are opened after every day
  // has been scored, because persistence across days is the actual signal.
  const verdictsByWorker = new Map<number, { date: string; verdict: FraudVerdict }[]>()
  // Facts the fair leaderboard scores against peers (idea #11).
  const scorecardRows: ScorecardDay[] = []
  // Coverage vs demand (idea #12). Every hour is attributed to the clock hour
  // it really was, so a night shift's small hours land on the next day.
  const staffingShifts: StaffingDay[] = []
  const staffingSales: StaffingSale[] = []
  // Alert totals, per station and overall. The nav badge needs "how many
  // alerts are there"; scanning every day's reports on each page load to
  // answer it would cost ~1,800 documents for one number in a pill.
  const alertsByStation: Record<string, number> = {}
  let alertsTotal = 0
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
      const input = fraudInputs.get(`${day.date}|${report.id}`)
      const verdict = input ? scoreFraud(runFraudRules(input)) : null
      const fraud = verdict
        ? {
            score: verdict.score,
            proposed: verdict.proposed,
            hits: verdict.hits.map((hit) => ({
              rule: hit.rule,
              severity: hit.severity,
              category: hit.category,
              count: hit.count,
              score: hit.score,
              overnight: hit.overnight,
              // CCTV pointers travel with the hit so an investigator never
              // has to reconstruct which minutes to pull (idea #9).
              windows: hit.detail.windows ?? [],
              ...(hit.detail.values ? { values: hit.detail.values } : {}),
              ...(hit.detail.baseline !== undefined
                ? { baseline: hit.detail.baseline }
                : {}),
              ...(hit.detail.observed !== undefined
                ? { observed: hit.detail.observed }
                : {}),
            })),
          }
        : null

      alertsTotal += report.suspicious
      const stationKey = stationId(report.station)
      alertsByStation[stationKey] =
        (alertsByStation[stationKey] ?? 0) + report.suspicious

      scorecardRows.push({
        date: day.date,
        employeeId: report.id,
        station: report.station,
        shift: report.shift,
        revenue: report.revenue,
        attendanceScore: report.attendanceScore,
        productivity: report.productivity,
      })

      if (verdict) {
        const list = verdictsByWorker.get(report.id) ?? []
        list.push({ date: day.date, verdict })
        verdictsByWorker.set(report.id, list)
      }

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
            ...(fraud ? { fraud } : {}),
          }
        )
      })
    }

    for (const att of day.attendance) {
      const worker = workerById.get(att.employeeId)!
      staffingShifts.push({
        entry: att.entry,
        exit: att.exit,
        station: worker.station,
      })
    }
    for (const sale of day.sales) {
      const worker = workerById.get(sale.employeeId)!
      staffingSales.push({
        soldAt: sale.soldAt,
        station: worker.station,
        amount: sale.amount,
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

  // ------------------------------------------------------------ fraud cases
  // Opened only after the whole window is scored. `summariseOperator` applies
  // the persistence multiplier — one bad day never opens a case.
  const allDates = days.map((d) => d.date).sort()
  for (const [employeeId, entries] of verdictsByWorker) {
    const summary = summariseOperator(entries.map((e) => e.verdict))
    if (summary.proposed === "LOW") continue
    const worker = workerById.get(employeeId)!
    const flagged = entries
      .filter((e) => e.verdict.hits.some((h) => h.category === "integrity"))
      .map((e) => e.date)
      .sort()
      .reverse()
    caseCount += 1
    caseWrites.push((batch) => {
      batch.set(
        db
          .collection(COLLECTIONS.stations)
          .doc(stationId(worker.station))
          .collection(COLLECTIONS.cases)
          .doc(String(employeeId)),
        {
          employeeId,
          employeeName: worker.name,
          station: worker.station,
          fromDate: allDates[0],
          toDate: allDates[allDates.length - 1],
          proposedRisk: summary.proposed,
          score: summary.weightedScore,
          flaggedDays: summary.flaggedDays,
          repeatsByRule: summary.repeatsByRule,
          dates: flagged,
          status: "open",
          assignedTo: null,
          note: "",
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          updatedBy: null,
        }
      )
    })
  }

  // ------------------------------------------------------------ scorecards
  // Everyone is scored against what their own station and shift normally
  // takes, so the ranking measures how someone worked rather than where they
  // were rostered.
  const scorecards = buildScorecards(
    scorecardRows,
    new Map(workers.map((w) => [w.employeeId, w.name]))
  )
  const scorecardWrites: Write[] = scorecards.map((card) => (batch) => {
    batch.set(
      db
        .collection(COLLECTIONS.stations)
        .doc(stationId(card.station))
        .collection(COLLECTIONS.scorecards)
        .doc(String(card.employeeId)),
      {
        ...card,
        fromDate: allDates[0],
        toDate: allDates[allDates.length - 1],
        updatedAt: Timestamp.now(),
      }
    )
  })

  await commitInBatches(db, caseWrites, "cases")
  console.log(`  cases:     ${caseCount} opened for review`)

  const staffingProfiles = buildStaffingProfiles(staffingShifts, staffingSales)
  const staffingWrites: Write[] = staffingProfiles.map((profile) => (batch) => {
    batch.set(
      db
        .collection(COLLECTIONS.stations)
        .doc(stationId(profile.station))
        .collection(COLLECTIONS.staffing)
        .doc("profile"),
      {
        station: profile.station,
        fromDate: allDates[0],
        toDate: allDates[allDates.length - 1],
        median: profile.median,
        cells: profile.cells,
        updatedAt: Timestamp.now(),
      }
    )
  })

  await commitInBatches(db, scorecardWrites, "scorecards")
  console.log(`  scorecards: ${scorecards.length}`)

  await db.collection(COLLECTIONS.meta).doc("alerts").set({
    total: alertsTotal,
    byStation: alertsByStation,
    updatedAt: Timestamp.now(),
  })
  console.log(`  alerts:    ${alertsTotal} across ${days.length} days`)

  await commitInBatches(db, staffingWrites, "staffing")
  console.log(`  staffing:  ${staffingProfiles.length} station profiles`)

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
  const manifest = {
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
    validation: {
      ok: validation.ok,
      errors: errors.length,
      warnings: warnings.length,
      issues: validation.issues,
    },
    durationMs: Date.now() - startedAt,
  }

  await db.collection(COLLECTIONS.meta).doc("import").set(manifest)

  // Audit trail: one immutable record per run, so a bad day can be traced back
  // to the import that produced it.
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
