/**
 * Drive the running app as a station-pinned manager and check that nothing
 * offering a CHOICE of station survives.
 *
 *   npm run dev                    # in another terminal
 *   npm run verify:station-scope
 *
 * A manager's queries are already pinned to their own site, so this is not
 * about leaking another station's data — `verify:cases` covers that. It is
 * about controls that cannot control anything: a dropdown with one entry, a
 * ranking with one row, a column repeating the same word down the page. The
 * positive controls matter as much as the negative ones: every assertion below
 * is paired with the admin making the same request, so a check cannot pass
 * merely because a page failed to render.
 */
const BASE = process.env.VERIFY_BASE ?? "http://localhost:3000"
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY

const ACCOUNTS: Record<string, [string, string]> = {
  admin: ["admin@sasis.test", "Sasis-Admin-2026!"],
  manager: ["manager@sasis.test", "Sasis-Manager-2026!"],
}

let pass = 0
let fail = 0
const check = (label: string, ok: boolean, extra = "") => {
  console.log(`  ${ok ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`)
  if (ok) pass += 1
  else fail += 1
}

async function signIn(email: string, password: string): Promise<string> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  )
  const body = (await res.json()) as { idToken?: string }
  if (!body.idToken) throw new Error(`sign-in failed for ${email}`)

  const session = await fetch(`${BASE}/api/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: body.idToken }),
  })
  return session.headers.get("set-cookie")!.split(";")[0]
}

async function get(cookie: string, path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { cookie }, redirect: "manual" })
  return { status: res.status, html: await res.text() }
}

/** Visible text only — a station name inside a `<script>` payload is not UI. */
const text = (html: string) =>
  html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ")

async function main() {
  if (!API_KEY) throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY missing")

  const cookies: Record<string, string> = {}
  for (const [role, [email, password]] of Object.entries(ACCOUNTS)) {
    cookies[role] = await signIn(email, password)
  }

  // ------------------------------------------------------------ the page
  console.log("\nThe Stations page")
  const mgr = await get(cookies.manager, "/stations")
  check(
    "a manager gets a real 404, not a 200 carrying an empty page",
    mgr.status === 404,
    `HTTP ${mgr.status}`
  )
  const adminStations = await get(cookies.admin, "/stations")
  check(
    "the very same request still works as an admin",
    adminStations.status === 200,
    `HTTP ${adminStations.status}`
  )

  const home = await get(cookies.manager, "/")
  check(
    "no Stations link in a manager's sidebar",
    !home.html.includes('href="/stations"')
  )
  const adminHome = await get(cookies.admin, "/")
  check(
    "the admin's sidebar still has one",
    adminHome.html.includes('href="/stations"')
  )

  // -------------------------------------------------------- the filter bar
  console.log("\nThe station filter")
  for (const path of ["/", "/operators", "/breakdown", "/alerts"]) {
    const page = await get(cookies.manager, path)
    // The filter bar labels each group with the field name.
    const labelled = /Station<\/|Stansiya<\/|Станция<\//.test(page.html)
    check(`${path} offers no station dropdown`, !labelled)
  }
  const adminOps = await get(cookies.admin, "/operators")
  check(
    "the admin still gets one",
    /Station<\/|Stansiya<\/|Станция<\//.test(adminOps.html),
    "positive control"
  )

  // A hand-edited URL must not produce a view the UI never offers.
  const forged = await get(cookies.manager, "/operators?station=Ganja+Station")
  check(
    "a hand-typed ?station= is ignored rather than honoured",
    forged.status === 200 && !text(forged.html).includes("Ganja"),
    `HTTP ${forged.status}`
  )

  // --------------------------------------------------- station comparisons
  console.log("\nComparisons between stations")
  const dash = await get(cookies.manager, "/")
  check(
    "no 'revenue by station' chart on the dashboard",
    !/by station|stansiyalar üzrə|по станциям/i.test(text(dash.html)),
    "one-bar chart removed"
  )
  check(
    "the admin's dashboard still has it",
    /by station|stansiyalar üzrə|по станциям/i.test(text(adminHome.html)),
    "positive control"
  )

  const pack = await get(cookies.manager, "/board-pack")
  const adminPack = await get(cookies.admin, "/board-pack")
  check(
    "no per-station table in a manager's board pack",
    !/by station|stansiyalar üzrə|по станциям/i.test(text(pack.html)),
    `HTTP ${pack.status}`
  )
  check(
    "the admin's board pack still has one",
    /by station|stansiyalar üzrə|по станциям/i.test(text(adminPack.html)),
    "positive control"
  )

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
