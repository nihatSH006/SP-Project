import { notFound } from "next/navigation"

import { getSessionUser } from "@/lib/auth"
import { canTriageCase } from "@/lib/cases"

/**
 * Role gate for the whole case section.
 *
 * This check lives in a LAYOUT rather than in the pages, because a segment's
 * `loading.tsx` wraps that segment's pages but not its layout. Once a response
 * starts streaming its status code is already sent, so a `notFound()` thrown
 * inside the streaming boundary renders the not-found page with an HTTP 200 —
 * the data stays hidden, but the status silently stops being a 404. Running
 * the gate here keeps both the body and the status honest, and still lets the
 * pages below stream behind a skeleton.
 *
 * 404 rather than 403: an operator has no business knowing a queue of cases
 * about their colleagues exists.
 */
export default async function CasesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSessionUser()
  if (!user || !canTriageCase(user)) notFound()

  return <>{children}</>
}
