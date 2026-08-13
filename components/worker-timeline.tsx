import { CHECK_TYPE_IN, CHECK_TYPE_OUT } from "@/lib/pos"
import type { SaleRow, WorkerDay } from "@/lib/data"

/**
 * The two connected graphs — one worker, one day, one shared time axis.
 *
 * Top band: PRESENCE, exactly as the taps state it — a bar from the first
 * IN to the last OUT, tap ticks on top, and a dashed red edge where a tap
 * is missing. Bottom: SALES bundled into 15-minute bars (height by litres,
 * colour by the bucket's leading grade, hover for the exact numbers) — a
 * live day carries hundreds of rows, and per-sale marks at that volume read
 * as noise. The exception: sales OUTSIDE the presence band stay individual
 * red markers, because each one IS the alert.
 *
 * Because both share the axis, the eye does the join: a red marker past the
 * band's right edge needs no explanation.
 */

const W = 960
const H = 190
const AXIS_Y = 158
const BAND_Y = 34
const BAND_H = 22
const LOLLI_BASE = 150
const LOLLI_MAX = 74
const BIN_MS = 15 * 60_000

const GRADE_COLOR: Record<string, string> = {
  "AI-92": "var(--chart-2)",
  "AI-95": "var(--chart-1)",
  "AI-98": "var(--chart-4)",
  Diesel: "var(--muted-foreground)",
}

export function WorkerTimeline({
  day,
  sales,
  labels,
}: {
  day: WorkerDay
  /** The day's rows from THE sales table (see getWorkerDaySales). */
  sales: SaleRow[]
  labels: { presence: string; sales: string; missing: string }
}) {
  const times = [...day.taps.map((t) => t.at), ...sales.map((s) => s.at)]
  if (times.length === 0) return null

  const min = Math.min(...times) - 40 * 60_000
  const max = Math.max(...times) + 40 * 60_000
  const x = (at: number) => 16 + ((at - min) / (max - min)) * (W - 32)

  const ins = day.taps.filter((t) => t.type === CHECK_TYPE_IN)
  const outs = day.taps.filter((t) => t.type === CHECK_TYPE_OUT)
  const bandFrom = day.checkIn
  const bandTo = day.checkOut

  const offClock = (at: number) =>
    (bandFrom !== null && at < bandFrom) ||
    (bandTo !== null && at > bandTo) ||
    (bandFrom === null && bandTo === null)

  // In-window sales collapse into 15-minute buckets — constant visual weight
  // however many rows the live feed delivers. Off-clock sales stay single.
  type Bin = {
    start: number
    count: number
    litres: number
    amount: number
    byGrade: Record<string, number>
  }
  const bins = new Map<number, Bin>()
  const offSales = []
  for (const sale of sales) {
    if (offClock(sale.at)) {
      offSales.push(sale)
      continue
    }
    const key = Math.floor(sale.at / BIN_MS)
    const bin =
      bins.get(key) ??
      ({ start: key * BIN_MS, count: 0, litres: 0, amount: 0, byGrade: {} } as Bin)
    bin.count += 1
    bin.litres += sale.litres
    bin.amount += sale.amount
    bin.byGrade[sale.grade] = (bin.byGrade[sale.grade] ?? 0) + sale.litres
    bins.set(key, bin)
  }
  const binList = [...bins.values()].sort((a, b) => a.start - b.start)
  const maxBinLitres = Math.max(1, ...binList.map((b) => b.litres))

  const leadGrade = (bin: Bin) =>
    Object.entries(bin.byGrade).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "AI-92"

  // Hour ticks across the visible span, at most every hour, thinned to ~12.
  const hourMs = 3_600_000
  const firstHour = Math.ceil(min / hourMs) * hourMs
  const hours: number[] = []
  for (let t = firstHour; t <= max; t += hourMs) hours.push(t)
  const step = Math.max(1, Math.ceil(hours.length / 12))
  const ticks = hours.filter((_, i) => i % step === 0)

  const hm = (at: number) => {
    const d = new Date(at)
    return `${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes()
    ).padStart(2, "0")}`
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="min-w-[640px] w-full"
          role="img"
        >
          {/* Shared hour grid — the visual join between the two graphs. */}
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={x(t)}
                x2={x(t)}
                y1={18}
                y2={AXIS_Y}
                stroke="currentColor"
                strokeOpacity={0.08}
              />
              <text
                x={x(t)}
                y={AXIS_Y + 16}
                fontSize={11}
                textAnchor="middle"
                fill="currentColor"
                opacity={0.55}
              >
                {hm(t)}
              </text>
            </g>
          ))}

          {/* ---------------- presence band (graph 1) ---------------- */}
          <text x={16} y={24} fontSize={11} fill="currentColor" opacity={0.55}>
            {labels.presence}
          </text>
          {bandFrom !== null && bandTo !== null ? (
            <rect
              x={x(bandFrom)}
              y={BAND_Y}
              width={Math.max(2, x(bandTo) - x(bandFrom))}
              height={BAND_H}
              rx={5}
              fill="var(--chart-2)"
              opacity={0.28}
            />
          ) : null}
          {/* A missing tap is drawn, not implied: a dashed red edge where
              the band should have ended. */}
          {bandFrom !== null && bandTo === null ? (
            <>
              <rect
                x={x(bandFrom)}
                y={BAND_Y}
                width={Math.max(2, x(max) - x(bandFrom))}
                height={BAND_H}
                rx={5}
                fill="var(--destructive)"
                opacity={0.12}
              />
              <line
                x1={x(max)}
                x2={x(max)}
                y1={BAND_Y - 4}
                y2={BAND_Y + BAND_H + 4}
                stroke="var(--destructive)"
                strokeWidth={2}
                strokeDasharray="4 3"
              />
            </>
          ) : null}
          {bandTo !== null && bandFrom === null ? (
            <>
              <rect
                x={x(min)}
                y={BAND_Y}
                width={Math.max(2, x(bandTo) - x(min))}
                height={BAND_H}
                rx={5}
                fill="var(--destructive)"
                opacity={0.12}
              />
              <line
                x1={x(min)}
                x2={x(min)}
                y1={BAND_Y - 4}
                y2={BAND_Y + BAND_H + 4}
                stroke="var(--destructive)"
                strokeWidth={2}
                strokeDasharray="4 3"
              />
            </>
          ) : null}
          {ins.map((t, i) => (
            <line
              key={`in-${i}`}
              x1={x(t.at)}
              x2={x(t.at)}
              y1={BAND_Y - 6}
              y2={BAND_Y + BAND_H + 6}
              stroke="var(--chart-3)"
              strokeWidth={2.5}
            />
          ))}
          {outs.map((t, i) => (
            <line
              key={`out-${i}`}
              x1={x(t.at)}
              x2={x(t.at)}
              y1={BAND_Y - 6}
              y2={BAND_Y + BAND_H + 6}
              stroke="var(--chart-5)"
              strokeWidth={2.5}
            />
          ))}

          {/* ---------------- sales lollipops (graph 2) ---------------- */}
          <text
            x={16}
            y={LOLLI_BASE - LOLLI_MAX - 8}
            fontSize={11}
            fill="currentColor"
            opacity={0.55}
          >
            {labels.sales}
          </text>
          <line
            x1={12}
            x2={W - 12}
            y1={LOLLI_BASE}
            y2={LOLLI_BASE}
            stroke="currentColor"
            strokeOpacity={0.2}
          />
          {binList.map((bin) => {
            const h = 6 + (bin.litres / maxBinLitres) * (LOLLI_MAX - 6)
            const left = x(bin.start)
            const width = Math.max(2, x(bin.start + BIN_MS) - left - 1.5)
            return (
              <rect
                key={bin.start}
                x={left}
                y={LOLLI_BASE - h}
                width={width}
                height={h}
                rx={2}
                fill={GRADE_COLOR[leadGrade(bin)] ?? "var(--chart-2)"}
                opacity={0.7}
              >
                <title>
                  {`${hm(bin.start)}–${hm(bin.start + BIN_MS)} · ${bin.count}× · ${bin.litres.toFixed(0)} L · ${bin.amount.toFixed(0)} ₼`}
                </title>
              </rect>
            )
          })}

          {/* Sales outside the presence band: each one IS the alert, so
              each one keeps its own red marker. */}
          {offSales.map((sale) => {
            const h = Math.max(
              24,
              8 + (sale.litres / maxBinLitres) * (LOLLI_MAX - 8)
            )
            return (
              <g key={sale.db1Id}>
                <line
                  x1={x(sale.at)}
                  x2={x(sale.at)}
                  y1={LOLLI_BASE}
                  y2={LOLLI_BASE - h}
                  stroke="var(--destructive)"
                  strokeWidth={2}
                  opacity={0.9}
                />
                <circle
                  cx={x(sale.at)}
                  cy={LOLLI_BASE - h}
                  r={3.5}
                  fill="var(--destructive)"
                >
                  <title>
                    {`${hm(sale.at)} · ${sale.litres.toFixed(2)} L · ${sale.amount.toFixed(2)} ₼`}
                  </title>
                </circle>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Legend, in words: what the colours claim. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm bg-(--chart-2) opacity-40" />
          {labels.presence}
        </span>
        {Object.entries(GRADE_COLOR).map(([grade, color]) => (
          <span key={grade} className="flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full"
              style={{ background: color }}
            />
            {grade}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-(--destructive)" />
          {labels.missing}
        </span>
      </div>
    </div>
  )
}
