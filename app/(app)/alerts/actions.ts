"use server"

import { getSessionUser } from "@/lib/auth"
import { invalidateDataCache } from "@/lib/data"
import {
  getFeedLog,
  setFeedEnabled,
  triggerFeedTick,
  type FeedLog,
} from "@/lib/live-feed"

/**
 * Flip the live-feed master switch. Signed-in users only.
 *
 * The feed itself runs IN THE CLOUD (a scheduled function ticking every
 * second while the flag is on) — flipping ON here also fires one immediate
 * kick so the feed starts now instead of at the next scheduled minute.
 */
export async function toggleLiveFeed(enabled: boolean): Promise<boolean> {
  const user = await getSessionUser()
  if (!user) return false
  await setFeedEnabled(enabled)
  if (enabled) {
    try {
      await triggerFeedTick()
      invalidateDataCache()
    } catch {
      // The scheduler picks it up within a minute regardless.
    }
  }
  return enabled
}

/**
 * The dashboard's poll: the switch state + the event journal the cloud loop
 * writes. Pass the newest seq already shown; when the journal has moved past
 * it the server caches are dropped, so the caller's refresh sees fresh data.
 */
export async function pollLiveFeed(lastSeq: number): Promise<FeedLog | null> {
  const user = await getSessionUser()
  if (!user) return null
  const log = await getFeedLog()
  if ((log.events[0]?.seq ?? 0) > lastSeq) invalidateDataCache()
  return log
}
