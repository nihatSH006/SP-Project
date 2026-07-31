/**
 * Staffing against busyness (idea #12).
 *
 * The question a station manager actually has is not "how busy were we" or
 * "how many people were on" — it is whether those two matched. A quiet hour
 * with four operators on the forecourt and a rush hour with one are both
 * expensive, and neither shows up in a revenue chart.
 *
 * So the cell value is a RATE: revenue per operator-hour actually worked.
 * High means the shift was stretched; low means people were standing idle.
 *
 * Two things this deliberately does NOT do:
 *
 * 1. It never attributes an hour to the shift's start day. A night shift
 *    beginning 22:00 Friday covers Saturday's small hours, and a coverage grid
 *    that files those under Friday would recommend staffing the wrong night.
 *    Every hour is counted against the clock hour and weekday it really was.
 * 2. It says nothing about individuals. This is a rota-planning tool, and the
 *    moment a cell can be traced to one named person it becomes a performance
 *    judgement built from a rate nobody controls — how many customers arrived.
 */

export type StaffingDay = {
  /** Shift span. May cross midnight. */
  entry: Date
  exit: Date
  station: string
}

export type StaffingSale = {
  soldAt: Date
  station: string
  amount: number
}

export type StaffingCell = {
  weekday: number
  hour: number
  revenue: number
  /** Operator-hours of coverage, so a half-hour overlap counts as 0.5. */
  operatorHours: number
  /** revenue ÷ operatorHours — the number worth acting on. */
  perOperatorHour: number
  /** Mean operators on the forecourt during this cell. */
  avgOperators: number
}

export type StaffingProfile = {
  station: string
  cells: StaffingCell[]
  /** Median of `perOperatorHour` across covered cells — the station's normal. */
  median: number
  busiestCell: StaffingCell | null
  quietestCell: StaffingCell | null
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const key = (weekday: number, hour: number) => weekday * 24 + hour

/**
 * A cell needs a real amount of coverage before its rate means anything. One
 * operator present for six minutes would otherwise produce a spectacular
 * revenue-per-hour and a recommendation to staff up.
 */
const MIN_OPERATOR_HOURS = 1

export function buildStaffingProfiles(
  shifts: StaffingDay[],
  sales: StaffingSale[]
): StaffingProfile[] {
  const stations = new Set<string>([
    ...shifts.map((s) => s.station),
    ...sales.map((s) => s.station),
  ])

  // How many times each weekday occurred, per station, so "average operators"
  // is per occurrence rather than per window.
  const weekdayCounts = new Map<string, Map<number, Set<string>>>()
  const dayStamp = (d: Date) =>
    `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

  const revenue = new Map<string, Map<number, number>>()
  const coverage = new Map<string, Map<number, number>>()

  const bump = (
    map: Map<string, Map<number, number>>,
    station: string,
    k: number,
    value: number
  ) => {
    const inner = map.get(station) ?? new Map<number, number>()
    inner.set(k, (inner.get(k) ?? 0) + value)
    map.set(station, inner)
  }

  for (const sale of sales) {
    bump(
      revenue,
      sale.station,
      key(sale.soldAt.getDay(), sale.soldAt.getHours()),
      sale.amount
    )
  }

  for (const shift of shifts) {
    // Walk the shift hour by hour so the coverage lands on the real clock
    // hours, midnight crossings included.
    let cursor = new Date(shift.entry)
    while (cursor < shift.exit) {
      const hourEnd = new Date(cursor)
      hourEnd.setMinutes(60, 0, 0)
      const sliceEnd = hourEnd < shift.exit ? hourEnd : shift.exit
      const hours = (sliceEnd.getTime() - cursor.getTime()) / 3_600_000

      if (hours > 0) {
        bump(coverage, shift.station, key(cursor.getDay(), cursor.getHours()), hours)

        const days = weekdayCounts.get(shift.station) ?? new Map()
        const set = days.get(cursor.getDay()) ?? new Set<string>()
        set.add(dayStamp(cursor))
        days.set(cursor.getDay(), set)
        weekdayCounts.set(shift.station, days)
      }
      cursor = sliceEnd
    }
  }

  const profiles: StaffingProfile[] = []
  for (const station of stations) {
    const cells: StaffingCell[] = []
    const stationRevenue = revenue.get(station) ?? new Map()
    const stationCoverage = coverage.get(station) ?? new Map()
    const days = weekdayCounts.get(station) ?? new Map()

    for (let weekday = 0; weekday < 7; weekday += 1) {
      const occurrences = days.get(weekday)?.size ?? 0
      for (let hour = 0; hour < 24; hour += 1) {
        const k = key(weekday, hour)
        const rev = stationRevenue.get(k) ?? 0
        const operatorHours = stationCoverage.get(k) ?? 0
        cells.push({
          weekday,
          hour,
          revenue: Math.round(rev),
          operatorHours: Math.round(operatorHours * 10) / 10,
          perOperatorHour:
            operatorHours >= MIN_OPERATOR_HOURS
              ? Math.round((rev / operatorHours) * 10) / 10
              : 0,
          avgOperators:
            occurrences > 0
              ? Math.round((operatorHours / occurrences) * 10) / 10
              : 0,
        })
      }
    }

    const covered = cells.filter((c) => c.operatorHours >= MIN_OPERATOR_HOURS)
    const rates = covered.map((c) => c.perOperatorHour)

    profiles.push({
      station,
      cells,
      median: Math.round(median(rates) * 10) / 10,
      busiestCell:
        covered.length > 0
          ? covered.reduce((a, b) => (b.perOperatorHour > a.perOperatorHour ? b : a))
          : null,
      quietestCell:
        covered.length > 0
          ? covered.reduce((a, b) => (b.perOperatorHour < a.perOperatorHour ? b : a))
          : null,
    })
  }

  return profiles.sort((a, b) => a.station.localeCompare(b.station))
}

/** Merge station profiles into one network-wide view. */
export function mergeProfiles(
  profiles: StaffingProfile[],
  label: string
): StaffingProfile {
  const revenue = new Map<number, number>()
  const coverage = new Map<number, number>()
  const operators = new Map<number, number>()

  for (const profile of profiles) {
    for (const cell of profile.cells) {
      const k = key(cell.weekday, cell.hour)
      revenue.set(k, (revenue.get(k) ?? 0) + cell.revenue)
      coverage.set(k, (coverage.get(k) ?? 0) + cell.operatorHours)
      operators.set(k, (operators.get(k) ?? 0) + cell.avgOperators)
    }
  }

  const cells: StaffingCell[] = []
  for (let weekday = 0; weekday < 7; weekday += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      const k = key(weekday, hour)
      const rev = revenue.get(k) ?? 0
      const operatorHours = coverage.get(k) ?? 0
      cells.push({
        weekday,
        hour,
        revenue: Math.round(rev),
        operatorHours: Math.round(operatorHours * 10) / 10,
        perOperatorHour:
          operatorHours >= MIN_OPERATOR_HOURS
            ? Math.round((rev / operatorHours) * 10) / 10
            : 0,
        avgOperators: Math.round((operators.get(k) ?? 0) * 10) / 10,
      })
    }
  }

  const covered = cells.filter((c) => c.operatorHours >= MIN_OPERATOR_HOURS)
  return {
    station: label,
    cells,
    median: Math.round(median(covered.map((c) => c.perOperatorHour)) * 10) / 10,
    busiestCell:
      covered.length > 0
        ? covered.reduce((a, b) => (b.perOperatorHour > a.perOperatorHour ? b : a))
        : null,
    quietestCell:
      covered.length > 0
        ? covered.reduce((a, b) => (b.perOperatorHour < a.perOperatorHour ? b : a))
        : null,
  }
}

/**
 * Cells worth acting on.
 *
 * The obvious version of this compares every cell against the station's
 * overall median — and then reports, six times over, that 02:00 is quieter
 * than average. That is true, unactionable and slightly dangerous: a 24-hour
 * forecourt cannot drop night cover, which exists for safety and single-manning
 * rules rather than for takings.
 *
 * So each cell is judged against the SAME HOUR on other days instead. "Saturday
 * 18:00 is far busier than a normal 18:00 but staffed the same" is a rota
 * change someone can actually make; "nights are quiet" is not.
 */
export type StaffingSuggestion = {
  weekday: number
  hour: number
  kind: "stretched" | "idle"
  perOperatorHour: number
  avgOperators: number
  /** Against the same hour on other weekdays, not against the whole week. */
  ratio: number
  hourBaseline: number
}

export function suggestions(
  profile: StaffingProfile,
  limit = 6
): StaffingSuggestion[] {
  // Baseline per hour-of-day, across the seven weekdays.
  const baselines = new Map<number, number>()
  for (let hour = 0; hour < 24; hour += 1) {
    const sameHour = profile.cells.filter(
      (c) => c.hour === hour && c.operatorHours >= MIN_OPERATOR_HOURS
    )
    baselines.set(hour, median(sameHour.map((c) => c.perOperatorHour)))
  }

  const out: StaffingSuggestion[] = []
  for (const cell of profile.cells) {
    if (cell.operatorHours < MIN_OPERATOR_HOURS) continue
    const baseline = baselines.get(cell.hour) ?? 0
    if (baseline <= 0) continue

    const ratio = cell.perOperatorHour / baseline
    // Wide bands on purpose: a rota changes a few times a year, so the only
    // useful output is the handful of hours that are clearly out of line.
    const entry = {
      weekday: cell.weekday,
      hour: cell.hour,
      perOperatorHour: cell.perOperatorHour,
      avgOperators: cell.avgOperators,
      ratio: Math.round(ratio * 100) / 100,
      hourBaseline: Math.round(baseline * 10) / 10,
    }
    if (ratio >= 1.4) out.push({ ...entry, kind: "stretched" })
    else if (ratio <= 0.65 && cell.avgOperators >= 1) {
      out.push({ ...entry, kind: "idle" })
    }
  }

  return out
    .sort((a, b) => Math.abs(b.ratio - 1) - Math.abs(a.ratio - 1))
    .slice(0, limit)
}
