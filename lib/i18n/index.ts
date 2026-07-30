import { az } from "@/lib/i18n/az"
import { en, type Dictionary } from "@/lib/i18n/en"
import { ru } from "@/lib/i18n/ru"

export type { Dictionary }

export const LOCALES = ["az", "ru", "en"] as const
export type Locale = (typeof LOCALES)[number]

/** Cookie holding an individual's choice; absent means "use the admin default". */
export const LOCALE_COOKIE = "sasis_lang"

const DICTIONARIES: Record<Locale, Dictionary> = { az, ru, en }

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? en
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value)
}

/** BCP-47 tags for `toLocaleDateString` / number formatting. */
export const INTL_LOCALE: Record<Locale, string> = {
  az: "az-AZ",
  ru: "ru-RU",
  en: "en-GB",
}

/**
 * Deterministic short-date formatting.
 *
 * `toLocaleDateString` is NOT safe here: Node and the browser ship different
 * ICU data, so the server rendered "30 iyl, C.a." while Chrome produced
 * something else — a hydration mismatch that blew away the client tree.
 * Explicit tables render identically everywhere, and give better Azerbaijani
 * abbreviations than Node's ICU does.
 */
const MONTHS: Record<Locale, string[]> = {
  az: ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avq", "sen", "okt", "noy", "dek"],
  ru: ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
}

/** Index 0 = Sunday, matching `Date.getDay()`. */
const WEEKDAYS: Record<Locale, string[]> = {
  az: ["B.", "B.e.", "Ç.a.", "Ç.", "C.a.", "C.", "Ş."],
  ru: ["вс", "пн", "вт", "ср", "чт", "пт", "сб"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
}

/** "2026-07-30" -> "Thu 30 Jul" / "C.a. 30 iyl" / "чт 30 июл". */
export function formatDayLabel(iso: string, locale: Locale): string {
  const [y, m, d] = iso.split("-").map(Number)
  if (!y || !m || !d) return iso
  const date = new Date(y, m - 1, d)
  const weekday = WEEKDAYS[locale][date.getDay()]
  const month = MONTHS[locale][m - 1]
  return `${weekday} ${String(d).padStart(2, "0")} ${month}`
}
