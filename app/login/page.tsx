import { redirect } from "next/navigation"

import { LoginForm } from "@/components/login-form"
import { getSessionUser } from "@/lib/auth"
import type { SearchParams } from "@/lib/data"

export const metadata = { title: "Sign in" }

/** Only same-origin paths — an open redirect here would be a phishing vector. */
function safeRedirect(value: string | string[] | undefined): string {
  const next = Array.isArray(value) ? value[0] : value
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/"
  return next
}

export default async function LoginPage(props: {
  searchParams: Promise<SearchParams>
}) {
  const searchParams = await props.searchParams
  const next = safeRedirect(searchParams.next)

  if (await getSessionUser()) redirect(next)

  return (
    <main className="flex min-h-svh flex-1 items-center justify-center bg-background p-6">
      <LoginForm redirectTo={next} />
    </main>
  )
}
