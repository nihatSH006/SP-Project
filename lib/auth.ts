import "server-only"

import { cookies } from "next/headers"
import { cache } from "react"

import { adminAuth } from "@/lib/firebase/admin"

export { SESSION_COOKIE, SESSION_MAX_AGE_MS } from "@/lib/session-cookie"

import { SESSION_COOKIE as COOKIE_NAME } from "@/lib/session-cookie"

export type Role = "admin" | "supervisor" | "manager" | "staff"

export type SessionUser = {
  uid: string
  email: string | null
  name: string | null
  role: Role
  /** Set for `staff` and `manager`; regional roles see every station. */
  station: string | null
}

const ROLES: Role[] = ["admin", "supervisor", "manager", "staff"]

/**
 * Resolve the caller from the session cookie.
 *
 * `checkRevoked` costs a lookup per request but means a disabled account or a
 * forced sign-out takes effect immediately instead of lingering for the life of
 * the cookie — worth it for a tool that exposes staff-level fraud data.
 *
 * Wrapped in `cache` so repeated calls within one render share a single check.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies()
  const session = cookieStore.get(COOKIE_NAME)?.value
  if (!session) return null

  try {
    const decoded = await adminAuth().verifySessionCookie(session, true)
    const role = ROLES.includes(decoded.role as Role)
      ? (decoded.role as Role)
      : null

    // A signed-in user with no role claim is not authorised for anything.
    if (!role) return null

    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      name: (decoded.name as string | undefined) ?? null,
      role,
      station: (decoded.station as string | undefined) ?? null,
    }
  } catch {
    // Expired, revoked, or forged — all indistinguishable to the caller.
    return null
  }
})

/** Station filter implied by the caller's role, or null for regional roles. */
export function stationScopeFor(user: SessionUser): string | null {
  return user.role === "staff" || user.role === "manager" ? user.station : null
}

/**
 * Whether the caller can see more than one station.
 *
 * A station manager's every query is already pinned to their own site, so
 * anything that compares stations — a filter dropdown, a "revenue by station"
 * chart, a station column, the Stations page itself — is a control with one
 * possible answer or a ranking with one entry. This is the single predicate
 * the UI branches on, so those affordances appear and disappear together
 * rather than each page deciding for itself.
 */
export async function canCompareStations(): Promise<boolean> {
  const user = await getSessionUser()
  return user ? stationScopeFor(user) === null : false
}
