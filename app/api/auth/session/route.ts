import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { SESSION_COOKIE, SESSION_MAX_AGE_MS } from "@/lib/session-cookie"
import { adminAuth } from "@/lib/firebase/admin"

/**
 * Trade a freshly-minted Firebase ID token for an httpOnly session cookie.
 *
 * The ID token never touches storage the browser can read, so XSS cannot lift a
 * reusable credential; the cookie is httpOnly + sameSite=strict, so script and
 * cross-site requests cannot read or replay it either.
 */
export async function POST(request: Request) {
  let idToken: unknown
  try {
    ;({ idToken } = await request.json())
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 })
  }

  if (typeof idToken !== "string" || idToken.length === 0) {
    return NextResponse.json({ error: "Missing ID token." }, { status: 400 })
  }

  const auth = adminAuth()

  try {
    // Reject anything older than 5 minutes: the token must come from a sign-in
    // that just happened, not a replayed one.
    const decoded = await auth.verifyIdToken(idToken, true)
    if (Date.now() / 1000 - decoded.auth_time > 5 * 60) {
      return NextResponse.json(
        { error: "Please sign in again." },
        { status: 401 }
      )
    }

    // Authentication is not authorisation: without a role claim the account is
    // provisioned but not yet entitled to anything, so refuse the session.
    if (!decoded.role) {
      return NextResponse.json(
        {
          error:
            "This account has no role assigned. Ask an administrator to grant access.",
        },
        { status: 403 }
      )
    }

    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE_MS,
    })

    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_MAX_AGE_MS / 1000,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: "Could not verify those credentials." },
      { status: 401 }
    )
  }
}

/** Sign out: revoke server-side, then clear the cookie. */
export async function DELETE() {
  const cookieStore = await cookies()
  const session = cookieStore.get(SESSION_COOKIE)?.value

  if (session) {
    try {
      const decoded = await adminAuth().verifySessionCookie(session)
      // Revoking kills every other session for this user too, which is what you
      // want when signing out of a shared station terminal.
      await adminAuth().revokeRefreshTokens(decoded.sub)
    } catch {
      // Already invalid — clearing the cookie is still the right outcome.
    }
  }

  cookieStore.delete(SESSION_COOKIE)
  return NextResponse.json({ ok: true })
}
