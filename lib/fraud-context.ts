/**
 * Builds the context the fraud rules need: peer groups and hourly norms.
 *
 * The rules themselves (`lib/fraud-rules.ts`) are pure and judge one
 * operator-day at a time, but two of them need to know what NORMAL looks like:
 *
 *   · `velocity-outlier` compares an operator against their peers on that shift
 *   · `dead-hours` compares an hour's takings against what one person usually
 *     takes in that hour at that station
 *
 * That context spans the whole dataset, so it is assembled once here and shared
 * by the importer and the verification script. It lived in the verifier first;
 * duplicating it into the seeder would have meant the tested behaviour and the
 * shipped behaviour could silently diverge — the norm being computed slightly
 * differently in the two places is exactly the bug that made `dead-hours` fire
 * on 76% of operator-days.
 */
import { median, type RuleInput } from "@/lib/fraud-rules"

export type FraudDay = {
  date: string
  attendance: { employeeId: number; entry: Date; exit: Date }[]
  sales: { employeeId: number; soldAt: Date; amount: number }[]
}

export type FraudWorker = {
  employeeId: number
  name: string
  station: string
}

const isRound = (amount: number) => amount % 10 === 0

/**
 * One `RuleInput` per operator-day, keyed `${date}|${employeeId}`.
 *
 * Two passes are unavoidable: the hourly norm is a median over every day, so
 * no day can be judged until all of them have been read.
 */
export function buildFraudInputs(
  days: FraudDay[],
  workers: Map<number, FraudWorker>
): Map<string, RuleInput> {
  // ---- pass 1: what one operator typically takes in each hour, per station.
  // Per OPERATOR, not per station total. Comparing an individual's hour against
  // the whole forecourt's takings marks almost everybody "dead".
  const samples = new Map<string, Map<number, number[]>>()
  for (const day of days) {
    const byOperatorHour = new Map<string, number>()
    for (const sale of day.sales) {
      const key = `${sale.employeeId}|${sale.soldAt.getHours()}`
      byOperatorHour.set(key, (byOperatorHour.get(key) ?? 0) + sale.amount)
    }
    for (const [key, revenue] of byOperatorHour) {
      const [employeeId, hour] = key.split("|").map(Number)
      const worker = workers.get(employeeId)
      if (!worker) continue
      const hours = samples.get(worker.station) ?? new Map<number, number[]>()
      hours.set(hour, [...(hours.get(hour) ?? []), revenue])
      samples.set(worker.station, hours)
    }
  }

  const norms = new Map<string, Map<number, number>>()
  for (const [station, hours] of samples) {
    const norm = new Map<number, number>()
    // Median, not mean: one huge hour should not raise the bar for everyone.
    for (const [hour, values] of hours) norm.set(hour, median(values))
    norms.set(station, norm)
  }

  // ---- pass 2: assemble each operator-day against its peers.
  const inputs = new Map<string, RuleInput>()
  for (const day of days) {
    const salesBy = new Map<number, { soldAt: Date; amount: number }[]>()
    for (const sale of day.sales) {
      const list = salesBy.get(sale.employeeId)
      if (list) list.push(sale)
      else salesBy.set(sale.employeeId, [sale])
    }

    // Peer group is everyone at the same station that day — a night operator
    // is still compared against colleagues, just a smaller set of them.
    const peers = new Map<
      string,
      { employeeId: number; salesPerHour: number; roundShare: number }[]
    >()
    for (const att of day.attendance) {
      const worker = workers.get(att.employeeId)
      if (!worker) continue
      const sales = salesBy.get(att.employeeId) ?? []
      const hours = (att.exit.getTime() - att.entry.getTime()) / 3_600_000
      const list = peers.get(worker.station) ?? []
      list.push({
        employeeId: att.employeeId,
        salesPerHour: hours > 0 ? sales.length / hours : 0,
        roundShare: sales.length
          ? (sales.filter((s) => isRound(s.amount)).length / sales.length) * 100
          : 0,
      })
      peers.set(worker.station, list)
    }

    for (const att of day.attendance) {
      const worker = workers.get(att.employeeId)
      if (!worker) continue
      const sales = salesBy.get(att.employeeId) ?? []
      const hours = (att.exit.getTime() - att.entry.getTime()) / 3_600_000
      inputs.set(`${day.date}|${att.employeeId}`, {
        employeeId: worker.employeeId,
        name: worker.name,
        station: worker.station,
        entry: att.entry,
        exit: att.exit,
        sales,
        peers: peers.get(worker.station) ?? [],
        salesPerHour: hours > 0 ? sales.length / hours : 0,
        stationHourlyNorm: norms.get(worker.station),
      })
    }
  }

  return inputs
}
