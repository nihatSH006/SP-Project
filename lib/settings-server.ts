import "server-only"

import { cache } from "react"

import { adminDb } from "@/lib/firebase/admin"
import { COLLECTIONS } from "@/lib/firebase/schema"
import { DEFAULT_SETTINGS, withDefaults, type Settings } from "@/lib/settings"

/** Stored defaults (currently just the default language), with fallbacks. */
export const getSettings = cache(async (): Promise<Settings> => {
  try {
    const doc = await adminDb()
      .collection(COLLECTIONS.settings)
      .doc("global")
      .get()
    return withDefaults(doc.data() as Partial<Settings> | undefined)
  } catch {
    return DEFAULT_SETTINGS
  }
})
