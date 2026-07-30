/**
 * Prove the import validator catches bad data (idea #14).
 *
 *   npm run verify:import
 *
 * A validator that only ever passes is worthless, so each case here feeds it
 * data that is deliberately broken and asserts the right code is raised.
 */
import { validateImport } from "@/lib/import-validation"

const NOW = new Date(2026, 6, 30)

const shift = (name: string, day: number, from = 6, to = 14) => ({
  name,
  department: "Fuel Sales",
  station: "Baku Station 1",
  entry: new Date(2026, 6, day, from, 0, 0),
  exit: new Date(2026, 6, day, to, 0, 0),
})

const sale = (employee: string, day: number, hour: number, amount = 50) => ({
  employee,
  soldAt: new Date(2026, 6, day, hour, 30, 0),
  amount,
})

let pass = 0
let fail = 0

function expectCode(
  label: string,
  result: ReturnType<typeof validateImport>,
  code: string,
  severity: "error" | "warning"
) {
  const found = result.issues.find((i) => i.code === code)
  const ok = Boolean(found) && found!.severity === severity
  console.log(
    `  ${ok ? "✓" : "✗"} ${label}` +
      (ok ? ` — ${severity} (${found!.count})` : `  [expected ${severity} ${code}]`)
  )
  if (ok) pass += 1
  else fail += 1
}

function expectOk(label: string, result: ReturnType<typeof validateImport>, want: boolean) {
  const ok = result.ok === want
  console.log(`  ${ok ? "✓" : "✗"} ${label} — ok=${result.ok}`)
  if (ok) pass += 1
  else fail += 1
}

console.log("\nClean import")
const clean = validateImport({
  attendance: [shift("Ali", 30), shift("Leyla", 30, 14, 22)],
  sales: [sale("Ali", 30, 8), sale("Leyla", 30, 16)],
  now: NOW,
})
expectOk("passes", clean, true)
console.log(`  · stats: ${clean.stats.employees} employees, ${clean.stats.salesRows} sales, ${clean.stats.totalRevenue} AZN`)

console.log("\nBLOCKING errors")
expectCode(
  "same operator imported twice on one day",
  validateImport({
    attendance: [shift("Ali", 30), shift("Ali", 30)],
    sales: [sale("Ali", 30, 8)],
    now: NOW,
  }),
  "duplicate-shift",
  "error"
)
expectCode(
  "shift ends before it starts",
  validateImport({
    attendance: [shift("Ali", 30, 14, 6)],
    sales: [sale("Ali", 30, 8)],
    now: NOW,
  }),
  "invalid-shift-window",
  "error"
)
expectCode(
  "negative sale amount",
  validateImport({
    attendance: [shift("Ali", 30)],
    sales: [sale("Ali", 30, 8, -20)],
    now: NOW,
  }),
  "invalid-amount",
  "error"
)
expectCode(
  "unreadable timestamp",
  validateImport({
    attendance: [shift("Ali", 30)],
    sales: [{ employee: "Ali", soldAt: new Date("nonsense"), amount: 10 }],
    now: NOW,
  }),
  "sale-unparseable-date",
  "error"
)
expectCode(
  "empty sales file",
  validateImport({ attendance: [shift("Ali", 30)], sales: [], now: NOW }),
  "no-sales",
  "error"
)
expectOk(
  "an import with errors is blocked",
  validateImport({
    attendance: [shift("Ali", 30), shift("Ali", 30)],
    sales: [sale("Ali", 30, 8)],
    now: NOW,
  }),
  false
)

console.log("\nWARNINGS (recorded, not blocking)")
expectCode(
  "sale for someone with no shift",
  validateImport({
    attendance: [shift("Ali", 30)],
    sales: [sale("Ghost", 30, 8)],
    now: NOW,
  }),
  "unknown-employee",
  "warning"
)
expectCode(
  "identical duplicated sale row",
  validateImport({
    attendance: [shift("Ali", 30)],
    sales: [sale("Ali", 30, 8), sale("Ali", 30, 8)],
    now: NOW,
  }),
  "duplicate-sale",
  "warning"
)
expectCode(
  "implausibly large single sale",
  validateImport({
    attendance: [shift("Ali", 30)],
    sales: [sale("Ali", 30, 8, 99_999)],
    now: NOW,
  }),
  "implausible-amount",
  "warning"
)
expectCode(
  "24-hour shift",
  validateImport({
    attendance: [shift("Ali", 30, 0, 23)],
    sales: [sale("Ali", 30, 8)],
    now: NOW,
  }),
  "implausible-shift-length",
  "warning"
)
expectCode(
  "gap in the operational calendar",
  validateImport({
    attendance: [shift("Ali", 30)],
    sales: [sale("Ali", 30, 8)],
    existingDates: ["2026-07-20"],
    now: NOW,
  }),
  "missing-days",
  "warning"
)
expectCode(
  "re-importing a day that already exists",
  validateImport({
    attendance: [shift("Ali", 30)],
    sales: [sale("Ali", 30, 8)],
    existingDates: ["2026-07-30"],
    now: NOW,
  }),
  "already-imported",
  "warning"
)
expectCode(
  "day in the future",
  validateImport({
    attendance: [shift("Ali", 31)],
    sales: [sale("Ali", 31, 8)],
    now: NOW,
  }),
  "future-date",
  "warning"
)
expectOk(
  "warnings alone do not block the import",
  validateImport({
    attendance: [shift("Ali", 30)],
    sales: [sale("Ali", 30, 8), sale("Ghost", 30, 9)],
    now: NOW,
  }),
  true
)

console.log(`\n${pass} passed, ${fail} failed\n`)
process.exit(fail ? 1 : 0)
