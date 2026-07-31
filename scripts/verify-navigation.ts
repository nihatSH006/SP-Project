/**
 * Measure what a client-side navigation actually costs (perceived speed).
 *
 *   npm run dev             # in another terminal
 *   npm run verify:nav
 *
 * When the sidebar and header lived inside every page, each navigation re-sent
 * and re-computed the whole chrome before anything could paint. Moving them to
 * the layout means App Router reuses them, and the request for a new page
 * carries only that page. This measures both halves of that claim: the payload
 * no longer contains the chrome, and every route has a skeleton to paint
 * immediately.
 */
import { readdirSync, existsSync } from "node:fs"
import { join } from "node:path"

const BASE = process.env.VERIFY_BASE ?? "http://localhost:3000"
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY

let pass = 0
let fail = 0
const check = (label: string, ok: boolean, extra = "") => {
  console.log(`  ${ok ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`)
  if (ok) pass += 1
  else fail += 1
}

async function signIn(): Promise<string> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@sasis.test",
        password: "Sasis-Admin-2026!",
        returnSecureToken: true,
      }),
    }
  )
  const { idToken } = (await res.json()) as { idToken: string }
  const s = await fetch(`${BASE}/api/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  })
  return s.headers.get("set-cookie")!.split(";")[0]
}

const ROUTES = [
  "/",
  "/operators",
  "/leaderboard",
  "/stations",
  "/alerts",
  "/staffing",
  "/cases",
  "/board-pack",
]

async function main() {
  const cookie = await signIn()

  console.log("\nEvery navigable route paints a skeleton immediately")
  // A route without a loading.tsx in its own segment blocks on data before
  // rendering anything.
  const appDir = join(process.cwd(), "app", "(app)")
  const loadingFiles: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name === "loading.tsx") loadingFiles.push(full)
    }
  }
  walk(appDir)
  check(
    "list routes have their own loading boundary",
    loadingFiles.length >= 8,
    `${loadingFiles.length} loading.tsx files`
  )
  check(
    "no group-wide loading.tsx swallows nested 404s",
    !existsSync(join(appDir, "loading.tsx")),
    "scoped per route instead"
  )

  console.log("\nThe chrome is no longer re-sent on navigation")
  // Next asks for just the changed segment with an RSC request. The response
  // should carry the page, not the sidebar.
  let worstChrome = 0
  for (const route of ROUTES) {
    const res = await fetch(`${BASE}${route}`, {
      headers: { cookie, RSC: "1" },
    })
    const body = await res.text()
    // Sidebar-only markers: the nav labels and the sidebar slot.
    const chromeHits = (body.match(/data-slot="sidebar"/g) ?? []).length
    worstChrome = Math.max(worstChrome, chromeHits)
    const full = await fetch(`${BASE}${route}`, { headers: { cookie } })
    const fullHtml = await full.text()
    console.log(
      `    ${route.padEnd(13)} nav payload ${(body.length / 1024).toFixed(0).padStart(4)} KB   full page ${(fullHtml.length / 1024).toFixed(0).padStart(4)} KB   sidebar in payload: ${chromeHits > 0 ? "YES" : "no"}`
    )
  }
  check(
    "no route re-sends the sidebar on a client navigation",
    worstChrome === 0,
    "layout is reused"
  )

  console.log("\nAccess control survived the restructure")
  const staffRes = await fetch(`${BASE}/cases`, {
    headers: {
      cookie: await (async () => {
        const res = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: "staff@sasis.test",
              password: "Sasis-Staff-2026!",
              returnSecureToken: true,
            }),
          }
        )
        const { idToken } = (await res.json()) as { idToken: string }
        const s = await fetch(`${BASE}/api/auth/session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        })
        return s.headers.get("set-cookie")!.split(";")[0]
      })(),
    },
  })
  // The status matters as much as the body: a 200 carrying the not-found page
  // hides the data but stops unauthorised access showing up as such in logs.
  check(
    "an operator still gets a real 404 on /cases, not a 200",
    staffRes.status === 404,
    `HTTP ${staffRes.status}`
  )

  console.log(`\n${pass} passed, ${fail} failed\n`)
  process.exit(fail ? 1 : 0)
}

main().catch((e) => {
  console.error("\nverification failed to run:", e.message)
  process.exit(1)
})

export {}
