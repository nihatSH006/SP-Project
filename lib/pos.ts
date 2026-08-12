/**
 * The core data model, mirroring the REAL SOCAR tables:
 *
 *   db3_loglar   — attendance taps: userid, ad_soyad, deptid/deptname,
 *                  kart_no, check_time, check_type
 *   db3_satislar — fob sales: db1_id, istasyon, satis_zamani, db1_personel,
 *                  kart_no, v_no, analiz_edildi
 *
 * Litres, fuel grade and price are NOT in db3_satislar — they live on the
 * db1 sale record it points to, so here they are simulated as that join.
 * `v_no` is carried as-is, unexplained, exactly as the database carries it.
 *
 * Alerts are ONLY what these two tables can PROVE — a tap that is missing,
 * a sale outside the tapped window. No statistics, no scores, no proposals:
 * every alert here is a database fact.
 */

/**
 * check_type values — NOT yet confirmed by the POS side. The common
 * attendance-device convention is 0 = in, 1 = out; if SOCAR's device says
 * otherwise, these two constants are the only place to change.
 */
export const CHECK_TYPE_IN = 0
export const CHECK_TYPE_OUT = 1

export type Tap = {
  /** Epoch ms of check_time. */
  at: number
  /** Raw check_type value. */
  type: number
}

export type WorkerSale = {
  /** Epoch ms of satis_zamani. */
  at: number
  /** db1_id — the unique sale id in the till database. */
  db1Id: string
  kartNo: string | null
  /** Carried verbatim from the source; meaning unconfirmed. */
  vNo: string
  /** Simulated db1 join: what the worker keyed at the pump. */
  litres: number
  grade: string
  amount: number
}

// ------------------------------------------------------------------ alerts

/**
 * Only facts. Each id names something the two tables state outright:
 *
 *   missing-out    — the day has an IN tap and no OUT tap
 *   missing-in     — an OUT tap with no IN before it
 *   double-tap-in  — the IN tap reads twice in a row (device/tap anomaly)
 *   double-tap-out — the OUT tap reads twice in a row; the last one counts
 *   sale-off-clock — a sale before the first IN or after the last OUT
 *   no-taps-sales  — sales on a card with no taps at all that day
 */
export type ObviousAlertId =
  | "missing-out"
  | "missing-in"
  | "double-tap-in"
  | "double-tap-out"
  | "sale-off-clock"
  | "no-taps-sales"

export type AlertSeverity = "low" | "medium" | "high"

export const ALERT_SEVERITY: Record<ObviousAlertId, AlertSeverity> = {
  "missing-out": "medium",
  "missing-in": "medium",
  "double-tap-in": "low",
  "double-tap-out": "low",
  "sale-off-clock": "high",
  "no-taps-sales": "high",
}

/** Alert id -> translation key, so raw ids never reach a user. */
export const ALERT_LABEL_KEY: Record<ObviousAlertId, string> = {
  "missing-out": "missingOut",
  "missing-in": "missingIn",
  "double-tap-in": "doubleTapIn",
  "double-tap-out": "doubleTapOut",
  "sale-off-clock": "saleOffClock",
  "no-taps-sales": "noTapsSales",
}

export type ObviousAlert = {
  type: ObviousAlertId
  severity: AlertSeverity
  /** Epoch ms the alert anchors to (the tap, the sale). */
  at: number
  /** CCTV window — the minutes to check. */
  from: number
  to: number
  /** ₼ involved, when a sale is involved. */
  amount?: number
  /** The card in question, for card-shaped alerts. */
  kartNo?: string
}

const WINDOW_MS = 2 * 60_000

const around = (at: number) => ({ from: at - WINDOW_MS, to: at + WINDOW_MS })

/**
 * Judge one worker-day: their taps and their sales. Pure and total — no
 * peers, no baselines, nothing that could be argued with. Every returned
 * alert can be read straight back out of the two tables.
 */
export function detectWorkerDayAlerts(
  taps: Tap[],
  sales: WorkerSale[]
): ObviousAlert[] {
  const alerts: ObviousAlert[] = []
  const sorted = [...taps].sort((a, b) => a.at - b.at)

  const ins = sorted.filter((t) => t.type === CHECK_TYPE_IN)
  const outs = sorted.filter((t) => t.type === CHECK_TYPE_OUT)
  const firstIn = ins[0]?.at
  const lastOut = outs.at(-1)?.at

  // Tap-shape problems ------------------------------------------------------
  if (sorted.length > 0) {
    if (ins.length > 0 && outs.length === 0) {
      const last = sorted.at(-1)!.at
      alerts.push({
        type: "missing-out",
        severity: ALERT_SEVERITY["missing-out"],
        at: last,
        ...around(last),
      })
    }
    if (outs.length > 0 && ins.length === 0) {
      const first = sorted[0].at
      alerts.push({
        type: "missing-in",
        severity: ALERT_SEVERITY["missing-in"],
        at: first,
        ...around(first),
      })
    }
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].type === sorted[i - 1].type) {
        // Anchors on the LATER tap — for a doubled OUT that is the one
        // that counts as the real check-out (see `lastOut` above).
        const type: ObviousAlertId =
          sorted[i].type === CHECK_TYPE_OUT ? "double-tap-out" : "double-tap-in"
        alerts.push({
          type,
          severity: ALERT_SEVERITY[type],
          at: sorted[i].at,
          ...around(sorted[i].at),
        })
      }
    }
  }

  // Sales against the tapped window ----------------------------------------
  if (sales.length > 0 && sorted.length === 0) {
    // Selling with zero presence recorded: the strongest fact of the set.
    const first = [...sales].sort((a, b) => a.at - b.at)[0]
    alerts.push({
      type: "no-taps-sales",
      severity: ALERT_SEVERITY["no-taps-sales"],
      at: first.at,
      ...around(first.at),
      amount: Math.round(sales.reduce((s, x) => s + x.amount, 0) * 100) / 100,
    })
  } else {
    for (const sale of sales) {
      const beforeIn = firstIn !== undefined && sale.at < firstIn
      const afterOut = lastOut !== undefined && sale.at > lastOut
      if (beforeIn || afterOut) {
        alerts.push({
          type: "sale-off-clock",
          severity: ALERT_SEVERITY["sale-off-clock"],
          at: sale.at,
          ...around(sale.at),
          amount: sale.amount,
        })
      }
    }
  }

  return alerts.sort((a, b) => a.at - b.at)
}
