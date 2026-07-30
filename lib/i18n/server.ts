import "server-only"

import { cookies } from "next/headers"
import { cache } from "react"

import {
  getDictionary,
  isLocale,
  LOCALE_COOKIE,
  type Dictionary,
  type Locale,
} from "@/lib/i18n"
import { getSettings } from "@/lib/settings-server"

/**
 * Resolve the language for this request.
 *
 * Order: the user's own cookie, then the admin's default from settings.
 * Kept off the URL deliberately — the app is behind auth and every page is
 * already dynamic, so a locale path segment would add routing complexity and
 * break existing links for no benefit.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value
  if (isLocale(chosen)) return chosen

  try {
    return (await getSettings()).defaultLanguage
  } catch {
    return "en"
  }
})

/** The dictionary for this request. Server components call this directly. */
export const getT = cache(async (): Promise<Dictionary> => {
  return getDictionary(await getLocale())
})
