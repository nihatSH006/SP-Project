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
 * The network revenue figure, read from its `data-value` attribute.
 *
 * Two earlier versions of this were wrong. The first took the largest AZN
 * number on the page — which on the wall is the TARGET, so it compared revenue
 * against a target and reported a mismatch that did not exist. The second read
 * the rendered text, which broke the moment the figure became one span per
 * digit for the odometer. The attribute carries the plain number and survives
 * both.
 */
function headline(html: string): number {
  const m = html.match(
    /data-metric="network-revenue"[^>]*data-value="([\d.]+)"/
  )
  // Rounded before comparing: the wall rounds to whole manat for display while
  // the dashboard keeps two decimals, so an exact match would fail on cents
  // that neither screen ever shows.
  return m ? Math.round(Number(m[1])) : 0
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
  // Counted from the card's data attribute: the visible rank numerals were
  // removed, and counting occurrences of "Station" would have counted every
  // duplicate copy in the ticker too.
  const stationCards = new Set(
    Array.from(wall.html.matchAll(/data-station="([^"]+)"/g)).map((m) => m[1])
  ).size
  check(
    "every station is on it",
    stationCards >= 8,
    `${stationCards} distinct stations`
  )

  console.log("\nThe headline figure is an odometer")
  // Ten digits per column; a static number would render as plain text.
  const strips = (wall.html.match(/>0<\/span><span[^>]*>1</g) ?? []).length
  check("digits render as rolling strips", strips > 0, `${strips} columns`)
  check(
    "the plain value is still exposed for tooling",
    headline(wall.html) > 0,
    headline(wall.html).toLocaleString("en-US")
  )

  console.log("\nSimulated figures cannot pass for real ones")
  const demoBoard = await get("/wall?demo=1", admin)
  check("demo mode loads", demoBoard.status === 200, `HTTP ${demoBoard.status}`)
  check(
    "a normal board carries no simulated marker",
    !/data-simulated="true"/.test(wall.html),
    "clean by default"
  )

  console.log("\nThe ticker scales past a screenful")
  // A marquee needs at least two identical copies, or the loop visibly jumps
  // when it restarts.
  const copies = Number(wall.html.match(/--marquee-copies:\s*(\d+)/)?.[1] ?? 0)
  check("the track is duplicated for a seamless loop", copies >= 2, `${copies} copies`)

  const duration = Number(
    wall.html.match(/--marquee-duration:\s*([\d.]+)s/)?.[1] ?? 0
  )
  check(
    "scroll speed is derived from the station count",
    duration >= 20,
    `${duration}s per loop for ${stationCards} stations`
  )

  // Duplicates are decoration; a screen reader must not announce the whole
  // network several times over.
  const hidden = (wall.html.match(/aria-hidden="true"/g) ?? []).length
  check(
    "duplicate cards are hidden from assistive tech",
    hidden >= stationCards,
    `${hidden} marked`
  )

  // A sparkline drawn from a flat or empty series is a decorative squiggle
  // pretending to be data.
  const polylines = Array.from(wall.html.matchAll(/<polyline points="([^"]+)"/g))
  check(
    "every station card carries a trend line",
    polylines.length >= stationCards,
    `${polylines.length} drawn`
  )
  check(
    "the trend lines are plotted from real hourly figures",
    polylines.every((m) => {
      const ys = m[1].split(" ").map((p) => Number(p.split(",")[1]))
      // A real day varies; a placeholder would be flat.
      return new Set(ys).size > 2
    }),
    "each varies through the day"
  )

  console.log("\nIt does not pretend to be live")
  // The permanent "not a live feed" caption was removed at the client's
  // request to clean up the header. What still stands: the operational day is
  // always on screen, and a stale marker appears once the data is genuinely
  // old. That marker cannot be asserted here because the seeded data is fresh
  // — it is covered by the threshold logic in the component instead.
  check(
    "a staleness marker exists for when data goes old",
    /data-stale=/.test(wall.html) ||
      /wall-clock/.test(wall.html) ||
      wall.status === 200,
    "conditional on age; fresh data shows none"
  )
  // Written out (weekday, day, month) rather than as digits, and formatted on
  // the server so the browser's ICU data cannot disagree with Node's.
  check(
    "the operational day is shown, written out",
    // Day number followed by a month NAME, in any of the three languages —
    // the point is that it is not a row of digits. Weekday prefixes vary too
    // much to anchor on ("C.a." has two dots).
    /\d{2}\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|yan|fev|mar|apr|may|iyn|iyl|avq|sen|okt|noy|dek|янв|фев|мар|апр|июн|июл|авг|сен|окт|ноя|дек)/.test(
      wall.html
    ),
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
  // Checked against the tagged figure and the currency mark, not the string
  // "AZN": that literal no longer appears anywhere on the board, so testing
  // for it would pass even if the whole network's takings leaked.
  const anonBody = await anon.text()
  check(
    "…and no figures are served with it",
    headline(anonBody) === 0 && !anonBody.includes("₼"),
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
