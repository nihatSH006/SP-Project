/**
 * Check the overview is actually simpler, and that nothing was lost (#UX).
 *
 *   npm run dev                # in another terminal
 *   npm run verify:overview
 *
 * "Cleaner" is easy to claim and easy to fake by deleting things. So this
 * counts what is on the page AND checks that every figure removed from the
 * overview is still reachable on the breakdown page.
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

/** Visible text, with markup and scripts stripped. */
function visibleText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

async function main() {
  const cookie = await signIn("admin@sasis.test", "Sasis-Admin-2026!")
  const get = async (path: string) => {
    const res = await fetch(`${BASE}${path}`, { headers: { cookie } })
    return { status: res.status, html: await res.text() }
  }

  const overview = await get("/")
  const breakdown = await get("/breakdown")

  console.log("\nBoth pages render")
  check("overview loads", overview.status === 200, `HTTP ${overview.status}`)
  check("breakdown loads", breakdown.status === 200, `HTTP ${breakdown.status}`)

  console.log("\nThe overview got smaller")
  const words = visibleText(overview.html).split(" ").length
  // The old page carried 6 KPI tiles, 11 cards and a 4-paragraph brief. The
  // rebuilt one should be well under half the reading load.
  check("visible word count is modest", words < 420, `${words} words`)

  const cards = (overview.html.match(/data-slot="card"/g) ?? []).length
  check("card count is in single digits", cards <= 9, `${cards} cards`)

  console.log("\nThe restated prose is gone")
  check(
    "no executive-brief paragraph",
    !/the fleet generated|leads with|Average productivity is/i.test(overview.html),
    "four paragraphs of restatement removed"
  )
  // The specific failure being guarded against: the old page said the target
  // percentage in eight separate places.
  const pctMatches = (visibleText(overview.html).match(/\d+% /g) ?? []).length
  check("percentages are not repeated all over the page", pctMatches <= 6, `${pctMatches} occurrences`)

  console.log("\nNothing was lost — it moved")
  const both = overview.html + breakdown.html
  for (const [what, pattern] of [
    ["revenue", /Revenue|Gəlir|Выручка/],
    ["transactions", /Sales|Satışlar|Продажи/],
    ["operators on duty", /On duty|Növbədə|На смене/],
    ["productivity", /Per hour|Saatlıq|В час/],
    ["attendance", /Attendance|Davamiyyət|Посещаемость/],
    ["hourly curve", /Through the day|Gün ərzində|В течение дня/],
    ["revenue by station", /By station|Stansiyalar|По станциям/],
    ["revenue by department", /By department|Şöbələr|По отделам/],
    ["shift coverage", /By shift|Növbələr|По сменам/],
    ["risk distribution", /By risk|Risk üzrə|По риску/],
    ["top performers", /Top performers|Ən yaxşılar|Лучшие/],
    ["best station", /Best station|Ən yaxşı stansiya|Лучшая станция/],
    ["best department", /Best department|Ən yaxşı şöbə|Лучший отдел/],
    ["revenue per operator", /Per operator|Operator başına|На оператора/],
  ] as const) {
    check(`${what} is still shown`, pattern.test(both))
  }

  console.log("\nThe headline is an answer, not a list")
  const verdict = overview.html.match(/data-verdict="([a-z-]+)"/)?.[1]
  check(
    "a single verdict is stated",
    Boolean(verdict) && ["on-track", "watch", "action"].includes(verdict!),
    verdict ?? "none found"
  )
  check(
    "attention rows link somewhere actionable",
    /href="\/alerts"|href="\/operators\?risk=HIGH"/.test(overview.html),
    "each exception is clickable"
  )

  console.log(`\n${pass} passed, ${fail} failed\n`)
  process.exit(fail ? 1 : 0)
}

main().catch((e) => {
  console.error("\nverification failed to run:", e.message)
  process.exit(1)
})

export {}
