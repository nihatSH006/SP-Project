"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { useT } from "@/components/i18n-provider"

/** Past this the board would actively mislead, so it says so. */
const STALE_AFTER_HOURS = 30

/**
 * The current time, or null before hydration.
 *
 * `useSyncExternalStore` rather than state-set-from-an-effect: the clock is an
 * external, mutable value, and setting state synchronously inside an effect
 * causes a cascading re-render on every tick. The null server snapshot is what
 * keeps hydration honest — a time rendered on the server is already wrong by
 * the time it reaches the browser.
 */
function useNow(intervalMs: number): number | null {
  // A ref, not a closure variable: the snapshot is mutable state that outlives
  // a render, which is exactly what refs are for and what the compiler allows.
  const snapshot = React.useRef<number | null>(null)

  const subscribe = React.useCallback(
    (onChange: () => void) => {
      snapshot.current = Date.now()
      onChange()
      const id = setInterval(() => {
        snapshot.current = Date.now()
        onChange()
      }, intervalMs)
      return () => clearInterval(id)
    },
    [intervalMs]
  )

  return React.useSyncExternalStore(
    subscribe,
    // Cached between ticks: a fresh Date.now() on every call would make React
    // see an endlessly changing snapshot.
    () => snapshot.current,
    () => null
  )
}

/**
 * The honesty strip: wall clock, how old the figures are, and a plain
 * statement that this is not a live feed.
 *
 * A board on a wall reads as "right now" to everyone who walks past it. These
 * figures come from one import per operational day and can be many hours old,
 * so the age is stated in words rather than left for someone to work out from
 * a timestamp — and once it crosses a day it is called out in amber.
 *
 * Rendered on the client because a server-rendered clock is wrong the moment
 * it is sent, and because the age has to keep counting up on a screen that
 * nobody touches for weeks.
 */
export function WallClock({
  date,
  asOf,
  refreshSeconds = 120,
}: {
  date: string | null
  asOf: number | null
  refreshSeconds?: number
}) {
  const t = useT()
  const router = useRouter()
  const now = useNow(30_000)

  // Pull fresh figures without a full page load, so the screen can be left
  // running indefinitely.
  React.useEffect(() => {
    const timer = setInterval(() => router.refresh(), refreshSeconds * 1000)
    return () => clearInterval(timer)
  }, [router, refreshSeconds])

  const clock =
    now === null
      ? "--:--"
      : new Date(now).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        })

  // Only surfaced once the data is genuinely old. On a normal day the header
  // stays quiet; the operational day beside the clock already says which day
  // the figures belong to. But a board showing a full day's takings from two
  // days ago with no hint of it is worse than a blank screen, so past the
  // threshold it is called out rather than left to be inferred.
  let staleLabel: string | null = null
  if (asOf !== null && now !== null) {
    const hours = (now - asOf) / 3_600_000
    if (hours > STALE_AFTER_HOURS) {
      staleLabel =
        hours < 48
          ? t.wall.ageHours(Math.round(hours))
          : t.wall.ageDays(Math.round(hours / 24))
    }
  }

  return (
    <div className="flex items-center gap-5">
      {staleLabel ? (
        <span
          data-stale="true"
          className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-300"
        >
          {t.wall.stale} · {staleLabel}
        </span>
      ) : null}
      {/* Same size and weight as the clock: they are one reading, not a
          label and a value. */}
      <span className="font-mono text-lg tabular-nums lg:text-xl">
        {date ?? "—"}
      </span>
      <span className="font-mono text-lg tabular-nums lg:text-xl">{clock}</span>
    </div>
  )
}
