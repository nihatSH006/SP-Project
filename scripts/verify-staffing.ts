/**
 * Prove the staffing heatmap measures what it claims (idea #12).
 *
 *   npm run verify:staffing
 *
 * The load-bearing property is the midnight crossing: a night shift starting
 * 22:00 Friday covers Saturday's small hours, and filing those under Friday
 * would recommend staffing the wrong night. That is the kind of bug that looks
 * completely fine on a chart.
 */
import {
  buildStaffingProfiles,
  mergeProfiles,
  suggestions,
  type StaffingDay,
  type StaffingSale,
} from "@/lib/staffing"
import { generateDays, generateWorkers } from "@/lib/testdata"

let pass = 0
let fail = 0
const check = (label: string, ok: boolean, extra = "") => {
  console.log(`  ${ok ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`)
  if (ok) pass += 1
  else fail += 1
}

// ------------------------------------------------------ hand-built fixtures
console.log("\nCoverage lands on the real clock hour")
{
  // Friday 2026-07-03, 22:00 → Saturday 06:00.
  const shift: StaffingDay = {
    entry: new Date(2026, 6, 3, 22, 0, 0),
    exit: new Date(2026, 6, 4, 6, 0, 0),
    station: "S",
  }
  const [profile] = buildStaffingProfiles([shift], [])
  const at = (weekday: number, hour: number) =>
    profile.cells.find((c) => c.weekday === weekday && c.hour === hour)!

  check("the 22:00 hour is on Friday", at(5, 22).operatorHours === 1, `${at(5, 22).operatorHours}h`)
  check(
    "the 02:00 hour is on SATURDAY, not Friday",
    at(6, 2).operatorHours === 1 && at(5, 2).operatorHours === 0,
    `sat=${at(6, 2).operatorHours}h fri=${at(5, 2).operatorHours}h`
  )
  const total = profile.cells.reduce((sum, c) => sum + c.operatorHours, 0)
  check("all 8 hours are accounted for exactly once", total === 8, `${total}h`)
}

console.log("\nPartial hours are counted as fractions")
{
  const shift: StaffingDay = {
    entry: new Date(2026, 6, 6, 9, 30, 0),
    exit: new Date(2026, 6, 6, 11, 0, 0),
    station: "S",
  }
  const [profile] = buildStaffingProfiles([shift], [])
  const at = (hour: number) =>
    profile.cells.find((c) => c.weekday === 1 && c.hour === hour)!
  check("a half hour counts as 0.5", at(9).operatorHours === 0.5, `${at(9).operatorHours}`)
  check("a whole hour counts as 1", at(10).operatorHours === 1, `${at(10).operatorHours}`)
}

console.log("\nThe rate is revenue per operator-hour, not raw revenue")
{
  const hour = (h: number, station: string): StaffingDay => ({
    entry: new Date(2026, 6, 6, h, 0, 0),
    exit: new Date(2026, 6, 6, h + 1, 0, 0),
    station,
  })
  const sale = (h: number, station: string, amount: number): StaffingSale => ({
    soldAt: new Date(2026, 6, 6, h, 30, 0),
    station,
    amount,
  })

  // Same revenue, different headcount: one operator stretched, four idle.
  const profiles = buildStaffingProfiles(
    [hour(9, "Stretched"), hour(9, "Idle"), hour(9, "Idle"), hour(9, "Idle"), hour(9, "Idle")],
    [sale(9, "Stretched", 400), sale(9, "Idle", 400)]
  )
  const stretched = profiles.find((p) => p.station === "Stretched")!
  const idle = profiles.find((p) => p.station === "Idle")!
  const rateOf = (p: typeof stretched) =>
    p.cells.find((c) => c.weekday === 1 && c.hour === 9)!.perOperatorHour

  check(
    "identical revenue produces very different rates",
    rateOf(stretched) === 400 && rateOf(idle) === 100,
    `stretched=${rateOf(stretched)} idle=${rateOf(idle)}`
  )
}

console.log("\nThin coverage cannot manufacture a spike")
{
  // Six minutes of coverage and one sale: 0.1h would imply 5,000/hour.
  const shift: StaffingDay = {
    entry: new Date(2026, 6, 6, 9, 0, 0),
    exit: new Date(2026, 6, 6, 9, 6, 0),
    station: "S",
  }
  const [profile] = buildStaffingProfiles(
    [shift],
    [{ soldAt: new Date(2026, 6, 6, 9, 3, 0), station: "S", amount: 500 }]
  )
  const cell = profile.cells.find((c) => c.weekday === 1 && c.hour === 9)!
  check(
    "a six-minute shift does not report a 5,000/hour rush",
    cell.perOperatorHour === 0,
    `rate=${cell.perOperatorHour}`
  )
}


console.log("\nA quiet night is not a finding; an unusual night is")
{
  // Four weeks. Every day has cover at 03:00 and 18:00. The 03:00 hour always
  // takes very little — that is simply what nights are — and Saturday 18:00
  // takes double every other 18:00.
  const shifts: StaffingDay[] = []
  const sales: StaffingSale[] = []
  for (let d = 0; d < 28; d += 1) {
    const date = new Date(2026, 6, 1 + d)
    const isSaturday = date.getDay() === 6
    for (const [start, end] of [[2, 4], [17, 19]] as const) {
      shifts.push({
        entry: new Date(2026, 6, 1 + d, start, 0, 0),
        exit: new Date(2026, 6, 1 + d, end, 0, 0),
        station: "F",
      })
    }
    sales.push({ soldAt: new Date(2026, 6, 1 + d, 3, 30, 0), station: "F", amount: 50 })
    sales.push({
      soldAt: new Date(2026, 6, 1 + d, 18, 30, 0),
      station: "F",
      amount: isSaturday ? 1000 : 500,
    })
  }

  const [profile] = buildStaffingProfiles(shifts, sales)
  const found = suggestions(profile)
  const nightFlagged = found.filter((s) => s.hour === 3)
  const saturdayEvening = found.find((s) => s.hour === 18 && s.weekday === 6)

  check(
    "a uniformly quiet 03:00 is NOT flagged",
    nightFlagged.length === 0,
    `night rate ${profile.cells.find((c) => c.hour === 3 && c.weekday === 1)!.perOperatorHour} vs evening ${profile.cells.find((c) => c.hour === 18 && c.weekday === 1)!.perOperatorHour}`
  )
  check(
    "…even though it is 10x below the evening rate",
    profile.cells.find((c) => c.hour === 3 && c.weekday === 1)!.perOperatorHour <
      profile.cells.find((c) => c.hour === 18 && c.weekday === 1)!.perOperatorHour / 5
  )
  check(
    "an unusually busy Saturday 18:00 IS flagged",
    Boolean(saturdayEvening) && saturdayEvening!.kind === "stretched",
    saturdayEvening ? `x${saturdayEvening.ratio} vs the usual ${saturdayEvening.hourBaseline}` : "not found"
  )
}

// ------------------------------------------------------------ full dataset
console.log("\nAgainst the full dataset")
const workers = generateWorkers()
const byId = new Map(workers.map((w) => [w.employeeId, w]))
const days = generateDays(workers, new Date(2026, 6, 30))

const shifts: StaffingDay[] = []
const sales: StaffingSale[] = []
for (const day of days) {
  for (const att of day.attendance) {
    const worker = byId.get(att.employeeId)!
    shifts.push({ entry: att.entry, exit: att.exit, station: worker.station })
  }
  for (const sale of day.sales) {
    const worker = byId.get(sale.employeeId)!
    sales.push({ soldAt: sale.soldAt, station: worker.station, amount: sale.amount })
  }
}

const profiles = buildStaffingProfiles(shifts, sales)
const network = mergeProfiles(profiles, "Network")

check("every station has a profile", profiles.length === 8, `${profiles.length}`)
check("each profile is a full week × 24 hours", profiles.every((p) => p.cells.length === 168))

const covered = network.cells.filter((c) => c.operatorHours >= 1)
check("most of the week has coverage", covered.length > 100, `${covered.length}/168 cells`)

// Overnight must be visibly quieter per operator than the daytime peak, or the
// heatmap is not measuring demand at all.
const nightRate = median(
  network.cells.filter((c) => c.hour >= 1 && c.hour <= 4 && c.operatorHours >= 1).map((c) => c.perOperatorHour)
)
const dayRate = median(
  network.cells.filter((c) => c.hour >= 8 && c.hour <= 18 && c.operatorHours >= 1).map((c) => c.perOperatorHour)
)
check("daytime is busier per operator than the small hours", dayRate > nightRate, `day=${dayRate.toFixed(0)} night=${nightRate.toFixed(0)}`)

const suggested = suggestions(network)
check("the network view surfaces actionable hours", suggested.length > 0, `${suggested.length}`)
check(
  "no suggestion comes from a cell with negligible coverage",
  suggested.every((s) => s.avgOperators > 0)
)

function median(values: number[]): number {
  if (!values.length) return 0
  const s = [...values].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
console.log("\nNetwork suggestions")
for (const s of suggested) {
  console.log(
    `   ${s.kind === "stretched" ? "STRETCHED" : "IDLE     "} ${DAYS[s.weekday]} ${String(s.hour).padStart(2, "0")}:00 — ${s.perOperatorHour}/operator-hour (×${s.ratio} vs the usual ${s.hourBaseline} at this hour), ~${s.avgOperators} on shift`
  )
}

console.log(`\n${pass} passed, ${fail} failed\n`)
process.exit(fail ? 1 : 0)
