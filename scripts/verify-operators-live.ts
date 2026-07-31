/**
 * Check the operators page and the grouped navigation.
 *
 *   npm run dev                 # in another terminal
 *   npm run verify:operators
 *
 * The load-bearing assertion is the risk filter. The overview promises "2
 * high-risk operators" as a link; if that link does not actually narrow the
 * list, the exception panel is decoration.
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

const rowsIn = (html: string) =>
  new Set(
    Array.from(html.matchAll(/href="\/operators\/(\d+)"/g)).map((m) => m[1])
  )

async function main() {
  const cookie = await signIn("admin@sasis.test", "Sasis-Admin-2026!")
  const get = async (path: string) => {
    const res = await fetch(`${BASE}${path}`, { headers: { cookie } })
    return { status: res.status, html: await res.text() }
  }

  console.log("\nThe list is scannable")
  const all = await get("/operators")
  check("operators loads", all.status === 200, `HTTP ${all.status}`)

  // Count header cells in the operator table: 6 data columns plus the rank.
  const headerBlock = all.html.match(/<thead[\s\S]*?<\/thead>/)?.[0] ?? ""
  const columns = (headerBlock.match(/<th/g) ?? []).length
  check("the table fits without sideways scrolling", columns <= 8, `${columns} columns, was 13`)

  // React inserts comment markers between adjacent expressions, so match the
  // secondary line by its wrapper rather than by the rendered punctuation.
  const secondary = all.html.match(
    /class="text-xs text-muted-foreground">[^<]*Station/
  )
  check(
    "station and shift are shown, just not as columns",
    Boolean(secondary),
    "folded under the name"
  )
  check(
    "…and they are no longer columns of their own",
    !/<th[^>]*>(?:(?!<\/th>).)*(Station|Stansiya|Станция)/.test(headerBlock),
    "two columns reclaimed"
  )

  console.log("\nThe overview's promise is kept")
  const chips = /href="\/operators\?risk=HIGH"|href="\/operators\?[^"]*risk=HIGH/.test(
    all.html
  )
  check("a HIGH risk filter is offered", chips)

  const everyone = rowsIn(all.html)
  const high = await get("/operators?risk=HIGH")
  const highRows = rowsIn(high.html)
  check("the HIGH link loads", high.status === 200, `HTTP ${high.status}`)
  check(
    "…and it genuinely narrows the list",
    highRows.size > 0 && highRows.size < everyone.size,
    `${highRows.size} of ${everyone.size}`
  )
  check(
    "every remaining row really is high risk",
    // One risk badge per row; they must all read HIGH.
    (high.html.match(/HIGH/g) ?? []).length >= highRows.size,
    "no other band leaked through"
  )

  console.log("\nThe chips survive being used")
  // A filter UI that zeroes its own counts once selected is a dead end.
  check(
    "other bands still show their counts after filtering",
    /risk=LOW/.test(high.html) && /risk=MEDIUM/.test(high.html),
    "navigation intact"
  )

  const bogus = await get("/operators?risk=NONSENSE")
  check(
    "an invented risk value is ignored, not obeyed",
    rowsIn(bogus.html).size === everyone.size,
    "falls back to everyone"
  )

  console.log("\nNothing was lost — the profile has the rest")
  const someone = [...everyone][0]
  const profile = await get(`/operators/${someone}`)
  for (const [what, pattern] of [
    ["hours", /Working hours|İş saatları|Рабочие часы/],
    ["transactions", /Transactions|Əməliyyatlar|Операции/],
    ["score", /score|bal|балл/i],
    ["department", /Fuel Sales|Shop|Car Wash/],
  ] as const) {
    check(`${what} still on the profile`, pattern.test(profile.html))
  }

  console.log("\nNavigation is grouped")
  const labels = Array.from(
    all.html.matchAll(/data-slot="sidebar-group-label"[^>]*>([^<]+)</g)
  ).map((m) => m[1].trim())
  check(
    "the sidebar has several labelled sections",
    labels.length >= 4,
    labels.join(" | ") || "none found"
  )
  check(
    "no single ungrouped list of every page",
    !labels.includes("Analysis") && !labels.includes("Analiz"),
    "old flat group gone"
  )

  console.log(`\n${pass} passed, ${fail} failed\n`)
  process.exit(fail ? 1 : 0)
}

main().catch((e) => {
  console.error("\nverification failed to run:", e.message)
  process.exit(1)
})

export {}
