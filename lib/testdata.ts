/**
 * Synthetic test-data generator: 8 stations, 64 workers, 28 operational days.
 *
 * Everything is DETERMINISTIC — a seeded RNG means every re-run produces the
 * identical dataset, so document ids stay stable and re-seeding overwrites
 * instead of duplicating.
 *
 * All people are invented. Diversity is deliberate, so upcoming features have
 * something real to bite on:
 *  - performance archetypes from star to struggling
 *  - punctuality spread: lateness, early exits, absences
 *  - one mid-period hire, one leaver
 *  - station demand curves (city rush-hour vs highway midday vs quiet regional)
 *    and weekday/weekend factors
 *  - PLANTED fraud patterns, documented in `FRAUD_PLANTS` below, to test the
 *    alert engine: repeated after-hours sales, occasional after-hours sales,
 *    duplicate-amount bursts, abnormal round-amount share
 */

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

const DEPARTMENTS = [
  "Fuel Sales", "Fuel Sales", "Fuel Sales",
  "Cashier Operations", "Cashier Operations",
  "Convenience Store", "Convenience Store",
  "Customer Service",
] as const

const SHIFT_PLAN: Shift[] = [
  "Morning", "Morning", "Morning",
  "Evening", "Evening", "Evening",
  "Night", "Night",
]

export type FraudPlant =
  | "none"
  | "after-hours-repeat"
  | "after-hours-occasional"
  | "duplicate-amounts"
  | "round-heavy"

export type Worker = {
  employeeId: number
  name: string
  station: string
  department: string
  shift: Shift
  /** Sales-pace multiplier: 0.6 struggling … 1.5 star. */
  performance: number
  /** Mean clock-in lateness, minutes. */
  lateness: number
  /** Probability of missing a day entirely. */
  absenteeism: number
  /** 1-based day the worker starts appearing (mid-period hire). */
  firstDay: number
  /** Last day the worker appears (leaver), inclusive. */
  lastDay: number
  /** Occasionally very late in / very early out — attendance-risk archetype. */
  erratic: boolean
  fraud: FraudPlant
}

/**
 * The planted fraud cases — the answer key for testing the alert engine.
 * Keyed by employeeId (station index * 8 + slot + 1) because names are
 * generated; use `fraudPlantNames()` for the human-readable answer key.
 */
export const PLANTED_FRAUD: Record<number, FraudPlant> = {
  // Rings up sales 10-50 min after clock-out on roughly 40% of days.
  7: "after-hours-repeat", // Baku Station 1, night shift
  32: "after-hours-repeat", // Sumqayit Station, night shift
  // Same, but rare (~10% of days) — tests threshold sensitivity.
  13: "after-hours-occasional", // Baku Station 2, evening shift
  // Bursts of 4-6 identical amounts within ~40 minutes (fabricated/replayed).
  35: "duplicate-amounts", // Ganja Station, morning shift
  // ~90% round amounts vs a station norm near 55% (skimming fingerprint).
  52: "round-heavy", // Lankaran Station, evening shift
}

/** Human-readable answer key: name -> planted pattern. */
export function fraudPlantNames(): Record<string, FraudPlant> {
  const out: Record<string, FraudPlant> = {}
  for (const worker of generateWorkers()) {
    if (worker.fraud !== "none") out[worker.name] = worker.fraud
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
      const name = personName(index)
      const r = rng(1000 + index)

      // Performance ladder per station: one star, one struggler, rest spread.
      const performance =
        i === 0 ? 1.35 + r() * 0.25 : i === 7 ? 0.6 + r() * 0.15 : 0.8 + r() * 0.5

      workers.push({
        employeeId: id,
        name,
        station: station.name,
        department: DEPARTMENTS[i],
        shift: SHIFT_PLAN[i],
        performance,
        lateness: r() < 0.55 ? r() * 6 : 6 + r() * 14,
        absenteeism: r() < 0.6 ? 0.015 : 0.04 + r() * 0.05,
        firstDay: 1,
        lastDay: TOTAL_DAYS,
        // A couple of stations get one attendance-problem worker (slot 5),
        // and the struggler (slot 7) is erratic where the rng says so.
        erratic: (i === 5 && s % 3 === 1) || (i === 7 && r() < 0.5),
        fraud: PLANTED_FRAUD[id] ?? "none",
      })
      id += 1
    }
  })

  // One mid-period hire and one leaver, for roster realism.
  workers[10].firstDay = 12 // joined in week 2
  workers[45].lastDay = 20 // left after day 20

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

export type GeneratedDay = {
  /** YYYY-MM-DD, the operational day (shift start day). */
  date: string
  attendance: {
    employeeId: number
    entry: Date
    exit: Date
  }[]
  sales: {
    employeeId: number
    soldAt: Date
    amount: number
  }[]
}

const ROUND_AMOUNTS = [20, 30, 40, 50, 70, 100, 150, 200] as const

function saleAmount(r: () => number, roundShare: number): number {
  if (r() < roundShare) return pick(r, ROUND_AMOUNTS)
  return Math.round((15 + r() * 285) * 100) / 100
}

function fmtDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/**
 * Generate `TOTAL_DAYS` operational days ending on `endDate` (inclusive).
 */
export function generateDays(workers: Worker[], endDate: Date): GeneratedDay[] {
  const stationByName = new Map(STATIONS.map((s) => [s.name, s]))
  const days: GeneratedDay[] = []

  for (let dayIdx = 1; dayIdx <= TOTAL_DAYS; dayIdx++) {
    const dayDate = new Date(endDate)
    dayDate.setDate(endDate.getDate() - (TOTAL_DAYS - dayIdx))
    dayDate.setHours(0, 0, 0, 0)

    const day: GeneratedDay = { date: fmtDate(dayDate), attendance: [], sales: [] }
    const weekday = (dayDate.getDay() + 6) % 7 // 0 = Monday

    for (const worker of workers) {
      if (dayIdx < worker.firstDay || dayIdx > worker.lastDay) continue

      const r = rng(worker.employeeId * 10007 + dayIdx * 101)
      if (r() < worker.absenteeism) continue // absent today

      const station = stationByName.get(worker.station)!
      const hours = SHIFT_HOURS[worker.shift]

      // ---- attendance: lateness jitter in, early/late exit jitter out
      const badDay = worker.erratic && r() < 0.28
      const lateMin = badDay
        ? 35 + r() * 50 // very late — attendance score dips below 90
        : Math.max(0, worker.lateness * (0.4 + r() * 1.2))
      const entry = new Date(dayDate)
      entry.setHours(hours.start, Math.round(lateMin), Math.round(r() * 59), 0)

      const exitJitter = badDay
        ? -(30 + r() * 45) // leaves early too
        : (r() - 0.35) * 24 // usually a few minutes late out
      const exit = new Date(dayDate)
      exit.setHours(hours.end, Math.round(Math.max(-90, exitJitter)), Math.round(r() * 59), 0)

      day.attendance.push({ employeeId: worker.employeeId, entry, exit })

      // ---- sales through the shift, following the station's demand curve
      const roundShare = worker.fraud === "round-heavy" ? 0.9 : 0.55
      const dayFactor = WEEKDAY_FACTOR[station.profile][weekday]

      for (let h = hours.start; h < hours.end; h++) {
        const hourOfDay = h % 24
        const shape = HOUR_SHAPE[station.profile][hourOfDay]
        // ~3.2 sales/hour/worker at multiplier 1.0 — scaled by everything.
        const expected = 3.6 * shape * station.volume * dayFactor * worker.performance
        const count = Math.max(0, Math.round(expected + (r() - 0.5) * 2.4))

        for (let k = 0; k < count; k++) {
          const soldAt = new Date(dayDate)
          soldAt.setHours(h, Math.floor(r() * 60), Math.floor(r() * 60), 0)
          if (soldAt < entry || soldAt > exit) continue // only in-window here
          day.sales.push({
            employeeId: worker.employeeId,
            soldAt,
            amount: saleAmount(r, roundShare),
          })
        }
      }

      // ---- planted fraud patterns
      if (
        (worker.fraud === "after-hours-repeat" && r() < 0.4) ||
        (worker.fraud === "after-hours-occasional" && r() < 0.1)
      ) {
        const n = 1 + Math.floor(r() * 3)
        for (let k = 0; k < n; k++) {
          const soldAt = new Date(exit)
          soldAt.setMinutes(exit.getMinutes() + 10 + Math.floor(r() * 40))
          day.sales.push({
            employeeId: worker.employeeId,
            soldAt,
            amount: saleAmount(r, 0.7),
          })
        }
      }

      if (worker.fraud === "duplicate-amounts" && r() < 0.3) {
        const amount = pick(r, ROUND_AMOUNTS)
        const burstStart = new Date(entry)
        burstStart.setHours(entry.getHours() + 2 + Math.floor(r() * 4), Math.floor(r() * 40), 0, 0)
        const n = 4 + Math.floor(r() * 3)
        for (let k = 0; k < n; k++) {
          const soldAt = new Date(burstStart)
          soldAt.setMinutes(burstStart.getMinutes() + k * (4 + Math.floor(r() * 6)))
          if (soldAt > exit) break
          day.sales.push({ employeeId: worker.employeeId, soldAt, amount })
        }
      }
    }

    day.sales.sort((a, b) => a.soldAt.getTime() - b.soldAt.getTime())
    days.push(day)
  }

  return days
}
