import "server-only"

import { adminDb } from "@/lib/firebase/admin"
import { COLLECTIONS } from "@/lib/firebase/schema"

/**
 * The live-feed master switch and its manual trigger.
 *
 * State is one document — /meta/feed { enabled } — read by BOTH function
 * entry points (the 5-minute schedule and the feedNow HTTP kick) before they
 * do anything. OFF therefore stops the feed everywhere, not just the
 * dashboard's 10-second loop; missing document counts as OFF.
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
