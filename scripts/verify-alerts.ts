/**
 * Prove the obvious-alert engine finds every planted anomaly and — because
 * these alerts are database FACTS, not statistics — flags NOBODY else.
 *
 *   npm run verify:alerts
 */
import {
  detectWorkerDayAlerts,
  type ObviousAlertId,
} from "@/lib/pos"
import {
  generateDays,
  generateWorkers,
  plantNames,
  type AnomalyPlant,
} from "@/lib/testdata"

const END = new Date(2026, 6, 30)

let pass = 0
let fail = 0
const check = (label: string, ok: boolean, extra = "") => {
  console.log(`  ${ok ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`)
  if (ok) pass += 1
  else fail += 1
}

const workers = generateWorkers()
const days = generateDays(workers, END)
const byId = new Map(workers.map((w) => [w.employeeId, w]))
const plants = plantNames()

const daysByWorkerType = new Map<string, Map<ObviousAlertId, number>>()
let operatorDays = 0

for (const day of days) {
  const taps = new Map<number, { at: number; type: number }[]>()
  for (const tap of day.taps) {
    const list = taps.get(tap.employeeId) ?? []
    list.push({ at: tap.at.getTime(), type: tap.type })
    taps.set(tap.employeeId, list)
  }
  const sales = new Map<number, { at: number; db1Id: string; kartNo: string; vNo: string; litres: number; grade: string; amount: number }[]>()
  for (const sale of day.sales) {
    const list = sales.get(sale.employeeId) ?? []
    list.push({
      at: sale.at.getTime(),
      db1Id: sale.db1Id,
      kartNo: sale.kartNo,
      vNo: sale.vNo,
      litres: sale.litres,
      grade: sale.grade,
      amount: sale.amount,
    })
    sales.set(sale.employeeId, list)
  }

  const attended = new Set([...taps.keys(), ...sales.keys()])
  for (const id of attended) {
    operatorDays += 1
    const worker = byId.get(id)!
    const alerts = detectWorkerDayAlerts(taps.get(id) ?? [], sales.get(id) ?? [])
    const perType =
      daysByWorkerType.get(worker.name) ?? new Map<ObviousAlertId, number>()
    for (const type of new Set(alerts.map((a) => a.type))) {
      perType.set(type, (perType.get(type) ?? 0) + 1)
    }
    daysByWorkerType.set(worker.name, perType)
  }
}

console.log(`\nRan over ${operatorDays} worker-days, ${workers.length} workers`)

// ------------------------------------------------------- planted anomalies
console.log("\nPlanted anomalies are caught")
const EXPECTED: Record<Exclude<AnomalyPlant, "none">, ObviousAlertId> = {
  "forgets-out": "missing-out",
  "no-in": "missing-in",
  "double-tap-in": "double-tap-in",
  "double-tap-out": "double-tap-out",
  "late-seller": "sale-off-clock",
  phantom: "no-taps-sales",
}

for (const [name, plant] of Object.entries(plants)) {
  const want = EXPECTED[plant as Exclude<AnomalyPlant, "none">]
  const got = daysByWorkerType.get(name)?.get(want) ?? 0
  check(`${name} (${plant}) raises "${want}"`, got >= 3, `${got} day(s)`)
}

// ------------------------------------------------- zero false positives
console.log("\nNobody else is flagged — these are facts, not statistics")
const innocent = workers.filter((w) => w.anomaly === "none")
const flaggedInnocents = innocent.filter(
  (w) => (daysByWorkerType.get(w.name)?.size ?? 0) > 0
)
check(
  "ZERO innocent workers raise any alert at all",
  flaggedInnocents.length === 0,
  `${flaggedInnocents.length}/${innocent.length}${
    flaggedInnocents.length
      ? ": " + flaggedInnocents.map((w) => w.name).join(", ")
      : ""
  }`
)

// ------------------------------------------------------------- totals
console.log("\nAlert volume by type")
const totals = new Map<string, number>()
for (const perType of daysByWorkerType.values()) {
  for (const [type, n] of perType) totals.set(type, (totals.get(type) ?? 0) + n)
}
for (const [type, n] of [...totals.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`   ${type.padEnd(16)} ${n}`)
}

console.log(`\n${pass} passed, ${fail} failed\n`)
process.exit(fail ? 1 : 0)
