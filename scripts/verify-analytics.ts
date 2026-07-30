/**
 * Parity check: the CSV -> analytics pipeline must reproduce the numbers the
 * Python prototype produced for the same operational day. Needs no Firebase, so
 * it can run before any project is provisioned.
 *
 *   npm run verify:analytics
 */
import {
  buildOperatorReports,
  collectAlerts,
  hourlyBuckets,
  mergeHourly,
  rankOperators,
  stationReports,
  summarise,
  toChartSeries,
  type Employee,
  type OperatorMetrics,
} from "@/lib/analytics"
import { readAttendance, readSales } from "@/lib/csv"

/** Values taken from the SASIS prototype for 27 Jul 2026. */
const EXPECTED = {
  operators: 20,
  transactions: 542,
  revenue: 63_373,
  stations: 5,
  alerts: 3,
  topOperator: "Kamran",
  bestStation: "Ganja Station",
  bestDepartment: "Fuel Sales",
  highRisk: 1,
}

let failures = 0

function expect(label: string, actual: unknown, expected: unknown) {
  const ok = actual === expected
  console.log(`  ${ok ? "✓" : "✗"} ${label}: ${actual}${ok ? "" : ` (expected ${expected})`}`)
  if (!ok) failures += 1
}

const attendance = readAttendance()
const sales = readSales()

const employees: Employee[] = attendance.map((row, index) => ({
  id: index + 1,
  name: row.name,
  department: row.department,
  station: row.station,
  entry: row.entry,
  exit: row.exit,
  sales: sales
    .filter((sale) => sale.employee === row.name)
    .map((sale) => ({ soldAt: sale.soldAt, amount: sale.amount })),
}))

const reports = buildOperatorReports(employees)
const summary = summarise(reports)

console.log("\nSASIS analytics parity — 27 Jul 2026")
expect("operators", summary.operators, EXPECTED.operators)
expect("transactions", summary.transactions, EXPECTED.transactions)
expect("revenue (rounded)", Math.round(summary.revenue), EXPECTED.revenue)
expect("stations", stationReports(reports).length, EXPECTED.stations)
expect("flagged sales", collectAlerts(reports).length, EXPECTED.alerts)
expect("top operator", summary.topOperator?.name, EXPECTED.topOperator)
expect("best station", summary.bestStation, EXPECTED.bestStation)
expect("best department", summary.bestDepartment, EXPECTED.bestDepartment)
expect("high-risk operators", summary.riskCounts.HIGH, EXPECTED.highRisk)

// The leaderboard's top three are what the podium renders.
const podium = rankOperators(reports)
  .slice(0, 3)
  .map((r) => r.name)
  .join(", ")
console.log(`  · podium: ${podium}`)

/*
 * Round-trip the read-optimised shape.
 *
 * Reports are now precomputed at import time and stored on the employee
 * document, so the dashboard reads ~20 documents instead of aggregating 542
 * sales per request. That is only safe if the stored shape reproduces the same
 * numbers — this asserts it does.
 */
console.log("\nStored-report round-trip (aggregate-on-write)")

type StoredShape = Omit<OperatorMetrics, never> & {
  hourly: { hour: number; revenue: number }[]
}

// Exactly what the seeder writes, minus the Firestore Timestamp wrappers.
const stored: StoredShape[] = reports.map((r) => ({
  id: r.id,
  name: r.name,
  department: r.department,
  station: r.station,
  shift: r.shift,
  entry: r.entry,
  exit: r.exit,
  workingHours: r.workingHours,
  salesCount: r.salesCount,
  revenue: r.revenue,
  productivity: r.productivity,
  salesPerHour: r.salesPerHour,
  attendanceScore: r.attendanceScore,
  suspicious: r.suspicious,
  risk: r.risk,
  score: r.score,
  grade: r.grade,
  alerts: r.alerts,
  hourly: hourlyBuckets(r.sales),
}))

const storedSummary = summarise(stored)
expect("revenue matches", Math.round(storedSummary.revenue), EXPECTED.revenue)
expect(
  "transactions match",
  storedSummary.transactions,
  EXPECTED.transactions
)
expect("alerts match", collectAlerts(stored).length, EXPECTED.alerts)
expect("stations match", stationReports(stored).length, EXPECTED.stations)
expect(
  "podium unchanged",
  rankOperators(stored).slice(0, 3).map((r) => r.name).join(", "),
  podium
)

// The fleet trend line is now merged from per-operator buckets rather than
// derived from raw sales; the totals must still agree.
const mergedTotal = mergeHourly(stored.map((r) => r.hourly)).reduce(
  (sum, p) => sum + p.revenue,
  0
)
expect(
  "hourly series totals to revenue",
  Math.round(mergedTotal),
  EXPECTED.revenue
)

const series = toChartSeries(mergeHourly(stored.map((r) => r.hourly)))
console.log(
  `  · fleet trend: ${series.length} hourly points, ${series[0]?.label} → ${series.at(-1)?.label}`
)

// Read volume is the whole point of the refactor.
const docsBefore = reports.length + sales.length
const docsAfter = reports.length
console.log(
  `  · documents per page load: ${docsBefore} -> ${docsAfter} (${(docsBefore / docsAfter).toFixed(0)}x fewer)`
)

console.log(
  failures === 0
    ? "\nAll parity checks passed.\n"
    : `\n${failures} parity check(s) FAILED.\n`
)
process.exit(failures === 0 ? 0 : 1)
