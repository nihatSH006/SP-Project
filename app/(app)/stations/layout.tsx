import { notFound } from "next/navigation"

import { canCompareStations } from "@/lib/auth"

/**
 * Station-comparison gate.
 *
 * This page ranks sites against each other. A station-pinned account can only
 * ever load its own site's reports, so the page would render a league table
 * with a single row — a comparison that cannot compare. It is removed rather
 * than left to degrade.
 *
 * The check lives in a LAYOUT, not the page, because a segment's `loading.tsx`
 * wraps its pages but not its layout: once a response starts streaming the
 * status code has already been sent, so a `notFound()` thrown inside the
 * boundary renders the not-found body under an HTTP 200. Gating here keeps the
 * status honest while the page below still streams behind its skeleton.
 */
export default async function StationsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (!(await canCompareStations())) notFound()

  return <>{children}</>
}
