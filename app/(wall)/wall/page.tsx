import Link from "next/link"
import { IconAlertTriangle, IconArrowLeft, IconUsers } from "@tabler/icons-react"

import { WallClock } from "@/components/wall/wall-clock"
import { getT } from "@/lib/i18n/server"
import { money } from "@/lib/format"
import { getWallboard, type WallStation } from "@/lib/wallboard"
import { cn } from "@/lib/utils"

export const metadata = { title: "Office screen" }

/** Wall screens are left running; never serve one from a cache. */
export const dynamic = "force-dynamic"

export default async function WallPage() {
  const t = await getT()
  const board = await getWallboard()
  const met = board.pct !== null && board.pct >= 100

  return (
    <div className="flex min-h-svh flex-col gap-5 overflow-hidden p-6 lg:gap-7 lg:p-10">
      {/* ------------------------------------------------------- header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="text-2xl font-semibold tracking-tight lg:text-3xl">
            SOCAR{" "}
            <span className="text-primary">SASIS</span>
          </span>
          <span className="rounded-full border border-border/70 px-3 py-1 font-mono text-sm text-muted-foreground tabular-nums lg:text-base">
            {board.date ?? "—"}
          </span>
        </div>
        <div className="flex items-center gap-6">
          <WallClock asOf={board.asOf} />
          {/* Small on purpose: the way back matters to whoever sets the screen
              up, and to nobody else in the room. */}
          <Link
            href="/"
            className="text-muted-foreground/50 transition-colors hover:text-foreground"
            aria-label={t.wall.exit}
          >
            <IconArrowLeft className="size-5" />
          </Link>
        </div>
      </header>

      {/* ------------------------------------------------ network total */}
      <section className="wall-glow relative overflow-hidden rounded-[2rem] border border-primary/20 bg-gradient-to-br from-primary/[0.12] via-card to-card p-7 lg:p-10">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase lg:text-sm">
              {t.wall.network}
            </span>
            <span
              // Stable hook so the wall and the overview can be checked
              // against each other without parsing translated currency text.
              data-metric="network-revenue"
              className="wall-figure text-7xl font-bold lg:text-[8.5rem]"
            >
              {money(board.revenue)}
            </span>
            <span className="text-lg font-medium text-muted-foreground lg:text-2xl">
              AZN
            </span>
          </div>

          {board.pct !== null ? (
            <div className="flex flex-col items-end gap-1">
              <span
                className={cn(
                  "text-6xl font-bold tabular-nums lg:text-8xl",
                  met ? "text-emerald-400" : "text-primary"
                )}
                style={{
                  textShadow: met
                    ? "0 0 60px oklch(0.7 0.18 155 / 0.45)"
                    : "0 0 60px oklch(0.6 0.22 264 / 0.45)",
                }}
              >
                {board.pct}
                <span className="text-3xl lg:text-5xl">%</span>
              </span>
              <span className="text-sm text-muted-foreground lg:text-lg">
                {t.wall.target} {money(board.target!)} AZN
              </span>
            </div>
          ) : (
            <span className="text-xl text-muted-foreground">
              {t.wall.noTarget}
            </span>
          )}
        </div>

        {board.pct !== null ? (
          <div className="mt-8 h-4 w-full overflow-hidden rounded-full bg-foreground/10">
            <div
              className={cn(
                "wall-bar h-full rounded-full transition-[width] duration-1000",
                met ? "bg-emerald-500" : "bg-primary"
              )}
              style={{ width: `${Math.min(100, Math.max(2, board.pct))}%` }}
            />
          </div>
        ) : null}

        <div className="mt-7 flex flex-wrap gap-4">
          <Counter
            icon={<IconUsers className="size-5" />}
            value={board.operators}
            label={t.wall.operators}
          />
          <Counter
            icon={<IconAlertTriangle className="size-5" />}
            value={board.alerts}
            label={t.wall.alerts}
            critical={board.alerts > 0}
          />
        </div>
      </section>

      {/* --------------------------------------------------- station grid */}
      <section className="grid flex-1 auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {board.stations.map((station, index) => (
          <StationCard
            key={station.station}
            station={station}
            rank={index + 1}
            t={t}
          />
        ))}
      </section>
    </div>
  )
}

function Counter({
  icon,
  value,
  label,
  critical = false,
}: {
  icon: React.ReactNode
  value: number
  label: string
  critical?: boolean
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 rounded-2xl border px-4 py-2.5 text-lg lg:text-xl",
        critical
          ? "border-red-500/35 bg-red-500/10 text-red-300"
          : "border-border/70 bg-foreground/[0.03] text-muted-foreground"
      )}
    >
      {icon}
      <span
        className={cn(
          "text-2xl font-bold tabular-nums lg:text-3xl",
          critical ? "text-red-300" : "text-foreground"
        )}
      >
        {value}
      </span>
      {label}
    </span>
  )
}

/**
 * One station, sized to be read from across a room: rank, revenue, and a
 * percentage large enough that nobody has to walk closer to find the site
 * that is behind.
 */
function StationCard({
  station,
  rank,
  t,
}: {
  station: WallStation
  rank: number
  t: Awaited<ReturnType<typeof getT>>
}) {
  const pct = station.pct
  const behind = pct !== null && pct < 80
  const ahead = pct !== null && pct >= 100

  return (
    <div
      className={cn(
        "relative flex flex-col justify-between gap-5 overflow-hidden rounded-3xl border p-5 lg:p-6",
        ahead && "border-emerald-500/35 bg-gradient-to-br from-emerald-500/[0.12] to-transparent",
        behind &&
          "wall-pulse border-red-500/40 bg-gradient-to-br from-red-500/[0.13] to-transparent",
        !ahead && !behind && "border-border/70 bg-card"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-foreground/10 font-mono text-sm font-semibold text-muted-foreground tabular-nums">
            {rank}
          </span>
          <span className="text-lg leading-tight font-semibold lg:text-xl">
            {station.station}
          </span>
        </div>
        {station.alerts > 0 ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-1 text-sm font-semibold text-red-300 tabular-nums">
            <IconAlertTriangle className="size-3.5" />
            {station.alerts}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          <span className="wall-figure text-4xl font-bold lg:text-5xl">
            {money(station.revenue)}
          </span>
          {pct !== null ? (
            <span
              className={cn(
                "text-4xl font-bold tabular-nums lg:text-5xl",
                ahead
                  ? "text-emerald-400"
                  : behind
                    ? "text-red-400"
                    : "text-foreground"
              )}
            >
              {pct}
              <span className="text-xl lg:text-2xl">%</span>
            </span>
          ) : null}
        </div>

        {pct !== null ? (
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-foreground/10">
            <div
              className={cn(
                "wall-bar h-full rounded-full",
                ahead ? "bg-emerald-500" : behind ? "bg-red-500" : "bg-primary"
              )}
              style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
            />
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">
            {t.wall.noTarget}
          </span>
        )}

        <span className="text-sm text-muted-foreground tabular-nums lg:text-base">
          {station.operators} {t.wall.operators}
        </span>
      </div>
    </div>
  )
}
