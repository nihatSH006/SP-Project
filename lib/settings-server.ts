import "server-only"

import { cache } from "react"

import { adminDb } from "@/lib/firebase/admin"
import { COLLECTIONS } from "@/lib/firebase/schema"
import {
  DEFAULT_SETTINGS,
  sanitiseSettings,
  withDefaults,
  type Settings,
} from "@/lib/settings"

const SETTINGS_DOC = "global"
const TTL_MS = 30 * 1000 // short: an admin edit should show up promptly

/** Pinned to globalThis — module state is duplicated per route bundle. */
const g = globalThis as typeof globalThis & {
  __sasisSettings?: { at: number; settings: Settings } | null
}

/**
 * Read the admin's business rules. Falls back to defaults if the document is
 * missing or unreachable, so a settings outage degrades scoring rather than
 * taking the dashboard down.
 */
export const getSettings = cache(async (): Promise<Settings> => {
  const cached = g.__sasisSettings
  if (cached && Date.now() - cached.at < TTL_MS) return cached.settings

  try {
    const doc = await adminDb()
      .collection(COLLECTIONS.settings)
      .doc(SETTINGS_DOC)
      .get()
    const settings = withDefaults(doc.data() as Partial<Settings> | undefined)
    g.__sasisSettings = { at: Date.now(), settings }
    return settings
  } catch (error) {
    console.error("[settings] read failed, using defaults:", error)
    return cached?.settings ?? DEFAULT_SETTINGS
  }
})

/** Persist new settings. Caller must already have verified the admin role. */
export async function saveSettings(
  input: Settings,
  actor: { uid: string; email: string | null }
): Promise<{ settings: Settings; warnings: string[] }> {
  const { settings, warnings } = sanitiseSettings(input)

  await adminDb()
    .collection(COLLECTIONS.settings)
    .doc(SETTINGS_DOC)
    .set(
      {
        ...settings,
        updatedAt: new Date(),
        updatedBy: actor.email ?? actor.uid,
      },
      { merge: true }
    )

  // Audit trail: who changed the rules, and to what. Settings drive pay-adjacent
  // grades and fraud flags, so the change history matters.
  await adminDb()
    .collection(COLLECTIONS.settings)
    .doc(SETTINGS_DOC)
    .collection("history")
    .add({
      at: new Date(),
      byUid: actor.uid,
      byEmail: actor.email,
      settings,
    })

  g.__sasisSettings = { at: Date.now(), settings }
  return { settings, warnings }
}

/** Drop the cache — used right after a write so the next read is fresh. */
export function invalidateSettings() {
  g.__sasisSettings = null
}
