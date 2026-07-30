import { readFileSync } from "node:fs"
import path from "node:path"

/**
 * CSV ingestion for the operational exports. Shared by the Firestore seeder and
 * available for any future import path.
 */

const DATA_DIR = path.join(process.cwd(), "data")

export type AttendanceRow = {
  name: string
  department: string
  station: string
  entry: Date
  exit: Date
}

export type SaleRow = {
  employee: string
  soldAt: Date
  amount: number
}

/**
 * Minimal reader — the exports are plain comma-separated with no quoting or
 * embedded commas. Swap for a real parser if that ever changes.
 */
function readCsv(file: string): Record<string, string>[] {
  const text = readFileSync(path.join(DATA_DIR, file), "utf8").replace(
    /^﻿/,
    ""
  )
  const [head, ...lines] = text.trim().split(/\r?\n/)
  const columns = head.split(",").map((column) => column.trim())

  return lines
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const cells = line.split(",")
      return Object.fromEntries(
        columns.map((column, i) => [column, (cells[i] ?? "").trim()])
      )
    })
}

/** `2026-07-27 06:00:00` / `2026-07-27 06:00`, in the operational local zone. */
export function parseDateTime(value: string): Date {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/
  )
  if (!match) throw new Error(`Unrecognised datetime: ${value}`)
  const [, y, mo, d, h, mi, s] = match
  return new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    Number(s ?? 0)
  )
}

export function readAttendance(): AttendanceRow[] {
  const seen = new Set<string>()
  const rows: AttendanceRow[] = []

  for (const row of readCsv("attendance.csv")) {
    const name = row.Employee
    // One attendance window per operator, matching the original prototype.
    if (!name || seen.has(name)) continue
    seen.add(name)
    rows.push({
      name,
      department: row.Department,
      station: row.Station,
      entry: parseDateTime(row.Entry),
      exit: parseDateTime(row.Exit),
    })
  }

  return rows.sort((a, b) => a.name.localeCompare(b.name))
}

export function readSales(): SaleRow[] {
  return readCsv("sales.csv").map((row) => ({
    employee: row.Employee,
    soldAt: parseDateTime(row.SaleTime),
    amount: Number(row.Amount),
  }))
}
