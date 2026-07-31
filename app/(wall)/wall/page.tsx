import {
  IconAlertTriangle,
  IconBuildingStore,
  IconUsers,
} from "@tabler/icons-react"

import { SocarLogo } from "@/components/socar-logo"
import { Sparkline } from "@/components/wall/sparkline"
import { WallClock } from "@/components/wall/wall-clock"
import { formatDayLabel } from "@/lib/i18n"
import { getLocale, getT } from "@/lib/i18n/server"
import { money } from "@/lib/format"
import { getWallboard, type WallStation } from "@/lib/wallboard"
import { cn } from "@/lib/utils"

export const metadata = { title: "Office screen" }

/** Wall screens are left running; never serve one from a cache. */
export const dynamic = "force-dynamic"

/** Seconds each card spends crossing the screen. Calm, not urgent. */
const SECONDS_PER_CARD = 5

export default async function WallPage() {
  const [t, locale, board] = await Promise.all([
    getT(),
    getLocale(),
    getWallboard(),
  ])
  const met = board.pct !== null && board.pct >= 100

  // Enough copies that the track always overflows the widest screen, even for
  // a two-station network. Two is the minimum for a seamless loop.
  const copies = Math.max(2, Math.ceil(10 / Math.max(1, board.stations.length)))
  const duration = Math.max(20, board.stations.length * SECONDS_PER_CARD)

  return (
    <div className="wall-ambient flex h-svh flex-col overflow-hidden">
      {/* ------------------------------------------------------- header */}
      {/* Everything left-aligned and nothing clickable. A board on a wall has
          no navigation: a stray touch should not be able to take the screen
          somewhere else, and there is nobody standing at it to bring it back. */}
      <header className="flex items-center gap-8 border-b wall-rule px-8 py-4 lg:px-12">
        <SocarLogo className="h-8 w-auto text-foreground lg:h-10" />
        <div className="ml-auto">
          <WallClock
            date={board.date ? formatDayLabel(board.date, locale) : null}
            asOf={board.asOf}
          />
        </div>
      </header>

      {/* ------------------------------------------------ network total */}
      <section className="flex flex-1 flex-col justify-center gap-10 px-8 py-8 lg:flex-row lg:items-center lg:gap-16 lg:px-12">
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline gap-4">
            <span
              // Stable hook so the wall and the overview can be checked against
              // each other without parsing translated currency text.
              data-metric="network-revenue"
              className="wall-figure text-[6rem] font-semibold sm:text-[8rem] lg:text-[11rem] xl:text-[13rem]"
            >
              {money(board.revenue)}
            </span>
            <span className="text-2xl font-light text-muted-foreground lg:text-4xl">
              AZN
            </span>
          </div>

          <div className="mt-2 flex items-center gap-10">
            <Stat
              icon={<IconUsers className="size-6 lg:size-7" />}
              value={board.operators}
              label={t.wall.operators}
            />
            <Stat
              icon={<IconAlertTriangle className="size-6 lg:size-7" />}
              value={board.alerts}
              label={t.wall.alerts}
              critical={board.alerts > 0}
            />
            <Stat
              icon={<IconBuildingStore className="size-6 lg:size-7" />}
              value={board.stations.length}
              label={t.wall.stations}
            />
          </div>
        </div>

        {board.pct !== null ? (
          <div className="flex flex-col gap-4 lg:ml-auto lg:min-w-[22rem] lg:border-l lg:wall-rule lg:pl-16">
            <div className="flex items-baseline justify-between gap-4">
              <span className="wall-label">{t.wall.target}</span>
              <span className="font-mono text-2xl text-muted-foreground tabular-nums lg:text-3xl">
                {money(board.target!)} AZN
              </span>
            </div>
            <span
              className={cn(
                "wall-figure text-7xl font-semibold lg:text-[9rem]",
                met ? "text-emerald-400" : "text-foreground"
              )}
            >
              {board.pct}
              <span className="ml-1 text-3xl font-light text-muted-foreground lg:text-5xl">
                %
              </span>
            </span>
            <Bar pct={board.pct} met={met} className="h-2" />
          </div>
        ) : (
          <span className="text-xl text-muted-foreground lg:ml-auto">
            {t.wall.noTarget}
          </span>
        )}
      </section>

      {/* --------------------------------------------------- station ticker */}
      <section className="shrink-0 overflow-hidden border-t wall-rule py-6">
        <div
          className="wall-track gap-4 px-4"
          style={
            {
              "--marquee-duration": `${duration}s`,
              "--marquee-copies": copies,
            } as React.CSSProperties
          }
        >
          {Array.from({ length: copies }, (_, copy) =>
            board.stations.map((station, index) => (
              <StationCard
                key={`${copy}-${station.station}`}
                station={station}
                rank={index + 1}
                t={t}
                // Only the first pass is real content; the rest are visual
                // duplicates and must not be read out twice.
                duplicate={copy > 0}
              />
            ))
          )}
        </div>
      </section>
    </div>
  )
}

/**
 * An icon and a number. The words are carried by `title`/`aria-label` rather
 * than printed: at this size a glyph is read faster than a caption, and three
 * captions across the hero competed with the revenue figure above them.
 */
function Stat({
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
        "flex items-center gap-2.5",
        critical ? "text-red-400" : "text-muted-foreground"
      )}
      title={label}
    >
      {icon}
      <span
        className={cn(
          "text-3xl font-semibold tabular-nums lg:text-4xl",
          critical ? "text-red-400" : "text-foreground"
        )}
      >
        {value}
      </span>
      <span className="sr-only">{label}</span>
    </span>
  )
}

function Bar({
  pct,
  met,
  behind = false,
  className,
}: {
  pct: number
  met: boolean
  behind?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-full bg-foreground/[0.08]",
        className
      )}
      role="presentation"
    >
      <div
        className={cn(
          "h-full rounded-full",
          met ? "bg-emerald-500" : behind ? "bg-amber-500" : "bg-primary"
        )}
        style={{ width: `${Math.min(100, Math.max(1.5, pct))}%` }}
      />
    </div>
  )
}

/**
 * One station in the ticker.
 *
 * Fixed width on purpose: the card size is what makes fifty stations as
 * readable as five. Behind-target is marked with an amber edge and amber
 * figures rather than a fill — the card is already moving, and a moving
 * coloured block is noise.
 */
function StationCard({
  station,
  rank,
  t,
  duplicate,
}: {
  station: WallStation
  rank: number
  t: Awaited<ReturnType<typeof getT>>
  duplicate: boolean
}) {
  const pct = station.pct
  const met = pct !== null && pct >= 100
  const behind = pct !== null && pct < 80

  return (
    <div
      aria-hidden={duplicate || undefined}
      className={cn(
        "flex w-[19rem] shrink-0 flex-col gap-3 rounded-2xl border bg-card/60 px-5 py-4",
        met && "border-emerald-500/30",
        behind && "border-amber-500/40",
        !met && !behind && "border-border/70"
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex min-w-0 items-baseline gap-2.5">
          <span className="font-mono text-xs text-muted-foreground/60 tabular-nums">
            {String(rank).padStart(2, "0")}
          </span>
          <span className="truncate text-lg font-medium">{station.station}</span>
        </span>
        {station.alerts > 0 ? (
          <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 font-mono text-xs text-red-300 tabular-nums">
            {station.alerts}
          </span>
        ) : null}
      </div>

      <div className="flex items-end justify-between gap-3">
        <span className="wall-figure text-4xl font-semibold">
          {money(station.revenue)}
        </span>
        <Sparkline
          values={station.spark}
          width={72}
          height={24}
          className={cn(
            met
              ? "text-emerald-400/70"
              : behind
                ? "text-amber-400/70"
                : "text-primary/70"
          )}
        />
      </div>

      {pct !== null ? (
        <div className="flex flex-col gap-2">
          <Bar pct={pct} met={met} behind={behind} className="h-1" />
          <div className="flex items-baseline justify-between">
            <span className="wall-label">
              {station.operators} {t.wall.operators}
            </span>
            <span
              className={cn(
                "text-xl font-semibold tabular-nums",
                met
                  ? "text-emerald-400"
                  : behind
                    ? "text-amber-400"
                    : "text-foreground"
              )}
            >
              {pct}%
            </span>
          </div>
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">{t.wall.noTarget}</span>
      )}
    </div>
  )
}
