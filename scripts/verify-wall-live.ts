/**
 * Check the office wall screen (idea #5).
 *
 *   npm run dev            # in another terminal
 *   npm run verify:wall
 *
 * The assertion that matters most is the honesty one. A board on a wall reads
 * as "right now" to everyone who walks past it, and these figures come from
 * one import a day. If the screen ever stops saying how old its numbers are,
 * it becomes a device for making confident decisions on stale data.
 */
const BASE = process.env.VERIFY_BASE ?? "http://localhost:3000"
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY

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
  const s = await fetch(`${BASE}/api/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: body.idToken }),
  })
  return s.headers.get("set-cookie")!.split(";")[0]
}

/**
 * The network revenue figure, read from its tagged element.
 *
 * An earlier version took the largest AZN number on the page. On the wall that
 * is the TARGET, because the wall labels its target in AZN and the overview
 * does not — so the check compared revenue against a target and reported a
 * mismatch that did not exist.
 */
function headline(html: string): number {
  const m = html.match(
    /data-metric="network-revenue"[^>]*>\s*([\d,]+)/
  )
  return m ? Number(m[1].replace(/,/g, "")) : 0
}

async function main() {
  const admin = await signIn("admin@sasis.test", "Sasis-Admin-2026!")
  const get = async (path: string, cookie: string) => {
    const res = await fetch(`${BASE}${path}`, { headers: { cookie }, redirect: "manual" })
    return { status: res.status, html: await res.text() }
  }

  console.log("\nThe screen renders")
  const wall = await get("/wall", admin)
  check("wall loads", wall.status === 200, `HTTP ${wall.status}`)
  check(
    "every station is on it",
    (wall.html.match(/Station/g) ?? []).length >= 8,
    "8 stations"
  )

  console.log("\nIt does not pretend to be live")
  check(
    "the screen states it is not a live feed",
    /not a live feed|canlı yayım deyil|не прямой эфир/i.test(wall.html),
    "said in words, on the screen"
  )
  check(
    "the operational day is shown",
    /\d{4}-\d{2}-\d{2}/.test(wall.html),
    "the day the figures belong to"
  )
  // The age counter is client-rendered; the component must be shipped.
  check(
    "an age readout is present",
    /Import time not recorded|min old|h old|d old|əvvəl|назад|qeyd olunmayıb|не записано/.test(
      wall.html
    ) || /wall-clock/.test(wall.html),
    "age is rendered or hydrated"
  )

  console.log("\nNo dashboard chrome")
  check("no sidebar", !/data-slot="sidebar"/.test(wall.html))
  check("no filter bar", !/data-slot="sidebar-trigger"/.test(wall.html))

  console.log("\nIt agrees with the dashboard")
  // A wall that contradicts the report someone is holding is worse than none.
  const overview = await get("/", admin)
  check(
    "network revenue matches the overview",
    headline(wall.html) === headline(overview.html),
    `wall ${headline(wall.html).toLocaleString("en-US")} vs overview ${headline(overview.html).toLocaleString("en-US")}`
  )

  console.log("\nIt can be found from the dashboard")
  // The sidebar links to /wall too, so match the launcher's own wording rather
  // than any link to the page.
  const LAUNCHER = /Full-screen board|tam ekran lövhə|Полноэкранное табло/
  check(
    "the overview offers a way to open the screen",
    LAUNCHER.test(overview.html),
    "launcher present"
  )

  console.log("\nStill behind authentication")
  const anon = await fetch(`${BASE}/wall`, { redirect: "manual" })
  check(
    "a signed-out request is redirected to login",
    anon.status === 307 || anon.status === 302,
    `HTTP ${anon.status}`
  )
  check(
    "…and no figures are served with it",
    !/AZN/.test(await anon.text()),
    "nothing leaked to the lobby"
  )

  // An operator has no reason to put a network board on a wall, so the
  // launcher is not offered to them — the page itself stays reachable, since
  // the figures on it are their own station's and already visible to them.
  const staff = await signIn("staff@sasis.test", "Sasis-Staff-2026!")
  const staffOverview = await get("/", staff)
  check(
    "an operator is not offered the launcher",
    !LAUNCHER.test(staffOverview.html),
    "hidden for staff"
  )
  check(
    "…nor a sidebar link to it",
    !/href="\/wall"/.test(staffOverview.html),
    "no nav entry either"
  )

  // A station manager's screen must show their station, not the network.
  const manager = await signIn("manager@sasis.test", "Sasis-Manager-2026!")
  const managerWall = await get("/wall", manager)
  check(
    "a station-pinned account sees only its own station",
    managerWall.status === 200 &&
      !managerWall.html.includes("Ganja") &&
      !managerWall.html.includes("Sheki"),
    "scoping holds on the wall too"
  )

  console.log(`\n${pass} passed, ${fail} failed\n`)
  process.exit(fail ? 1 : 0)
}

main().catch((e) => {
  console.error("\nverification failed to run:", e.message)
  process.exit(1)
})

export {}
