"use server"

import { getSessionUser } from "@/lib/auth"
import { invalidateDataCache } from "@/lib/data"
import {
  getFeedEnabled,
  setFeedEnabled,
  triggerFeedTick,
  type FeedTickSummary,
} from "@/lib/live-feed"

/** Flip the live-feed master switch. Signed-in users only. */
export async function toggleLiveFeed(enabled: boolean): Promise<boolean> {
  const user = await getSessionUser()
  if (!user) return false
  await setFeedEnabled(enabled)
  return enabled
}

/**
 * One manual tick — what the dashboard's 10-second loop calls while the
 * switch is ON. Runs the exact same deployed function as the scheduler; when
 * the switch is off the function refuses, so this cannot resurrect a
 * disabled feed.
 */
export async function tickLiveFeed(): Promise<FeedTickSummary | null> {
  const user = await getSessionUser()
  if (!user) return null
  if (!(await getFeedEnabled())) return { disabled: true }

  const summary = await triggerFeedTick()
  const wrote =
    (summary.salesWritten ?? 0) +
    (summary.tapsWritten ?? 0) +
    (summary.reportsWritten ?? 0)
  if (wrote > 0) invalidateDataCache()
  return summary
}
