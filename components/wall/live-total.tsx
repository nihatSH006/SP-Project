"use client"

import * as React from "react"
import { IconTargetArrow } from "@tabler/icons-react"

import { RollingNumber } from "@/components/wall/rolling-number"
import { useT } from "@/components/i18n-provider"
import { money } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * The headline figure, animated.
 *
 * It owns the displayed value rather than reading the server's directly, so
 * two things can drive it: a real refresh (the prop changes) and the demo hook
 * below. The percentage is derived here rather than passed in, so the two
 * numbers can never disagree mid-animation.
 */
export function LiveTotal({
  revenue,
  target,
  counters,
  demo = false,
}: {
  revenue: number
  target: number | null
  /** On-duty / flagged / station tallies, rendered by the page. */
  counters: React.ReactNode
  /** Simulate movement so the animation can be seen without an import. */
  demo?: boolean
}) {
  const t = useT()

  // State holds an OFFSET, not the figure itself. Storing the absolute value
  // would mean syncing it back from the prop in an effect every time the board
  // refreshes — a cascading render on a screen that runs for weeks, and a race
  // where a real update could be overwritten by a stale copy. With an offset,
  // a genuine refresh simply flows through.
  const [delta, setDelta] = React.useState(0)
  const value = Math.max(0, revenue + delta)

  /**
   * Manual driver, for looking at the animation without waiting for an import.
   *
   *   __sasisWall.bump()      → add a plausible sale
   *   __sasisWall.bump(5000)  → add a specific amount
   *   __sasisWall.set(250000) → jump to a value
   *   __sasisWall.reset()     → back to the real figure
   *   __sasisWall.play()      → keep adding until stop()
   *   __sasisWall.stop()
   */
  React.useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null
    const step = () => 40 + Math.floor(Math.random() * 260)
    const api = {
      bump: (amount?: number) => setDelta((d) => d + (amount ?? step())),
      set: (next: number) => setDelta(next - revenue),
      reset: () => setDelta(0),
      play: (everyMs = 1200) => {
        if (timer) clearInterval(timer)
        timer = setInterval(() => setDelta((d) => d + step()), everyMs)
      },
      stop: () => {
        if (timer) clearInterval(timer)
        timer = null
      },
    }
    ;(window as unknown as Record<string, unknown>).__sasisWall = api
    return () => {
      if (timer) clearInterval(timer)
      delete (window as unknown as Record<string, unknown>).__sasisWall
    }
  }, [revenue])

  // `?demo=1` drives it automatically, for showing the effect to someone.
  React.useEffect(() => {
    if (!demo) return
    const timer = setInterval(
      () => setDelta((d) => d + 40 + Math.floor(Math.random() * 260)),
      1500
    )
    return () => clearInterval(timer)
  }, [demo])

  const simulated = delta !== 0
  const pct = target && target > 0 ? Math.round((value / target) * 100) : null
  const met = pct !== null && pct >= 100

  return (
    <section className="flex flex-1 flex-col justify-center gap-10 px-8 py-8 lg:flex-row lg:items-center lg:gap-16 lg:px-12">
      <div className="flex flex-col gap-3">
        {/* Unmissable, and deliberately not translated: a board showing
            invented revenue must be obvious to anyone who walks past it, in
            any language. Without this, `?demo=1` left on an office TV would be
            indistinguishable from a real trading day. */}
        {simulated ? (
          <div
            data-simulated="true"
            className="inline-flex items-center gap-2 self-start rounded-full border border-red-500/50 bg-red-500/15 px-4 py-1.5 text-sm font-semibold tracking-wider text-red-300 uppercase"
          >
            <span className="size-2 rounded-full bg-red-400" />
            Demo — simulated figures
          </div>
        ) : null}

        <div className="flex items-baseline gap-4">
          <span
            // Stable hooks: `data-value` carries the plain number, because the
            // rendered figure is now one span per digit and cannot be read back
            // with a regex.
            data-metric="network-revenue"
            data-value={value}
            className="wall-figure text-[6rem] font-semibold sm:text-[8rem] lg:text-[11rem] xl:text-[13rem]"
          >
            <RollingNumber text={money(value)} />
          </span>
          <span className="text-4xl font-light text-muted-foreground lg:text-6xl">
            ₼
          </span>
        </div>

        <div className="mt-2 flex items-center gap-10">{counters}</div>
      </div>

      {pct !== null ? (
        <div className="flex flex-col gap-4 lg:ml-auto lg:min-w-[22rem] lg:border-l lg:wall-rule lg:pl-16">
          <TargetBlock
            pct={pct}
            met={met}
            target={target!}
            label={t.wall.target}
          />
        </div>
      ) : (
        <span className="text-xl text-muted-foreground lg:ml-auto">
          {t.wall.noTarget}
        </span>
      )}
    </section>
  )
}

/** The target column, driven by the same animated value. */
function TargetBlock({
  pct,
  met,
  target,
  label,
}: {
  pct: number
  met: boolean
  target: number
  label: string
}) {
  return (
    <>
      <div className="flex items-center gap-3">
        <IconTargetArrow
          className="size-8 shrink-0 text-muted-foreground lg:size-9"
          title={label}
        />
        <span className="sr-only">{label}</span>
        <span className="font-mono text-2xl text-muted-foreground tabular-nums lg:text-3xl">
          {money(target)} ₼
        </span>
      </div>
      <span
        className={cn(
          "wall-figure text-7xl font-semibold lg:text-[9rem]",
          met ? "text-emerald-400" : "text-foreground"
        )}
      >
        <RollingNumber text={String(pct)} />
        <span className="ml-1 text-3xl font-light text-muted-foreground lg:text-5xl">
          %
        </span>
      </span>
      <div
        className="w-full overflow-hidden rounded-full bg-foreground/[0.08] h-2"
        role="presentation"
      >
        <div
          className={cn(
            "h-full rounded-full motion-safe:transition-[width] motion-safe:duration-700",
            met ? "bg-emerald-500" : "bg-primary"
          )}
          style={{ width: `${Math.min(100, Math.max(1.5, pct))}%` }}
        />
      </div>
    </>
  )
}
