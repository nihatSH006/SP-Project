import { redirect } from "next/navigation"

import { getSessionUser } from "@/lib/auth"

/**
 * The wall screen gets its own layout so it renders without the sidebar,
 * header, filter bar or command palette. None of that is usable from six
 * metres away, and a screen nobody stands at should not offer navigation.
 *
 * It is still behind the same authoritative session check as every other
 * signed-in route: the figures name stations and staffing levels, and a screen
 * in an office lobby is not a reason to publish them.
 */
export default async function WallLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSessionUser()
  if (!user) redirect("/login")

  return <div className="min-h-svh bg-background">{children}</div>
}
