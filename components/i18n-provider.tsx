"use client"

import * as React from "react"

import { getDictionary, type Dictionary, type Locale } from "@/lib/i18n"

type I18nValue = { locale: Locale; t: Dictionary }

const I18nContext = React.createContext<I18nValue | null>(null)

/**
 * Makes the dictionary available to client components.
 *
 * Only the locale string crosses the server/client boundary — the dictionary
 * itself is looked up on the client from the bundled modules. Serialising the
 * whole dictionary would ship it twice (once in the RSC payload, once in the
 * bundle) and would choke on the interpolation functions, which cannot be
 * serialised at all.
 */
export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale
  children: React.ReactNode
}) {
  const value = React.useMemo<I18nValue>(
    () => ({ locale, t: getDictionary(locale) }),
    [locale]
  )
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = React.useContext(I18nContext)
  if (!ctx) throw new Error("useI18n must be used within <I18nProvider>")
  return ctx
}

/** Shorthand for the common case. */
export function useT(): Dictionary {
  return useI18n().t
}
