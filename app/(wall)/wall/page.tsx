import Link from "next/link"
import { IconArrowLeft } from "@tabler/icons-react"

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

  return (
    <div className="flex min-h-svh flex-col gap-6 p-6 lg:p-8">
      {/* ------------------------------------------------------- header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-4">
          <span className="text-xl font-semibold tracking-tight">
            SOCAR SASIS
          </span>
          <span className="font-mono text-lg text-muted-foreground tabular-nums">
            {board.date ?? "—"}
          </span>
        </div>
        <div className="flex items-center gap-6">
          <WallClock asOf={board.asOf} />
          {/* Small and unobtrusive: the way back matters to the person setting
              the screen up, and to nobody else in the room. */}
          <Link
            href="/"
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label={t.wall.exit}
          >
            <IconArrowLeft className="size-5" />
          </Link>
        </div>
      </header>

      {/* ------------------------------------------------ network total */}
      <section className="rounded-3xl bg-primary/[0.07] p-6 ring-1 ring-primary/20 lg:p-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-sm tracking-wide text-muted-foreground uppercase">
              {t.wall.network}
            </span>
            <span
              // Stable hook so the wall and the overview can be checked
              // against each other without parsing translated currency text.
              data-metric="network-revenue"
              className="text-6xl font-semibold tracking-tight tabular-nums lg:text-8xl"
            >
              {money(board.revenue)}
              <span className="ml-3 text-2xl font-normal text-muted-foreground">
                AZN
              </span>
            </span>
          </div>

          {board.pct !== null ? (
            <div className="flex flex-col items-end gap-1">
              <span
                className={cn(
                  "text-5xl font-semibold tabular-nums lg:text-7xl",
                  board.pct >= 100 ? "text-emerald-400" : "text-foreground"
                )}
              >
                {board.pct}%
              </span>
              <span className="text-sm text-muted-foreground">
                {t.wall.target} {money(board.target!)} AZN
              </span>
            </div>
          ) : (
            <span className="text-lg text-muted-foreground">
              {t.wall.noTarget}
            </span>
          )}
        </div>

        {board.pct !== null ? (
          <div
            className="mt-6 h-3 w-full overflow-hidden rounded-full bg-muted"
            role="presentation"
          >
            <div
              className={cn(
                "h-full rounded-full",
                board.pct >= 100 ? "bg-emerald-500" : "bg-primary"
              )}
              style={{ width: `${Math.min(100, Math.max(0, board.pct))}%` }}
            />
          </div>
        ) : null}

        <div className="mt-5 flex gap-8 text-lg text-muted-foreground">
          <span>
            <span className="font-semibold text-foreground tabular-nums">
              {board.operators}
            </span>{" "}
            {t.wall.operators}
          </span>
          <span>
            <span
              className={cn(
                "font-semibold tabular-nums",
                board.alerts > 0 ? "text-red-400" : "text-foreground"
              )}
            >
              {board.alerts}
            </span>{" "}
            {t.wall.alerts}
          </span>
        </div>
      </section>

      {/* --------------------------------------------------- station grid */}
      <section className="grid flex-1 auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {board.stations.map((station) => (
          <StationCard key={station.station} station={station} t={t} />
        ))}
      </section>
    </div>
  )
}

/**
 * One station. Read from across a room, so: big number, big percentage, and a
 * colour that means the same thing everywhere in the app.
 */
function StationCard({
  station,
  t,
}: {
  station: WallStation
  t: Awaited<ReturnType<typeof getT>>
}) {
  const pct = station.pct
  const band =
    pct === null
      ? "border-border"
      : pct >= 100
        ? "border-emerald-500/40 bg-emerald-500/[0.07]"
        : pct >= 80
          ? "border-border bg-card"
          : "border-red-500/40 bg-red-500/[0.07]"

  const pctColour =
    pct === null
      ? "text-muted-foreground"
      : pct >= 100
        ? "text-emerald-400"
        : pct >= 80
          ? "text-foreground"
          : "text-red-400"

  return (
    <div
      className={cn(
        "flex flex-col justify-between gap-4 rounded-2xl border p-5",
        band
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-lg leading-tight font-medium">
          {station.station}
        </span>
        {station.alerts > 0 ? (
          <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-sm text-red-400 tabular-nums">
            {station.alerts}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-3xl font-semibold tracking-tight tabular-nums xl:text-4xl">
          {money(station.revenue)}
        </span>

        {pct !== null ? (
          <>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
              role="presentation"
            >
              <div
                className={cn(
                  "h-full rounded-full",
                  pct >= 100
                    ? "bg-emerald-500"
                    : pct >= 80
                      ? "bg-primary"
                      : "bg-red-500"
                )}
                style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
              />
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className={cn("text-2xl font-semibold tabular-nums", pctColour)}>
                {pct}%
              </span>
              <span className="text-sm text-muted-foreground tabular-nums">
                {station.operators} {t.wall.operators}
              </span>
            </div>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">
            {t.wall.noTarget}
          </span>
        )}
      </div>
    </div>
  )
}
