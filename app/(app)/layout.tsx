import { redirect } from "next/navigation"

import { getSessionUser } from "@/lib/auth"

/**
 * Authoritative auth boundary for every signed-in route.
 *
 * `proxy.ts` only checks that a cookie exists; this is where the cookie is
 * actually verified — signature, expiry, revocation and role claim — on every
 * request. Because it wraps the whole route group, a new page added under
 * `app/(app)/` is protected without anyone remembering to opt in.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSessionUser()

  if (!user) {
    // The cookie was missing, forged, expired, revoked, or carried no role.
    redirect("/login")
  }

  return <>{children}</>
}
