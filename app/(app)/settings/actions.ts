"use server"

import { revalidatePath } from "next/cache"

import { getSessionUser } from "@/lib/auth"
import { DEFAULT_SETTINGS, type Settings } from "@/lib/settings"
import { saveSettings } from "@/lib/settings-server"

export type SaveResult =
  | { ok: true; warnings: string[] }
  | { ok: false; error: string }

/**
 * Persist the business rules.
 *
 * Server actions are public HTTP endpoints — the admin check has to happen
 * HERE, not only in the page that renders the form. Hiding the UI is not
 * authorisation.
 */
export async function updateSettings(input: Settings): Promise<SaveResult> {
  const user = await getSessionUser()
  if (!user) return { ok: false, error: "Not signed in." }
  if (user.role !== "admin") {
    return { ok: false, error: "Only administrators can change these settings." }
  }

  try {
    const { warnings } = await saveSettings(input, {
      uid: user.uid,
      email: user.email,
    })
    // Scores are derived from these values on every page.
    revalidatePath("/", "layout")
    return { ok: true, warnings }
  } catch (error) {
    console.error("[settings] save failed:", error)
    return { ok: false, error: "Could not save. Try again." }
  }
}

export async function resetSettings(): Promise<SaveResult> {
  return updateSettings(DEFAULT_SETTINGS)
}
