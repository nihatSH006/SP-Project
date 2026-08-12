"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { IconHistory } from "@tabler/icons-react"

import { pollLiveFeed, toggleLiveFeed } from "@/app/(app)/alerts/actions"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { CHECK_TYPE_IN } from "@/lib/pos"
import type { FeedLog, FeedLogEvent } from "@/lib/live-feed"
import { cn } from "@/lib/utils"

/**
 * The live-feed master switch — a REMOTE CONTROL, not the engine.
 *
 * The feed itself runs in the cloud: a scheduled function ticks every
 * second while /meta/feed { enabled } is on, and stops within a second of
 * it going off. This component only flips that flag (plus one immediate
 * kick on ON so the feed starts without waiting for the next minute) and
 * WATCHES: every few seconds it reads the journal the cloud loop writes,
 * fills the log popover from it, and refreshes the page data — throttled —
 * when something new actually landed. The browser never drives the feed,
 * so an open dashboard stays light.
 *
 * The clock icon opens the LOG: the events themselves — who sold what for
 * how much, who tapped in or out, newest first. Quiet stretches are normal;
 * the simulated network sells at a realistic pace.
 */

const POLL_MS = 5_000
const REFRESH_MIN_MS = 10_000

export type LiveFeedLabels = {
  label: string
  log: string
  empty: string
  error: string
  lastCheck: string
  tapIn: string
  tapOut: string
}

const hms = (at: number) => {
  const d = new Date(at)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export function LiveFeedSwitch({
  initialLog,
  labels,
}: {
  initialLog: FeedLog
  labels: LiveFeedLabels
}) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(initialLog.enabled)
  const [log, setLog] = useState<FeedLogEvent[]>(initialLog.events)
  const [lastCheck, setLastCheck] = useState<number | null>(
    initialLog.updatedAt
  )
  // Sales delivered since the switch went on — proof of life even between
  // page-visible changes.
  const [sessionSales, setSessionSales] = useState(0)
  const [polling, setPolling] = useState(false)
  const [pollFailed, setPollFailed] = useState(false)
  const busy = useRef(false)
  const lastSeq = useRef(initialLog.events[0]?.seq ?? 0)
  const lastRefreshAt = useRef(0)
  const togglePending = useRef(false)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false

    const poll = async () => {
      if (busy.current) return
      busy.current = true
      setPolling(true)
      try {
        const feed = await pollLiveFeed(lastSeq.current)
        if (cancelled || !feed) return
        setPollFailed(false)

        // Mirror an external OFF — but not while our own toggle is landing.
        if (!feed.enabled && !togglePending.current) {
          setEnabled(false)
          return
        }

        setLog(feed.events)
        setLastCheck(feed.updatedAt)

        const newest = feed.events[0]?.seq ?? 0
        if (newest > lastSeq.current) {
          const newSales = feed.events.filter(
            (event) => event.kind === "sale" && event.seq > lastSeq.current
          ).length
          if (newSales > 0) setSessionSales((n) => n + newSales)
          lastSeq.current = newest

          if (Date.now() - lastRefreshAt.current > REFRESH_MIN_MS) {
            lastRefreshAt.current = Date.now()
            router.refresh()
          }
        }
      } catch {
        if (!cancelled) setPollFailed(true)
      } finally {
        busy.current = false
        if (!cancelled) setPolling(false)
      }
    }

    void poll() // read the journal right away, then keep watching
    const id = setInterval(() => void poll(), POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [enabled, router])

  return (
    <span className="flex items-center gap-2">
      <label className="flex h-8 cursor-pointer items-center gap-2 rounded-md border bg-background px-3 text-sm shadow-xs">
        <span
          className={cn(
            "size-2 shrink-0 rounded-full transition-colors",
            enabled
              ? "bg-emerald-500 " + (polling ? "animate-pulse" : "")
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
            togglePending.current = true
            setEnabled(checked)
            void toggleLiveFeed(checked).finally(() => {
              togglePending.current = false
              if (checked) router.refresh()
            })
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
        <PopoverContent align="end" className="w-96 gap-0 p-0">
          <div className="flex items-baseline justify-between border-b px-4 py-2.5">
            <span className="text-sm font-medium">{labels.log}</span>
            {pollFailed ? (
              <span className="text-xs text-red-600 dark:text-red-400">
                {labels.error}
              </span>
            ) : lastCheck !== null ? (
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {labels.lastCheck} {hms(lastCheck)}
              </span>
            ) : null}
          </div>

          {log.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              {labels.empty}
            </p>
          ) : (
            <ul className="flex max-h-80 flex-col overflow-y-auto py-1">
              {log.map((event) => (
                <li
                  key={event.seq}
                  className="flex items-center gap-2.5 px-4 py-1.5 text-sm"
                >
                  <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                    {hms(event.at)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{event.adSoyad}</span>
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {event.istasyon}
                    </span>
                  </span>
                  {event.kind === "sale" ? (
                    <span className="shrink-0 text-right">
                      <span className="font-mono text-sm tabular-nums">
                        {event.amount?.toFixed(2)} ₼
                      </span>
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        {event.grade}
                      </span>
                    </span>
                  ) : (
                    <Badge
                      variant="outline"
                      className={cn(
                        "shrink-0",
                        event.type === CHECK_TYPE_IN
                          ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                          : "border-sky-500/40 text-sky-700 dark:text-sky-300"
                      )}
                    >
                      {event.type === CHECK_TYPE_IN
                        ? labels.tapIn
                        : labels.tapOut}
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </PopoverContent>
      </Popover>
    </span>
  )
}
