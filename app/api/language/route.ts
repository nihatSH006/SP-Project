import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { isLocale, LOCALE_COOKIE } from "@/lib/i18n"

/**
 * Set the caller's language preference.
 *
 * A plain cookie rather than a stored profile field: it needs to work before
 * any profile read, survives sign-out, and costs no Firestore write. Not
 * httpOnly — nothing sensitive, and no session decision depends on it.
 */
export async function POST(request: Request) {
  let locale: unknown
  try {
    ;({ locale } = await request.json())
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 })
  }

  if (!isLocale(locale)) {
    return NextResponse.json({ error: "Unsupported language." }, { status: 400 })
  }

  const store = await cookies()
  store.set(LOCALE_COOKIE, locale, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  })

  return NextResponse.json({ ok: true, locale })
}
