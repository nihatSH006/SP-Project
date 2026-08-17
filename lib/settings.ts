/**
 * Minimal shared configuration for the core app.
 *
 * The tariff table stays because the simulator derives litres from prepaid
 * amounts at the state price (fixed by the Tariff Council) — and because the
 * real db1 join will carry exactly these grades.
 */

export type Language = "az" | "ru" | "en"

export const FUEL_GRADES = ["AI-92", "AI-95", "AI-98", "Diesel"] as const
export type FuelGrade = (typeof FUEL_GRADES)[number]

export const DEFAULT_TARIFFS: Record<FuelGrade, number> = {
  "AI-92": 1.1,
  "AI-95": 1.4,
  "AI-98": 1.65,
  Diesel: 1.0,
}

export type Settings = {
  defaultLanguage: Language
}

export const DEFAULT_SETTINGS: Settings = {
  defaultLanguage: "az",
}

export function withDefaults(stored: Partial<Settings> | undefined): Settings {
  if (!stored) return DEFAULT_SETTINGS
  return {
    defaultLanguage: (["az", "ru", "en"] as const).includes(
      stored.defaultLanguage as Language
    )
      ? (stored.defaultLanguage as Language)
      : DEFAULT_SETTINGS.defaultLanguage,
  }
}
