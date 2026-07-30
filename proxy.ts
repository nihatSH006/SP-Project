import { NextResponse, type NextRequest } from "next/server"

import { SESSION_COOKIE } from "@/lib/session-cookie"

/**
 * Optimistic auth gate.
 *
 * This only checks that a session cookie is *present* — it cannot verify one,
 * because the Admin SDK does not run in the Edge runtime, and the Next docs
 * warn against treating Proxy as a full authorisation layer. Its job is to keep
 * signed-out traffic off the app routes cheaply.
 *
 * The authoritative check is `getSessionUser()` in `app/(app)/layout.tsx`, which
 * verifies the cookie signature, expiry, revocation and role claim on every
 * request. A forged cookie gets past this file and is rejected there.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const hasSession = request.cookies.has(SESSION_COOKIE)

  if (!hasSession) {
    const login = new URL("/login", request.url)
    // Preserve where they were heading so login can bounce them back.
    if (pathname !== "/") login.searchParams.set("next", `${pathname}${search}`)
    return NextResponse.redirect(login)
  }

  return NextResponse.next()
}

export const config = {
  /**
   * Everything except the login page, the session endpoint, the deployment
   * health check, Next internals and static assets. Written as a negative lookahead so a new page is protected by
   * default — forgetting to add a route here cannot accidentally expose it.
   */
  matcher: [
    "/((?!login|api/auth|api/health|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
