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

  // Pinned dark, whatever the viewer picked in the app. This is a board on a
  // wall, read from across a room: the palette is part of the design, and it
  // follows a preference set by whoever last signed in on a laptop — not by
  // the room the screen is in. `.dark` re-declares the tokens for this subtree,
  // so nothing here has to know it is the exception.
  return <div className="dark min-h-svh bg-background">{children}</div>
}
