/**
 * Analytics engine — computes every metric the dashboard shows.
 *
 * Business rules ported verbatim from the SASIS Python prototype
 * (`app/analytics.py`); keep them in sync if the rules change:
 * - Shift from entry hour:  <12 Morning, <17 Evening, otherwise Night
 * - Suspicious sale = sale timestamp outside the operator's entry/exit window
 * - Attendance score = worked hours vs an 8-hour scheduled shift (capped at 100)
 * - Risk:  >=2 suspicious sales -> HIGH; 1 suspicious or attendance <90 -> MEDIUM;
 *          attendance <70 -> HIGH; otherwise LOW
 * - Performance score = (attendance + min(productivity / 15, 100)) / 2
 * - Operational health = 100 - (10 x suspicious sales), floor 0
 * - Daily revenue target: set by the admin per station (see lib/settings.ts).
 *   The old formula was max(revenue x 1.15, 60000), which derived the target
 *   from the revenue it measured and so always reported exactly 87%.
 */

import { DEFAULT_SETTINGS, type Settings } from "@/lib/settings"

/** @deprecated Use `settings.scheduledHours` — kept for display fallbacks. */
export const SCHEDULED_HOURS = DEFAULT_SETTINGS.scheduledHours
export const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const
export const SHIFTS = ["Morning", "Evening", "Night"] as const

export type RiskLevel = (typeof RISK_LEVELS)[number]
export type Shift = (typeof SHIFTS)[number]

export type Employee = {
  id: number
  name: string
  department: string
  station: string
  entry: Date
  exit: Date
  sales: { soldAt: Date; amount: number }[]
}

export type OperatorAlert = {
  operatorId: number
  operator: string
  station: string
  time: Date
  amount: number
  reason: string
}

/**
 * An operator's computed metrics, without the raw sales that produced them.
 * Everything the dashboard renders is in here, so the stored (read-optimised)
 * shape and the freshly-computed one can share every helper below.
 */
export type OperatorMetrics = {
  id: number
  name: string
  department: string
  station: string
  shift: Shift
  entry: Date
  exit: Date
  workingHours: number
  salesCount: number
  revenue: number
  /** AZN per working hour. */
  productivity: number
  salesPerHour: number
  /** 0-100. */
  attendanceScore: number
  suspicious: number
  risk: RiskLevel
  /** 0-100 blended performance score. */
  score: number
  /** A+ .. D */
  grade: string
  alerts: OperatorAlert[]
}

/** Metrics plus the raw sales — only the importer needs this. */
export type OperatorReport = OperatorMetrics & {
  sales: { soldAt: Date; amount: number }[]
}

export type StationReport = {
  name: string
  employees: number
  revenue: number
  transactions: number
  alerts: number
  productivity: number
  attendance: number
  health: number
}

export type Summary = {
  operators: number
  revenue: number
  transactions: number
  avgProductivity: number
  avgAttendance: number
  alerts: number
  health: number
  /** 0 when no target is configured — check `hasTarget` before showing it. */
  target: number
  targetPct: number
  hasTarget: boolean
  topOperator: OperatorMetrics | null
  bestStation: string | null
  bestDepartment: string | null
  riskCounts: Record<RiskLevel, number>
}

export type Filters = {
  station: string | null
  department: string | null
  shift: Shift | null
}

const round = (value: number, digits = 0) => {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function shiftFor(entry: Date): Shift {
  const hour = entry.getHours()
  if (hour < 12) return "Morning"
  if (hour < 17) return "Evening"
  return "Night"
}

function gradeFor(score: number, settings: Settings): string {
  const g = settings.gradeBounds
  if (score >= g.aPlus) return "A+"
  if (score >= g.a) return "A"
  if (score >= g.b) return "B"
  if (score >= g.c) return "C"
  return "D"
}

/** The measured facts a report stores; everything else is policy. */
export type MeasuredMetrics = {
  workingHours: number
  productivity: number
  suspicious: number
}

/** Policy-dependent values, derived from measurements + admin settings. */
export type DerivedScores = {
  attendanceScore: number
  risk: RiskLevel
  score: number
  grade: string
}

/**
 * Apply the admin's business rules to one operator's measurements.
 *
 * Called both when importing (to store a snapshot) and on every read (so a
 * settings change is reflected instantly, without recomputing stored docs).
 */
export function deriveScores(
  { workingHours, productivity, suspicious }: MeasuredMetrics,
  settings: Settings = DEFAULT_SETTINGS
): DerivedScores {
  const attendanceScore = Math.min(
    100,
    Math.round((workingHours / settings.scheduledHours) * 100)
  )

  let risk: RiskLevel = "LOW"
  if (suspicious >= settings.riskHighSuspicious) risk = "HIGH"
  else if (suspicious >= 1 || attendanceScore < settings.riskMediumAttendance) {
    risk = "MEDIUM"
  }
  if (attendanceScore < settings.riskHighAttendance) risk = "HIGH"

  const score = Math.round(
    (attendanceScore +
      Math.min((productivity / settings.productivityTarget), 100)) /
      2
  )

  return { attendanceScore, risk, score, grade: gradeFor(score, settings) }
}

/** One report row per operator, computed from attendance + sales. */
export function buildOperatorReports(
  employees: Employee[],
  settings: Settings = DEFAULT_SETTINGS
): OperatorReport[] {
  const reports: OperatorReport[] = []

  for (const emp of employees) {
    const workingHours =
      (emp.exit.getTime() - emp.entry.getTime()) / (1000 * 60 * 60)
    if (workingHours <= 0) continue

    const revenue = emp.sales.reduce((sum, s) => sum + s.amount, 0)
    const salesCount = emp.sales.length

    const alerts: OperatorAlert[] = emp.sales
      .filter((s) => s.soldAt < emp.entry || s.soldAt > emp.exit)
      .map((s) => ({
        operatorId: emp.id,
        operator: emp.name,
        station: emp.station,
        time: s.soldAt,
        amount: s.amount,
        reason: "Sale recorded outside working hours",
      }))
    const suspicious = alerts.length

    const productivity = round(revenue / workingHours, 2)
    const salesPerHour = round(salesCount / workingHours, 2)

    const { attendanceScore, risk, score, grade } = deriveScores(
      { workingHours, productivity, suspicious },
      settings
    )

    reports.push({
      id: emp.id,
      name: emp.name,
      department: emp.department,
      station: emp.station,
      shift: shiftFor(emp.entry),
      entry: emp.entry,
      exit: emp.exit,
      workingHours: round(workingHours, 2),
      salesCount,
      revenue: round(revenue, 2),
      productivity,
      salesPerHour,
      attendanceScore,
      suspicious,
      risk,
      score,
      grade,
      alerts,
      sales: emp.sales,
    })
  }

  return reports
}

export function applyFilters<T extends OperatorMetrics>(
  reports: T[],
  { station, department, shift }: Filters
): T[] {
  let out = reports
  if (station) out = out.filter((r) => r.station === station)
  if (department) out = out.filter((r) => r.department === department)
  if (shift) out = out.filter((r) => r.shift === shift)
  return out
}

/** One point per hour of the operational day. Powers the trend charts. */
export type HourlyPoint = {
  /** Epoch ms of the hour bucket — kept so series can be merged and sorted. */
  hour: number
  revenue: number
}

/**
 * Bucket an operator's sales by hour. Computed once at import time and stored on
 * the operator's report, so rendering a chart never has to read raw sales.
 */
export function hourlyBuckets(
  sales: { soldAt: Date; amount: number }[]
): HourlyPoint[] {
  const buckets = new Map<number, number>()

  for (const sale of sales) {
    const bucket = new Date(sale.soldAt)
    bucket.setMinutes(0, 0, 0)
    const key = bucket.getTime()
    buckets.set(key, (buckets.get(key) ?? 0) + sale.amount)
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([hour, revenue]) => ({ hour, revenue: round(revenue, 2) }))
}

/** Combine per-operator hourly series into one chronological fleet series. */
export function mergeHourly(series: HourlyPoint[][]): HourlyPoint[] {
  const buckets = new Map<number, number>()
  for (const points of series) {
    for (const point of points) {
      buckets.set(point.hour, (buckets.get(point.hour) ?? 0) + point.revenue)
    }
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([hour, revenue]) => ({ hour, revenue: round(revenue, 2) }))
}

/** Chart-ready shape: `HH:MM` labels against revenue. */
export function toChartSeries(
  points: HourlyPoint[]
): { label: string; revenue: number }[] {
  return points.map(({ hour, revenue }) => ({
    label: new Date(hour).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    revenue,
  }))
}

const emptyRiskCounts = (): Record<RiskLevel, number> => ({
  LOW: 0,
  MEDIUM: 0,
  HIGH: 0,
})

/** Fleet-level KPIs for whatever slice of operators is passed in. */
/**
 * Sum the per-station daily targets for the stations present in this slice.
 *
 * Returns null when no target basis is available, so the caller can say "no
 * target set" instead of inventing one — the failure mode of the old formula.
 */
export function targetForSlice(
  reports: OperatorMetrics[],
  settings: Settings,
  stationIdOf: (stationName: string) => string
): number | null {
  const stations = [...new Set(reports.map((r) => r.station))]
  if (stations.length === 0) return null
  if (settings.targetMode !== "manual") return null // baseline handled by caller

  return stations.reduce((sum, name) => {
    const id = stationIdOf(name)
    const target =
      settings.stationDailyTargets[id] ?? settings.defaultStationDailyTarget
    return sum + target
  }, 0)
}

export function summarise(
  reports: OperatorMetrics[],
  /** Total revenue target for this slice; null when none is configured. */
  target: number | null = null
): Summary {
  if (reports.length === 0) {
    return {
      operators: 0,
      revenue: 0,
      transactions: 0,
      avgProductivity: 0,
      avgAttendance: 0,
      alerts: 0,
      health: 100,
      target: target ?? 0,
      targetPct: 0,
      hasTarget: target !== null && target > 0,
      topOperator: null,
      bestStation: null,
      bestDepartment: null,
      riskCounts: emptyRiskCounts(),
    }
  }

  const revenue = reports.reduce((sum, r) => sum + r.revenue, 0)
  const alerts = reports.reduce((sum, r) => sum + r.suspicious, 0)

  const stationRev = new Map<string, number>()
  const deptRev = new Map<string, number>()
  for (const r of reports) {
    stationRev.set(r.station, (stationRev.get(r.station) ?? 0) + r.revenue)
    deptRev.set(r.department, (deptRev.get(r.department) ?? 0) + r.revenue)
  }
  const argmax = (map: Map<string, number>) =>
    [...map.entries()].sort((a, b) => b[1] - a[1])[0][0]

  const riskCounts = emptyRiskCounts()
  for (const r of reports) riskCounts[r.risk] += 1

  return {
    operators: reports.length,
    revenue: round(revenue, 2),
    transactions: reports.reduce((sum, r) => sum + r.salesCount, 0),
    avgProductivity: round(
      reports.reduce((sum, r) => sum + r.productivity, 0) / reports.length,
      2
    ),
    avgAttendance: round(
      reports.reduce((sum, r) => sum + r.attendanceScore, 0) / reports.length,
      1
    ),
    alerts,
    health: Math.max(0, 100 - alerts * 10),
    target: target === null ? 0 : Math.round(target),
    targetPct: target && target > 0 ? round((revenue / target) * 100, 1) : 0,
    hasTarget: target !== null && target > 0,
    topOperator: [...reports].sort((a, b) => b.revenue - a.revenue)[0],
    bestStation: argmax(stationRev),
    bestDepartment: argmax(deptRev),
    riskCounts,
  }
}

export function stationReports(reports: OperatorMetrics[]): StationReport[] {
  const grouped = new Map<string, OperatorMetrics[]>()
  for (const r of reports) {
    const rows = grouped.get(r.station)
    if (rows) rows.push(r)
    else grouped.set(r.station, [r])
  }

  const out: StationReport[] = []
  for (const [name, rows] of grouped) {
    const alerts = rows.reduce((sum, r) => sum + r.suspicious, 0)
    out.push({
      name,
      employees: rows.length,
      revenue: round(
        rows.reduce((sum, r) => sum + r.revenue, 0),
        2
      ),
      transactions: rows.reduce((sum, r) => sum + r.salesCount, 0),
      alerts,
      productivity: round(
        rows.reduce((sum, r) => sum + r.productivity, 0) / rows.length,
        2
      ),
      attendance: round(
        rows.reduce((sum, r) => sum + r.attendanceScore, 0) / rows.length,
        1
      ),
      health: Math.max(0, 100 - alerts * 10),
    })
  }

  out.sort((a, b) => b.revenue - a.revenue)
  return out
}

/** Revenue grouped by an operator attribute (station / department), desc. */
export function groupRevenue(
  reports: OperatorMetrics[],
  attr: "station" | "department"
): { label: string; revenue: number }[] {
  const grouped = new Map<string, number>()
  for (const r of reports) {
    grouped.set(r[attr], (grouped.get(r[attr]) ?? 0) + r.revenue)
  }
  return [...grouped.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, revenue]) => ({ label, revenue: round(revenue, 2) }))
}

export function shiftDistribution(
  reports: OperatorMetrics[]
): { shift: Shift; operators: number }[] {
  return SHIFTS.map((shift) => ({
    shift,
    operators: reports.filter((r) => r.shift === shift).length,
  })).filter((row) => row.operators > 0)
}

export function collectAlerts(reports: OperatorMetrics[]): OperatorAlert[] {
  return reports
    .flatMap((r) => r.alerts)
    .sort((a, b) => b.time.getTime() - a.time.getTime())
}

export function rankOperators<T extends OperatorMetrics>(reports: T[]): T[] {
  return [...reports].sort(
    (a, b) => b.revenue - a.revenue || b.productivity - a.productivity
  )
}
