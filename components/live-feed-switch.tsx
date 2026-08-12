"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { tickLiveFeed, toggleLiveFeed } from "@/app/(app)/alerts/actions"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

/**
 * The live-feed master switch.
 *
 * ON: the deployed feed function is allowed to run, and while this page is
 * open it is kicked every 10 seconds; whenever a kick reports new rows the
 * page data refreshes, so alerts and totals move in front of you.
 *
 * OFF: the /meta/feed flag is cleared and the function refuses to run AT ALL
 * — the 10-second loop stops and the 5-minute Cloud Scheduler runs are
 * skipped too.
 */

const TICK_MS = 10_000

export function LiveFeedSwitch({
  initialEnabled,
  label,
}: {
  initialEnabled: boolean
  label: string
}) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(initialEnabled)
  const [ticking, setTicking] = useState(false)
  // Sales delivered since the switch went on — proof of life even between
  // page-visible changes (most 10s ticks legitimately write nothing).
  const [sessionSales, setSessionSales] = useState(0)
  const busy = useRef(false)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false

    const tick = async () => {
      if (busy.current) return // a slow tick outlives the interval: skip, never stack
      busy.current = true
      setTicking(true)
      try {
        const summary = await tickLiveFeed()
        if (cancelled || !summary) return
        if (summary.disabled) {
          setEnabled(false) // switched off elsewhere — mirror it
          return
        }
        const wrote =
          (summary.salesWritten ?? 0) +
          (summary.tapsWritten ?? 0) +
          (summary.reportsWritten ?? 0)
        if (summary.salesWritten) {
          setSessionSales((n) => n + (summary.salesWritten ?? 0))
        }
        if (wrote > 0) router.refresh()
      } catch {
        // A missed tick is not an event; the next one retries.
      } finally {
        busy.current = false
        if (!cancelled) setTicking(false)
      }
    }

    void tick() // fire immediately on switch-on, then every 10s
    const id = setInterval(() => void tick(), TICK_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [enabled, router])

  return (
    <label className="flex h-8 cursor-pointer items-center gap-2 rounded-md border bg-background px-3 text-sm shadow-xs">
      <span
        className={cn(
          "size-2 shrink-0 rounded-full transition-colors",
          enabled
            ? "bg-emerald-500 " + (ticking ? "animate-pulse" : "")
            : "bg-muted-foreground/40"
        )}
      />
      <span className="whitespace-nowrap">
        {label}
        <span className="ml-1 text-xs text-muted-foreground">
          {enabled && sessionSales > 0
            ? `· +${sessionSales}`
            : "· 10s"}
        </span>
      </span>
      <Switch
        size="sm"
        checked={enabled}
        onCheckedChange={(checked) => {
          setEnabled(checked)
          void toggleLiveFeed(checked)
        }}
      />
    </label>
  )
}
