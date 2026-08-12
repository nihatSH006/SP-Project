import "server-only"

import { adminDb } from "@/lib/firebase/admin"
import { COLLECTIONS } from "@/lib/firebase/schema"

/**
 * The live-feed master switch and its manual trigger.
 *
 * State is one document — /meta/feed { enabled } — read by BOTH function
 * entry points (the 5-minute schedule and the feedNow HTTP kick) before they
 * do anything. OFF therefore stops the feed everywhere, not just the
 * dashboard's tick loop; missing document counts as OFF.
 */

const FEED_URL =
  process.env.LIVE_FEED_URL ??
  "https://europe-west1-socar-petrolium.cloudfunctions.net/feedNow"

export type FeedTickSummary = {
  disabled?: boolean
  salesWritten?: number
  tapsWritten?: number
  reportsWritten?: number
  dates?: string[]
}

/** One journal entry from /meta/feedLog — a sale or a tap the feed wrote. */
export type FeedLogEvent = {
  /** Monotonic id — the client detects "anything new?" by the head seq. */
  seq: number
  /** Epoch ms of the EVENT itself (the sale, the tap), not the tick. */
  at: number
  kind: "sale" | "tap"
  adSoyad: string
  istasyon: string
  amount?: number
  grade?: string
  /** Raw check_type for taps — 0 in, 1 out (see lib/pos.ts). */
  type?: number
}

export type FeedLog = {
  enabled: boolean
  /** Epoch ms of the feed's last write, or null before the first one. */
  updatedAt: number | null
  /** Newest first, capped at 50 by the writer. */
  events: FeedLogEvent[]
}

/**
 * The dashboard's window into the cloud loop: the switch state plus the
 * rolling event journal — two tiny documents, cheap enough to poll.
 */
export async function getFeedLog(): Promise<FeedLog> {
  const db = adminDb()
  const [feed, log] = await db.getAll(
    db.collection(COLLECTIONS.meta).doc("feed"),
    db.collection(COLLECTIONS.meta).doc("feedLog")
  )
  const updatedAt = log.exists ? log.data()?.updatedAt : null
  return {
    enabled: feed.exists && feed.data()?.enabled === true,
    updatedAt:
      typeof updatedAt?.toMillis === "function" ? updatedAt.toMillis() : null,
    events: log.exists ? ((log.data()?.events ?? []) as FeedLogEvent[]) : [],
  }
}

export async function getFeedEnabled(): Promise<boolean> {
  try {
    const doc = await adminDb().collection(COLLECTIONS.meta).doc("feed").get()
    return doc.exists && doc.data()?.enabled === true
  } catch {
    return false
  }
}

export async function setFeedEnabled(enabled: boolean): Promise<void> {
  await adminDb()
    .collection(COLLECTIONS.meta)
    .doc("feed")
    .set({ enabled, updatedAt: new Date() }, { merge: true })
}

/** One tick, via the deployed function — the same code path the scheduler runs. */
export async function triggerFeedTick(): Promise<FeedTickSummary> {
  const response = await fetch(FEED_URL, { cache: "no-store" })
  if (!response.ok) throw new Error(`feed tick failed: ${response.status}`)
  return (await response.json()) as FeedTickSummary
}
