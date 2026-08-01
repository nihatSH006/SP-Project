/**
 * Admin-tunable business rules (idea #16).
 *
 * These used to be constants in `lib/analytics.ts`, which meant every policy
 * change needed a developer. They now live in Firestore at `/settings/global`
 * and are edited from the admin settings page.
 *
 * Crucially, everything here is applied at READ time. Stored reports keep only
 * measured primitives — working hours, productivity, suspicious-sale count —
 * and the policy-dependent values (attendance score, risk, score, grade) are
 * derived on the way out. Changing a threshold therefore takes effect
 * immediately across all 28 days without recomputing a single document.
 *
 * This module is deliberately free of Firestore imports so it can be shared by
 * the analytics engine, the seeder, and client components alike.
 */

export type Language = "az" | "ru" | "en"

export type Settings = {
  /** Hours in a full shift — the denominator of the attendance score. */
  scheduledHours: number
  /**
   * ₼/hour that earns full marks on the productivity half of the score.
   * The old hardcoded 15 was tuned for busy Baku stations, which is why quiet
   * regional stations graded D no matter how well their staff worked.
   */
  productivityTarget: number
  /** Clock-in lateness forgiven before it dents the attendance score. */
  graceMinutes: number

  /** Suspicious-sale count that forces HIGH risk. */
  riskHighSuspicious: number
  /** Attendance % below which risk becomes at least MEDIUM. */
  riskMediumAttendance: number
  /** Attendance % below which risk becomes HIGH. */
  riskHighAttendance: number

  /** Score floors for each grade. */
  gradeBounds: { aPlus: number; a: number; b: number; c: number }

  /** Revenue targets (idea #3 — replaces the self-referential formula). */
  targetMode: "manual" | "baseline"
  /** Manual mode: ₼ per day, per station id. Missing = fall back below. */
  stationDailyTargets: Record<string, number>
  /** Manual mode fallback for any station without an explicit target. */
  defaultStationDailyTarget: number
  /** Baseline mode: uplift over the station's own trailing average (1.05 = +5%). */
  baselineUplift: number

  defaultLanguage: Language
}

export const DEFAULT_SETTINGS: Settings = {
  scheduledHours: 8,
  productivityTarget: 15,
  graceMinutes: 0,

  riskHighSuspicious: 2,
  riskMediumAttendance: 90,
  riskHighAttendance: 70,

  gradeBounds: { aPlus: 90, a: 80, b: 70, c: 60 },

  targetMode: "manual",
  stationDailyTargets: {},
  defaultStationDailyTarget: 25000,
  baselineUplift: 1.05,

  defaultLanguage: "az",
}

/**
 * Build settings from a stored document.
 *
 * Fields are picked explicitly rather than spread. The stored document also
 * carries bookkeeping (`updatedAt`, `updatedBy`), and `updatedAt` is a Firestore
 * `Timestamp` — a class instance, which cannot be serialised across the
 * server/client boundary. Picking known fields keeps this object plain and stops
 * any stray stored value reaching the browser.
 */
export function withDefaults(stored: Partial<Settings> | undefined): Settings {
  if (!stored) return DEFAULT_SETTINGS

  const num = (value: unknown, fallback: number) =>
    typeof value === "number" && Number.isFinite(value) ? value : fallback

  const d = DEFAULT_SETTINGS
  return {
    scheduledHours: num(stored.scheduledHours, d.scheduledHours),
    productivityTarget: num(stored.productivityTarget, d.productivityTarget),
    graceMinutes: num(stored.graceMinutes, d.graceMinutes),

    riskHighSuspicious: num(stored.riskHighSuspicious, d.riskHighSuspicious),
    riskMediumAttendance: num(
      stored.riskMediumAttendance,
      d.riskMediumAttendance
    ),
    riskHighAttendance: num(stored.riskHighAttendance, d.riskHighAttendance),

    gradeBounds: {
      aPlus: num(stored.gradeBounds?.aPlus, d.gradeBounds.aPlus),
      a: num(stored.gradeBounds?.a, d.gradeBounds.a),
      b: num(stored.gradeBounds?.b, d.gradeBounds.b),
      c: num(stored.gradeBounds?.c, d.gradeBounds.c),
    },

    targetMode: stored.targetMode === "baseline" ? "baseline" : d.targetMode,
    stationDailyTargets: Object.fromEntries(
      Object.entries(stored.stationDailyTargets ?? {})
        .filter(([, v]) => typeof v === "number" && Number.isFinite(v))
        .map(([k, v]) => [k, v as number])
    ),
    defaultStationDailyTarget: num(
      stored.defaultStationDailyTarget,
      d.defaultStationDailyTarget
    ),
    baselineUplift: num(stored.baselineUplift, d.baselineUplift),

    defaultLanguage: (["az", "ru", "en"] as const).includes(
      stored.defaultLanguage as Language
    )
      ? (stored.defaultLanguage as Language)
      : d.defaultLanguage,
  }
}

/** Bounds so a bad value cannot make the dashboard nonsensical. */
export const LIMITS = {
  scheduledHours: { min: 1, max: 24 },
  productivityTarget: { min: 1, max: 10000 },
  graceMinutes: { min: 0, max: 120 },
  riskHighSuspicious: { min: 1, max: 50 },
  attendance: { min: 0, max: 100 },
  grade: { min: 0, max: 100 },
  target: { min: 0, max: 100_000_000 },
  baselineUplift: { min: 0.5, max: 3 },
} as const

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

/**
 * Validate and coerce an incoming settings payload. Returns the sanitised
 * settings plus any problems worth showing the admin.
 */
export function sanitiseSettings(input: Settings): {
  settings: Settings
  warnings: string[]
} {
  const warnings: string[] = []
  const s: Settings = { ...input }

  s.scheduledHours = clamp(
    Number(s.scheduledHours) || DEFAULT_SETTINGS.scheduledHours,
    LIMITS.scheduledHours.min,
    LIMITS.scheduledHours.max
  )
  s.productivityTarget = clamp(
    Number(s.productivityTarget) || DEFAULT_SETTINGS.productivityTarget,
    LIMITS.productivityTarget.min,
    LIMITS.productivityTarget.max
  )
  s.graceMinutes = clamp(
    Number(s.graceMinutes) || 0,
    LIMITS.graceMinutes.min,
    LIMITS.graceMinutes.max
  )
  s.riskHighSuspicious = clamp(
    Number(s.riskHighSuspicious) || DEFAULT_SETTINGS.riskHighSuspicious,
    LIMITS.riskHighSuspicious.min,
    LIMITS.riskHighSuspicious.max
  )
  s.riskMediumAttendance = clamp(
    Number(s.riskMediumAttendance),
    LIMITS.attendance.min,
    LIMITS.attendance.max
  )
  s.riskHighAttendance = clamp(
    Number(s.riskHighAttendance),
    LIMITS.attendance.min,
    LIMITS.attendance.max
  )

  // HIGH must be the stricter of the two, or risk levels invert.
  if (s.riskHighAttendance > s.riskMediumAttendance) {
    warnings.push(
      "High-risk attendance threshold cannot exceed the medium-risk one — they were swapped."
    )
    const t = s.riskHighAttendance
    s.riskHighAttendance = s.riskMediumAttendance
    s.riskMediumAttendance = t
  }

  const g = { ...s.gradeBounds }
  for (const key of ["aPlus", "a", "b", "c"] as const) {
    g[key] = clamp(Number(g[key]), LIMITS.grade.min, LIMITS.grade.max)
  }
  if (!(g.aPlus > g.a && g.a > g.b && g.b > g.c)) {
    warnings.push(
      "Grade boundaries must descend (A+ > A > B > C) — defaults restored."
    )
    Object.assign(g, DEFAULT_SETTINGS.gradeBounds)
  }
  s.gradeBounds = g

  s.defaultStationDailyTarget = clamp(
    Number(s.defaultStationDailyTarget) || 0,
    LIMITS.target.min,
    LIMITS.target.max
  )
  s.baselineUplift = clamp(
    Number(s.baselineUplift) || DEFAULT_SETTINGS.baselineUplift,
    LIMITS.baselineUplift.min,
    LIMITS.baselineUplift.max
  )
  s.stationDailyTargets = Object.fromEntries(
    Object.entries(s.stationDailyTargets ?? {}).map(([id, value]) => [
      id,
      clamp(Number(value) || 0, LIMITS.target.min, LIMITS.target.max),
    ])
  )

  if (s.targetMode !== "manual" && s.targetMode !== "baseline") {
    s.targetMode = DEFAULT_SETTINGS.targetMode
  }
  if (!["az", "ru", "en"].includes(s.defaultLanguage)) {
    s.defaultLanguage = DEFAULT_SETTINGS.defaultLanguage
  }

  return { settings: s, warnings }
}
