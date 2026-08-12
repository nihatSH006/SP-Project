"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { IconHistory } from "@tabler/icons-react"

import { tickLiveFeed, toggleLiveFeed } from "@/app/(app)/alerts/actions"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

/**
 * The live-feed master switch, with its own tick log.
 *
 * ON: the deployed feed function is allowed to run, and while this page is
 * open it is kicked every second; whenever a kick reports new rows the
 * page data refreshes, so alerts and totals move in front of you. A tick's
 * round trip takes longer than a second, and the in-flight guard skips
 * overlapping fires — so the real cadence is "as fast as the function
 * answers", back to back.
 *
 * OFF: the /meta/feed flag is cleared and the function refuses to run AT ALL
 * — the tick loop stops and the 5-minute Cloud Scheduler runs are skipped
 * too.
 *
 * Every tick is journaled into the log popover (the clock icon): what time
 * it ran and what it wrote. Quiet ticks are normal — the simulated network
 * sells at a realistic pace, so many one-second windows are empty.
 */

const TICK_MS = 1_000
const LOG_LIMIT = 300

type TickEntry = {
  at: number
  sales: number
  taps: number
  reports: number
  error?: boolean
}

export type LiveFeedLabels = {
  label: string
  log: string
  empty: string
  quiet: string
  sales: string
  taps: string
  error: string
}

const hms = (at: number) => {
  const d = new Date(at)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export function LiveFeedSwitch({
  initialEnabled,
  labels,
}: {
  initialEnabled: boolean
  labels: LiveFeedLabels
}) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(initialEnabled)
  const [ticking, setTicking] = useState(false)
  // Sales delivered since the switch went on — proof of life even between
  // page-visible changes (most 10s ticks legitimately write nothing).
  const [sessionSales, setSessionSales] = useState(0)
  const [log, setLog] = useState<TickEntry[]>([])
  const busy = useRef(false)

  const journal = (entry: TickEntry) =>
    setLog((entries) => [entry, ...entries].slice(0, LOG_LIMIT))

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
        const entry: TickEntry = {
          at: Date.now(),
          sales: summary.salesWritten ?? 0,
          taps: summary.tapsWritten ?? 0,
          reports: summary.reportsWritten ?? 0,
        }
        journal(entry)
        if (entry.sales > 0) setSessionSales((n) => n + entry.sales)
        if (entry.sales + entry.taps + entry.reports > 0) router.refresh()
      } catch {
        if (!cancelled) {
          journal({ at: Date.now(), sales: 0, taps: 0, reports: 0, error: true })
        }
      } finally {
        busy.current = false
        if (!cancelled) setTicking(false)
      }
    }

    void tick() // fire immediately on switch-on, then keep firing
    const id = setInterval(() => void tick(), TICK_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [enabled, router])

  const describe = (entry: TickEntry) => {
    if (entry.error) return labels.error
    const parts: string[] = []
    if (entry.sales > 0) parts.push(`+${entry.sales} ${labels.sales}`)
    if (entry.taps > 0) parts.push(`+${entry.taps} ${labels.taps}`)
    return parts.length > 0 ? parts.join(" · ") : labels.quiet
  }

  return (
    <span className="flex items-center gap-2">
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
          {labels.label}
          <span className="ml-1 text-xs text-muted-foreground">
            {enabled && sessionSales > 0 ? `· +${sessionSales}` : "· 1s"}
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

      <Popover>
        <PopoverTrigger
          className="flex h-8 w-8 items-center justify-center rounded-md border bg-background text-muted-foreground shadow-xs transition-colors hover:text-foreground"
          aria-label={labels.log}
        >
          <IconHistory className="size-4" />
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 gap-2 p-3">
          <p className="px-1 text-xs font-medium text-muted-foreground">
            {labels.log}
          </p>
          {log.length === 0 ? (
            <p className="px-1 pb-1 text-sm text-muted-foreground">
              {labels.empty}
            </p>
          ) : (
            <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
              {log.map((entry) => {
                const wrote = entry.sales + entry.taps > 0
                return (
                  <li
                    key={entry.at}
                    className="flex items-baseline gap-2 rounded-sm px-1 py-0.5 text-xs"
                  >
                    <span className="font-mono tabular-nums text-muted-foreground">
                      {hms(entry.at)}
                    </span>
                    <span
                      className={cn(
                        entry.error
                          ? "text-red-600 dark:text-red-400"
                          : wrote
                            ? "font-medium text-emerald-700 dark:text-emerald-300"
                            : "text-muted-foreground"
                      )}
                    >
                      {describe(entry)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </PopoverContent>
      </Popover>
    </span>
  )
}
