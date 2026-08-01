/**
 * Import validation (idea #14).
 *
 * Every score, grade and fraud flag in SASIS is derived from the daily import.
 * A malformed or duplicated file does not fail loudly — it silently produces a
 * plausible-looking day of wrong numbers, and someone gets graded D or flagged
 * as a fraud risk because of it. So the import is checked before anything is
 * written, and the result is recorded.
 *
 * ERRORS block the import. WARNINGS are recorded and surfaced to the admin but
 * do not stop it, because real operational data is always a bit messy.
 */

export type IssueSeverity = "error" | "warning"

export type ImportIssue = {
  severity: IssueSeverity
  /** Stable machine code, so the UI can translate the message. */
  code: string
  /** Human summary in English; the UI may translate via `code`. */
  message: string
  /** How many rows tripped this check. */
  count: number
  /** A few offending rows, for the admin to go and look at. */
  samples: string[]
}

export type ImportStats = {
  attendanceRows: number
  salesRows: number
  employees: number
  stations: number
  dates: string[]
  totalRevenue: number
}

export type ValidationResult = {
  /** False when at least one ERROR was raised. */
  ok: boolean
  issues: ImportIssue[]
  stats: ImportStats
}

export type AttendanceInput = {
  name: string
  department: string
  station: string
  entry: Date
  exit: Date
}

export type SaleInput = {
  employee: string
  soldAt: Date
  amount: number
}

/** Beyond this, a "shift" is almost certainly a data error, not overtime. */
const MAX_SHIFT_HOURS = 16
/** A single fuel sale above this is worth a human look. */
const MAX_PLAUSIBLE_SALE = 5000
/** Sales this far outside any shift suggest a clock or timezone problem. */
const FAR_OUTSIDE_SHIFT_HOURS = 6

const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`

function issue(
  severity: IssueSeverity,
  code: string,
  message: string,
  samples: string[]
): ImportIssue {
  return {
    severity,
    code,
    message,
    count: samples.length,
    // Cap the samples: an import with 40,000 bad rows should not write a
    // 40,000-entry array into the audit record.
    samples: samples.slice(0, 5),
  }
}

export function validateImport(input: {
  attendance: AttendanceInput[]
  sales: SaleInput[]
  /** Dates already in the database, to detect gaps and re-imports. */
  existingDates?: string[]
  /** Defaults to now; injectable so tests are deterministic. */
  now?: Date
}): ValidationResult {
  const { attendance, sales, existingDates = [], now = new Date() } = input
  const issues: ImportIssue[] = []

  // ------------------------------------------------------------- structural
  if (attendance.length === 0) {
    issues.push(
      issue("error", "no-attendance", "The attendance file has no rows.", [])
    )
  }
  if (sales.length === 0) {
    issues.push(issue("error", "no-sales", "The sales file has no rows.", []))
  }

  // ------------------------------------------------------------- attendance
  const seenShift = new Set<string>()
  const duplicateShifts: string[] = []
  const invalidWindows: string[] = []
  const longShifts: string[] = []
  const badAttendanceDates: string[] = []

  const shiftsByName = new Map<string, AttendanceInput[]>()

  for (const row of attendance) {
    if (
      Number.isNaN(row.entry.getTime()) ||
      Number.isNaN(row.exit.getTime())
    ) {
      badAttendanceDates.push(row.name)
      continue
    }

    const key = `${row.name}|${dayKey(row.entry)}`
    if (seenShift.has(key)) duplicateShifts.push(key)
    else seenShift.add(key)

    const hours =
      (row.exit.getTime() - row.entry.getTime()) / (1000 * 60 * 60)
    if (hours <= 0) {
      invalidWindows.push(`${row.name} ${row.entry.toISOString()}`)
    } else if (hours > MAX_SHIFT_HOURS) {
      longShifts.push(`${row.name} ${hours.toFixed(1)}h`)
    }

    const list = shiftsByName.get(row.name)
    if (list) list.push(row)
    else shiftsByName.set(row.name, [row])
  }

  if (badAttendanceDates.length) {
    issues.push(
      issue(
        "error",
        "attendance-unparseable-date",
        "Attendance rows have an unreadable entry or exit time.",
        badAttendanceDates
      )
    )
  }
  if (duplicateShifts.length) {
    issues.push(
      issue(
        "error",
        "duplicate-shift",
        "The same operator has more than one shift on the same day — the file was probably imported twice.",
        duplicateShifts
      )
    )
  }
  if (invalidWindows.length) {
    issues.push(
      issue(
        "error",
        "invalid-shift-window",
        "Shift exit is not after entry, so working hours cannot be computed.",
        invalidWindows
      )
    )
  }
  if (longShifts.length) {
    issues.push(
      issue(
        "warning",
        "implausible-shift-length",
        `Shifts longer than ${MAX_SHIFT_HOURS} hours — check for a missing clock-out.`,
        longShifts
      )
    )
  }

  // ------------------------------------------------------------------ sales
  const unknownEmployee: string[] = []
  const badAmounts: string[] = []
  const hugeAmounts: string[] = []
  const badSaleDates: string[] = []
  const farOutside: string[] = []
  const exactDuplicates: string[] = []

  const seenSale = new Set<string>()
  let totalRevenue = 0

  for (const sale of sales) {
    if (Number.isNaN(sale.soldAt.getTime())) {
      badSaleDates.push(sale.employee)
      continue
    }

    const shifts = shiftsByName.get(sale.employee)
    if (!shifts) {
      unknownEmployee.push(sale.employee)
      continue
    }

    if (!Number.isFinite(sale.amount) || sale.amount <= 0) {
      badAmounts.push(`${sale.employee} ${sale.amount}`)
      continue
    }
    if (sale.amount > MAX_PLAUSIBLE_SALE) {
      hugeAmounts.push(`${sale.employee} ${sale.amount} ₼`)
    }
    totalRevenue += sale.amount

    const dupKey = `${sale.employee}|${sale.soldAt.getTime()}|${sale.amount}`
    if (seenSale.has(dupKey)) exactDuplicates.push(dupKey)
    else seenSale.add(dupKey)

    // Distance from the nearest shift window this operator worked.
    const gapHours = Math.min(
      ...shifts.map((shift) => {
        if (sale.soldAt >= shift.entry && sale.soldAt <= shift.exit) return 0
        const before = (shift.entry.getTime() - sale.soldAt.getTime()) / 3_600_000
        const after = (sale.soldAt.getTime() - shift.exit.getTime()) / 3_600_000
        return Math.max(0, Math.max(before, after))
      })
    )
    if (gapHours > FAR_OUTSIDE_SHIFT_HOURS) {
      farOutside.push(
        `${sale.employee} ${sale.soldAt.toISOString()} (+${gapHours.toFixed(1)}h)`
      )
    }
  }

  if (badSaleDates.length) {
    issues.push(
      issue(
        "error",
        "sale-unparseable-date",
        "Sales rows have an unreadable timestamp.",
        badSaleDates
      )
    )
  }
  if (badAmounts.length) {
    issues.push(
      issue(
        "error",
        "invalid-amount",
        "Sales with a zero, negative or non-numeric amount.",
        badAmounts
      )
    )
  }
  if (unknownEmployee.length) {
    issues.push(
      issue(
        "warning",
        "unknown-employee",
        "Sales belong to someone with no attendance record; they are skipped and their revenue is lost.",
        [...new Set(unknownEmployee)]
      )
    )
  }
  if (exactDuplicates.length) {
    issues.push(
      issue(
        "warning",
        "duplicate-sale",
        "Identical operator, timestamp and amount — possibly a double-counted row.",
        exactDuplicates
      )
    )
  }
  if (hugeAmounts.length) {
    issues.push(
      issue(
        "warning",
        "implausible-amount",
        `Single sales above ${MAX_PLAUSIBLE_SALE} ₼.`,
        hugeAmounts
      )
    )
  }
  if (farOutside.length) {
    issues.push(
      issue(
        "warning",
        "sale-far-outside-shift",
        `Sales more than ${FAR_OUTSIDE_SHIFT_HOURS} hours from any shift — check for a clock or timezone problem before treating these as fraud.`,
        farOutside
      )
    )
  }

  // ------------------------------------------------------------------ dates
  const dates = [...new Set(attendance.map((r) => dayKey(r.entry)))].sort()

  const future = dates.filter((d) => d > dayKey(now))
  if (future.length) {
    issues.push(
      issue(
        "warning",
        "future-date",
        "The import contains days in the future.",
        future
      )
    )
  }

  const reimported = dates.filter((d) => existingDates.includes(d))
  if (reimported.length) {
    issues.push(
      issue(
        "warning",
        "already-imported",
        "These days already exist and will be overwritten.",
        reimported
      )
    )
  }

  // Gaps: a missing operational day means the trend charts silently skip it.
  const all = [...new Set([...existingDates, ...dates])].sort()
  const gaps: string[] = []
  for (let i = 1; i < all.length; i++) {
    const prev = new Date(`${all[i - 1]}T00:00:00`)
    const cur = new Date(`${all[i]}T00:00:00`)
    const days = Math.round(
      (cur.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (days > 1) gaps.push(`${all[i - 1]} → ${all[i]} (${days - 1} missing)`)
  }
  if (gaps.length) {
    issues.push(
      issue(
        "warning",
        "missing-days",
        "Gaps in the operational calendar — those days have no data at all.",
        gaps
      )
    )
  }

  return {
    ok: !issues.some((i) => i.severity === "error"),
    issues,
    stats: {
      attendanceRows: attendance.length,
      salesRows: sales.length,
      employees: shiftsByName.size,
      stations: new Set(attendance.map((r) => r.station)).size,
      dates,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
    },
  }
}
