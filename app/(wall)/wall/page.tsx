import {
  IconAlertTriangle,
  IconBuildingStore,
  IconClockX,
  IconMoonStars,
} from "@tabler/icons-react"

import { SocarLogo } from "@/components/socar-logo"
import { Sparkline } from "@/components/wall/sparkline"
import { WallClock } from "@/components/wall/wall-clock"
import { formatDayLabel } from "@/lib/i18n"
import { getLocale, getT } from "@/lib/i18n/server"
import { ALERT_LABEL_KEY, type ObviousAlertId } from "@/lib/pos"
import { getWallboard, type WallStation } from "@/lib/wallboard"
import { cn } from "@/lib/utils"

export const metadata = { title: "Alert board" }

/** Wall screens are left running; never serve one from a cache. */
export const dynamic = "force-dynamic"

/** Seconds each card spends crossing the screen. Calm, not urgent. */
const SECONDS_PER_CARD = 5

/**
 * The security-office wall: is anything wrong, where, and what exactly.
 * One number owns the room; the feed beside it names each detection; the
 * ticker walks the stations worst-first. Everything on it is a database
 * fact — a missing tap, a sale off the clock, a card nobody owns.
 */
export default async function WallPage() {
  const [t, locale, board] = await Promise.all([
    getT(),
    getLocale(),
    getWallboard(),
  ])

  const copies = Math.max(2, Math.ceil(10 / Math.max(1, board.stations.length)))
  const duration = Math.max(20, board.stations.length * SECONDS_PER_CARD)

  const typeName = (type: string) =>
    t.alerts.types[
      ALERT_LABEL_KEY[type as ObviousAlertId] as keyof typeof t.alerts.types
    ] ?? type

  return (
    <div className="wall-ambient flex h-svh flex-col overflow-hidden">
      {/* Nothing clickable: a board on a wall has no navigation. */}
      <header className="flex items-center gap-8 border-b wall-rule px-8 py-4 lg:px-12">
        <SocarLogo className="h-8 text-foreground lg:h-10" />
        <span className="wall-label hidden sm:inline">{t.wall.title}</span>
        <div className="ml-auto">
          <WallClock
            date={board.date ? formatDayLabel(board.date, locale) : null}
            asOf={board.asOf}
          />
        </div>
      </header>

      {/* -------------------------------------------------- network state */}
      <section className="flex min-h-0 flex-1 items-center justify-center px-8 lg:px-14">
        <div className="grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div className="flex flex-col items-center gap-8 lg:items-start">
            <div className="flex items-baseline gap-5">
              <span
                className={cn(
                  "wall-figure text-8xl font-semibold tabular-nums lg:text-[11rem] lg:leading-none",
                  board.alertsToday > 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-emerald-600 dark:text-emerald-400"
                )}
              >
                {board.alertsToday}
              </span>
              <span className="wall-label max-w-32 text-base text-pretty lg:text-lg">
                {t.wall.alertsToday}
              </span>
            </div>

            <div className="flex flex-wrap gap-x-12 gap-y-6">
              <Figure
                icon={<IconClockX className="size-6 lg:size-7" />}
                value={board.missingTaps}
                label={t.wall.missingTaps}
                tone={board.missingTaps > 0 ? "critical" : "good"}
              />
              <Figure
                icon={<IconBuildingStore className="size-6 lg:size-7" />}
                value={`${board.clearStations}/${board.stations.length}`}
                label={t.wall.clearStations}
                tone={
                  board.clearStations === board.stations.length
                    ? "good"
                    : "neutral"
                }
              />
            </div>

            {/* The honesty line: this is a daily import, not a feed. */}
            <p className="wall-label">{t.wall.notLive}</p>
          </div>

          {/* ------------------------------------------------ event feed */}
          <div className="flex flex-col gap-4">
            <span className="wall-label flex items-center gap-2.5">
              <IconAlertTriangle className="size-5" />
              {t.wall.latestTitle}
            </span>
            {board.events.length === 0 ? (
              <p className="text-lg text-muted-foreground">
                {t.wall.noEvents}
              </p>
            ) : (
              <ul className="flex flex-col">
                {board.events.map((event, index) => (
                  <li
                    key={`${event.at}-${event.station}-${event.type}-${index}`}
                    className={cn(
                      "flex items-baseline gap-4 py-2.5 text-base lg:text-lg",
                      index > 0 && "border-t wall-rule"
                    )}
                  >
                    <span className="w-14 shrink-0 font-mono tabular-nums text-muted-foreground">
                      {timeOf(event.at)}
                    </span>
                    <span
                      className={cn(
                        "mt-1.5 size-2.5 shrink-0 self-center rounded-full",
                        event.severity === "high" && "bg-red-500",
                        event.severity === "medium" && "bg-amber-500",
                        event.severity === "low" && "bg-muted-foreground/50"
                      )}
                      role="presentation"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {typeName(event.type)}
                      </span>
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        {event.station}
                        {new Date(event.at).getHours() >= 22 ||
                        new Date(event.at).getHours() < 6 ? (
                          <IconMoonStars
                            className="size-3.5 text-indigo-500 dark:text-indigo-300"
                            aria-hidden
                          />
                        ) : null}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
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
            board.stations.map((station) => (
              <StationCard
                key={`${copy}-${station.station}`}
                station={station}
                t={t}
                duplicate={copy > 0}
              />
            ))
          )}
        </div>
      </section>
    </div>
  )
}

/** "09:41" from epoch ms — manual padding so server and browser agree. */
function timeOf(at: number): string {
  const d = new Date(at)
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`
}

function Figure({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ReactNode
  value: React.ReactNode
  label: string
  tone: "good" | "neutral" | "critical"
}) {
  return (
    <div className="flex flex-col items-center gap-2 lg:items-start">
      <span
        className={cn(
          "flex items-center gap-3",
          tone === "critical" && "text-red-600 dark:text-red-400",
          tone === "good" && "text-emerald-600 dark:text-emerald-400",
          tone === "neutral" && "text-muted-foreground"
        )}
      >
        {icon}
        <span
          className={cn(
            "wall-figure text-5xl font-semibold tabular-nums lg:text-6xl",
            tone === "critical"
              ? "text-red-600 dark:text-red-400"
              : "text-foreground"
          )}
        >
          {value}
        </span>
      </span>
      <span className="wall-label">{label}</span>
    </div>
  )
}

/** One station in the ticker — fixed width so fifty read like five. */
function StationCard({
  station,
  t,
  duplicate,
}: {
  station: WallStation
  t: Awaited<ReturnType<typeof getT>>
  duplicate: boolean
}) {
  const critical = station.status === "critical"
  const attention = station.status === "attention"

  return (
    <div
      aria-hidden={duplicate || undefined}
      data-station={station.station}
      className={cn(
        "flex w-[19rem] shrink-0 flex-col gap-3 rounded-2xl border bg-card/60 px-5 py-4",
        critical && "border-red-500/45",
        attention && "border-amber-500/40",
        !critical && !attention && "border-emerald-500/30"
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-lg font-medium">{station.station}</span>
        <span
          className={cn(
            "shrink-0 text-xs font-medium",
            critical && "text-red-600 dark:text-red-400",
            attention && "text-amber-600 dark:text-amber-400",
            !critical && !attention &&
              "text-emerald-600 dark:text-emerald-400"
          )}
        >
          {t.wall.status[station.status]}
        </span>
      </div>

      <div className="flex items-end justify-between gap-3">
        <span className="flex items-baseline gap-2">
          <span className="wall-figure text-4xl font-semibold tabular-nums">
            {station.alertsToday}
          </span>
          <span className="wall-label">{t.wall.alertsShort}</span>
        </span>
        <Sparkline
          values={station.spark}
          width={72}
          height={24}
          className={cn(
            critical
              ? "text-red-600 dark:text-red-400/70"
              : attention
                ? "text-amber-600 dark:text-amber-400/70"
                : "text-emerald-600 dark:text-emerald-400/70"
          )}
        />
      </div>

      <div className="flex items-baseline justify-between">
        <span className="wall-label">
          {t.wall.missingShort(station.missingTaps)}
        </span>
        {station.highToday > 0 ? (
          <span className="text-sm font-medium text-red-600 dark:text-red-400">
            {t.wall.highShort(station.highToday)}
          </span>
        ) : null}
      </div>
    </div>
  )
}
