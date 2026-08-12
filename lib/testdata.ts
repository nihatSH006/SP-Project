/**
 * Synthetic test data in the REAL schema's shape (docs: db3_loglar +
 * db3_satislar): 8 stations, 64 workers, 28 operational days of attendance
 * TAPS and fob SALES.
 *
 *  - Every worker has a userid and a kart_no; they tap IN when they arrive,
 *    OUT when they leave (check_type per lib/pos.ts).
 *  - A sale = the fob pressed at the pump: timestamp, station, card, v_no
 *    (carried opaque), plus the simulated db1 join — litres, grade, amount
 *    at the state price.
 *
 * PLANTED anomalies (the answer key) are exactly the OBVIOUS kind the alert
 * engine detects — missing taps, sales off the clock, phantom sellers.
 * Deterministic RNG: every run produces the identical dataset, so ids stay
 * stable and re-seeding overwrites.
 */

import { CHECK_TYPE_IN, CHECK_TYPE_OUT } from "@/lib/pos"
import { DEFAULT_TARIFFS, type FuelGrade } from "@/lib/settings"

// ------------------------------------------------------------------ rng

/** mulberry32 — small, fast, deterministic. */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pick = <T>(r: () => number, xs: readonly T[]): T =>
  xs[Math.floor(r() * xs.length)]

const round2 = (v: number) => Math.round(v * 100) / 100

// ------------------------------------------------------------------ stations

export type StationSpec = {
  name: string
  region: string
  profile: "city" | "highway" | "regional"
  /** Relative demand multiplier; 1.0 = average. */
  volume: number
}

export const STATIONS: StationSpec[] = [
  { name: "Baku Station 1", region: "Baku", profile: "city", volume: 1.45 },
  { name: "Baku Station 2", region: "Baku", profile: "city", volume: 1.15 },
  { name: "Absheron Highway Station", region: "Baku", profile: "highway", volume: 1.3 },
  { name: "Sumqayit Station", region: "Sumqayit", profile: "city", volume: 1.0 },
  { name: "Ganja Station", region: "Ganja", profile: "city", volume: 0.95 },
  { name: "Mingachevir Station", region: "Mingachevir", profile: "regional", volume: 0.7 },
  { name: "Lankaran Station", region: "Lankaran", profile: "regional", volume: 0.65 },
  { name: "Sheki Station", region: "Sheki", profile: "regional", volume: 0.55 },
]

/** Hourly demand shape (0-23), by station profile. Values are relative. */
const HOUR_SHAPE: Record<StationSpec["profile"], number[]> = {
  //          0    1    2    3    4    5    6    7    8    9   10   11   12   13   14   15   16   17   18   19   20   21   22   23
  city: [0.2, 0.15, 0.1, 0.1, 0.15, 0.4, 0.9, 1.4, 1.5, 1.1, 0.9, 0.9, 1.0, 1.0, 0.9, 1.0, 1.1, 1.5, 1.6, 1.3, 1.0, 0.7, 0.5, 0.3],
  highway: [0.4, 0.3, 0.3, 0.3, 0.4, 0.6, 0.9, 1.1, 1.2, 1.3, 1.4, 1.5, 1.5, 1.4, 1.4, 1.3, 1.2, 1.2, 1.1, 1.0, 0.8, 0.7, 0.6, 0.5],
  regional: [0.1, 0.1, 0.05, 0.05, 0.1, 0.3, 0.7, 1.0, 1.1, 1.0, 1.0, 1.1, 1.2, 1.1, 1.0, 1.0, 1.0, 1.1, 1.2, 1.0, 0.7, 0.5, 0.3, 0.2],
}

/** Mon..Sun factors; highway peaks on weekends, city dips. */
const WEEKDAY_FACTOR: Record<StationSpec["profile"], number[]> = {
  city: [1.0, 1.0, 1.0, 1.05, 1.15, 0.85, 0.75],
  highway: [0.9, 0.9, 0.95, 1.0, 1.2, 1.35, 1.25],
  regional: [1.0, 0.95, 0.95, 1.0, 1.1, 1.1, 0.9],
}

// ------------------------------------------------------------------ people

const FIRST_NAMES = [
  "Rustam", "Aysel", "Elvin", "Nigar", "Kamran", "Leyla", "Murad", "Gunel",
  "Tural", "Sabina", "Orxan", "Amina", "Farid", "Lamiya", "Emin", "Sevinc",
  "Rashad", "Nurlan", "Aygun", "Elnur", "Zaur", "Konul", "Vugar", "Narmin",
  "Ilkin", "Fidan", "Anar", "Gulnar", "Samir", "Terane", "Ruslan", "Vafa",
  "Elshan", "Khadija", "Nijat", "Zeynab", "Kanan", "Ulviyya", "Javid", "Mehriban",
] as const

const SURNAMES = [
  "Aliyev", "Mammadov", "Huseynov", "Hasanov", "Guliyev", "Ismayilov",
  "Rzayev", "Musayev", "Karimov", "Safarov", "Jafarov", "Babayev",
  "Suleymanov", "Valiyev", "Abbasov", "Nabiyev", "Orujov", "Tagiyev",
  "Farzaliyev", "Mikayilov",
] as const

/** Feminine surname form for female first names (index parity picks gender). */
const FEMALE = new Set([
  "Aysel", "Nigar", "Leyla", "Gunel", "Sabina", "Amina", "Lamiya", "Sevinc",
  "Aygun", "Konul", "Narmin", "Fidan", "Gulnar", "Terane", "Vafa", "Khadija",
  "Zeynab", "Ulviyya", "Mehriban",
])

function personName(index: number): string {
  const first = FIRST_NAMES[index % FIRST_NAMES.length]
  const rawLast = SURNAMES[(index * 7 + Math.floor(index / FIRST_NAMES.length)) % SURNAMES.length]
  const last = FEMALE.has(first) ? rawLast.replace(/ov$/, "ova").replace(/ev$/, "eva") : rawLast
  return `${first} ${last}`
}

export function emailFor(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/\s+/g, ".")
      .replace(/[^a-z.]/g, "") + "@sasis.test"
  )
}

// ------------------------------------------------------------------ workers

export type Shift = "Morning" | "Evening" | "Night"

const SHIFT_HOURS: Record<Shift, { start: number; end: number }> = {
  Morning: { start: 6, end: 14 },
  Evening: { start: 14, end: 22 },
  Night: { start: 22, end: 30 }, // 22:00 → 06:00 next day
}

const SHIFT_PLAN: Shift[] = [
  "Morning", "Morning", "Morning",
  "Evening", "Evening", "Evening",
  "Night", "Night",
]

/**
 * The planted anomalies — each one an OBVIOUS, database-provable fact:
 *
 *   forgets-out    — taps IN, never taps OUT on many days
 *   no-in          — the OUT tap is there, the IN is not
 *   double-tap-in  — the fob reads twice on arrival
 *   double-tap-out — the fob reads twice on the way out
 *   late-seller    — sales continue after the OUT tap
 *   phantom        — sales on days with no taps at all
 */
export type AnomalyPlant =
  | "none"
  | "forgets-out"
  | "no-in"
  | "double-tap-in"
  | "double-tap-out"
  | "late-seller"
  | "phantom"

export const PLANTED: Record<number, AnomalyPlant> = {
  7: "forgets-out", // Baku Station 1, night shift
  13: "late-seller", // Baku Station 2, evening shift
  20: "double-tap-in", // Absheron Highway Station, evening shift
  32: "phantom", // Sumqayit Station, night shift
  38: "double-tap-out", // Ganja Station, evening shift
  44: "no-in", // Mingachevir Station, evening shift
}

export type Worker = {
  employeeId: number
  /** db3_loglar.userid */
  userid: string
  /** db3_loglar.ad_soyad */
  name: string
  station: string
  deptid: number
  /** db3 kart_no — the fob. */
  kartNo: string
  shift: Shift
  /** Sales-pace multiplier: 0.6 struggling … 1.5 star. */
  performance: number
  /** Mean tap-in lateness, minutes. */
  lateness: number
  /** Probability of missing a day entirely. */
  absenteeism: number
  firstDay: number
  lastDay: number
  anomaly: AnomalyPlant
}

/** Human-readable answer key: name -> planted anomaly. */
export function plantNames(): Record<string, AnomalyPlant> {
  const out: Record<string, AnomalyPlant> = {}
  for (const worker of generateWorkers()) {
    if (worker.anomaly !== "none") out[worker.name] = worker.anomaly
  }
  return out
}

export const TOTAL_DAYS = 28

export function generateWorkers(): Worker[] {
  const workers: Worker[] = []
  let id = 1

  STATIONS.forEach((station, s) => {
    for (let i = 0; i < 8; i++) {
      const index = s * 8 + i
      const r = rng(1000 + index)
      const performance =
        i === 0 ? 1.35 + r() * 0.25 : i === 7 ? 0.6 + r() * 0.15 : 0.8 + r() * 0.5

      workers.push({
        employeeId: id,
        userid: `U${String(id).padStart(4, "0")}`,
        name: personName(index),
        station: station.name,
        deptid: s + 1,
        kartNo: `000453${String(9000 + id * 7).padStart(4, "0")}`,
        shift: SHIFT_PLAN[i],
        performance,
        lateness: r() < 0.55 ? r() * 6 : 6 + r() * 14,
        absenteeism: r() < 0.6 ? 0.015 : 0.04 + r() * 0.05,
        firstDay: 1,
        lastDay: TOTAL_DAYS,
        anomaly: PLANTED[id] ?? "none",
      })
      id += 1
    }
  })

  // One mid-period hire and one leaver, for roster realism.
  workers[10].firstDay = 12
  workers[45].lastDay = 20

  return workers
}

export type ManagerSpec = { name: string; station: string }

export function generateManagers(): ManagerSpec[] {
  return STATIONS.map((station, i) => ({
    name: personName(64 + i),
    station: station.name,
  }))
}

// ------------------------------------------------------------------ days

export type GeneratedTap = {
  employeeId: number
  at: Date
  /** Raw check_type. */
  type: number
}

export type GeneratedSale = {
  employeeId: number
  /** db3_satislar fields. */
  db1Id: string
  station: string
  at: Date
  kartNo: string
  vNo: string
  /** Simulated db1 join. */
  litres: number
  grade: FuelGrade
  amount: number
}

export type GeneratedDay = {
  /** YYYY-MM-DD, the operational day (shift start day). */
  date: string
  taps: GeneratedTap[]
  sales: GeneratedSale[]
}

const ROUND_AMOUNTS = [20, 30, 40, 50, 70, 100, 150, 200] as const

/** Prepay entries are round-heavy: "fill it for 50 manat" is the culture. */
function saleAmount(r: () => number): number {
  if (r() < 0.7) return pick(r, ROUND_AMOUNTS)
  return round2(15 + r() * 285)
}

/** Grade mix roughly matching the network: AI-92 dominates. */
function fuelGrade(r: () => number): FuelGrade {
  const x = r()
  if (x < 0.62) return "AI-92"
  if (x < 0.84) return "AI-95"
  if (x < 0.96) return "Diesel"
  return "AI-98"
}

function fmtDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

const addMinutes = (d: Date, minutes: number): Date => {
  const out = new Date(d)
  out.setMinutes(out.getMinutes() + Math.round(minutes))
  return out
}

/**
 * Generate `TOTAL_DAYS` operational days ending on `endDate` (inclusive).
 */
export function generateDays(workers: Worker[], endDate: Date): GeneratedDay[] {
  const stationByName = new Map(STATIONS.map((s) => [s.name, s]))
  const days: GeneratedDay[] = []
  let saleSeq = 0

  for (let dayIdx = 1; dayIdx <= TOTAL_DAYS; dayIdx++) {
    const dayDate = new Date(endDate)
    dayDate.setDate(endDate.getDate() - (TOTAL_DAYS - dayIdx))
    dayDate.setHours(0, 0, 0, 0)

    const day: GeneratedDay = { date: fmtDate(dayDate), taps: [], sales: [] }
    const weekday = (dayDate.getDay() + 6) % 7 // 0 = Monday

    const pushSale = (
      r: () => number,
      station: string,
      at: Date,
      kartNo: string,
      employeeId: number
    ) => {
      const amount = saleAmount(r)
      const grade = fuelGrade(r)
      saleSeq += 1
      day.sales.push({
        employeeId,
        db1Id: `S${day.date.replace(/-/g, "")}-${String(saleSeq).padStart(5, "0")}`,
        station,
        at,
        kartNo,
        vNo: `V${1 + Math.floor(r() * 4)}`,
        litres: round2(amount / DEFAULT_TARIFFS[grade]),
        grade,
        amount,
      })
    }

    for (const worker of workers) {
      if (dayIdx < worker.firstDay || dayIdx > worker.lastDay) continue

      const r = rng(worker.employeeId * 10007 + dayIdx * 101)
      if (r() < worker.absenteeism) continue // absent today

      const station = stationByName.get(worker.station)!
      const hours = SHIFT_HOURS[worker.shift]

      // ---- the tapped window ---------------------------------------------
      const lateMin = Math.max(0, worker.lateness * (0.4 + r() * 1.2))
      const tapIn = new Date(dayDate)
      tapIn.setHours(hours.start, Math.round(lateMin), Math.round(r() * 59), 0)
      const tapOut = new Date(dayDate)
      tapOut.setHours(
        hours.end,
        Math.round((r() - 0.35) * 24),
        Math.round(r() * 59),
        0
      )

      const phantomToday = worker.anomaly === "phantom" && r() < 0.25
      const forgetsOutToday = worker.anomaly === "forgets-out" && r() < 0.35
      const noInToday = worker.anomaly === "no-in" && r() < 0.3
      const doubleTapToday = worker.anomaly === "double-tap-in" && r() < 0.4
      const doubleTapOutToday =
        worker.anomaly === "double-tap-out" && r() < 0.4

      if (!phantomToday) {
        if (!noInToday) {
          day.taps.push({
            employeeId: worker.employeeId,
            at: tapIn,
            type: CHECK_TYPE_IN,
          })
          if (doubleTapToday) {
            // The reader catches the card twice on the way in.
            day.taps.push({
              employeeId: worker.employeeId,
              at: addMinutes(tapIn, 0.5 + r()),
              type: CHECK_TYPE_IN,
            })
          }
        }
        if (!forgetsOutToday) {
          day.taps.push({
            employeeId: worker.employeeId,
            at: tapOut,
            type: CHECK_TYPE_OUT,
          })
          if (doubleTapOutToday) {
            // The reader catches the card twice on the way out — the later
            // tap is the one that counts as the real check-out.
            day.taps.push({
              employeeId: worker.employeeId,
              at: addMinutes(tapOut, 0.5 + r()),
              type: CHECK_TYPE_OUT,
            })
          }
        }
      }

      // ---- sales through the shift, following the demand curve ------------
      const dayFactor = WEEKDAY_FACTOR[station.profile][weekday]
      for (let h = hours.start; h < hours.end; h++) {
        const hourOfDay = h % 24
        const shape = HOUR_SHAPE[station.profile][hourOfDay]
        const expected =
          3.6 * shape * station.volume * dayFactor * worker.performance
        const count = Math.max(0, Math.round(expected + (r() - 0.5) * 2.4))

        for (let k = 0; k < count; k++) {
          const at = new Date(dayDate)
          at.setHours(h, Math.floor(r() * 60), Math.floor(r() * 60), 0)
          if (at < tapIn || at > tapOut) continue
          pushSale(r, worker.station, at, worker.kartNo, worker.employeeId)
        }
      }

      // The late seller: the OUT tap is honest, the selling is not over.
      if (worker.anomaly === "late-seller" && r() < 0.3) {
        const n = 2 + Math.floor(r() * 2)
        for (let k = 0; k < n; k++) {
          pushSale(
            r,
            worker.station,
            addMinutes(tapOut, 15 + r() * 45),
            worker.kartNo,
            worker.employeeId
          )
        }
      }

      // The phantom: no taps today, but the fob sells anyway.
      if (phantomToday) {
        const n = 3 + Math.floor(r() * 4)
        for (let k = 0; k < n; k++) {
          const at = new Date(dayDate)
          at.setHours(
            hours.start + 1 + Math.floor(r() * 6),
            Math.floor(r() * 60),
            0,
            0
          )
          pushSale(r, worker.station, at, worker.kartNo, worker.employeeId)
        }
      }
    }

    day.taps.sort((a, b) => a.at.getTime() - b.at.getTime())
    day.sales.sort((a, b) => a.at.getTime() - b.at.getTime())
    days.push(day)
  }

  return days
}
