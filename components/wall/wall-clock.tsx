"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { useT } from "@/components/i18n-provider"
import { cn } from "@/lib/utils"

/** Anything older than this is called out rather than shown quietly. */
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
  asOf,
  refreshSeconds = 120,
}: {
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

  let age: string = t.wall.ageUnknown
  let stale = false
  if (asOf !== null && now !== null) {
    const minutes = Math.max(0, Math.round((now - asOf) / 60_000))
    stale = minutes > STALE_AFTER_HOURS * 60
    age =
      minutes < 60
        ? t.wall.ageMinutes(minutes)
        : minutes < 60 * 24
          ? t.wall.ageHours(Math.round(minutes / 60))
          : t.wall.ageDays(Math.round(minutes / (60 * 24)))
  }

  return (
    <div className="flex items-center gap-4 text-right">
      <div className="flex flex-col items-end">
        <span
          className={cn(
            "text-sm font-medium",
            stale ? "text-amber-400" : "text-muted-foreground"
          )}
        >
          {stale ? `${t.wall.stale} · ${age}` : age}
        </span>
        <span className="text-xs text-muted-foreground">{t.wall.notLive}</span>
      </div>
      <span className="font-mono text-3xl tabular-nums">{clock}</span>
    </div>
  )
}
