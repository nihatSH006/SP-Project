/**
 * Check the monthly board pack (idea #4).
 *
 *   npm run dev              # in another terminal
 *   npm run verify:board
 *
 * The assertion that matters most is that a manager's pack reports THEIR
 * station's revenue, not the network's. A board pack that silently sums the
 * whole company under one station's heading is worse than no report: it looks
 * authoritative and it is wrong.
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

/** Largest AZN figure on the page — the headline revenue. */
function headlineRevenue(html: string): number {
  const numbers = Array.from(html.matchAll(/([\d,]{5,})\s*AZN/g)).map((m) =>
    Number(m[1].replace(/,/g, ""))
  )
  return numbers.length ? Math.max(...numbers) : 0
}

async function main() {
  const cookies: Record<string, string> = {}
  for (const [role, [email, password]] of Object.entries(ACCOUNTS)) {
    cookies[role] = await signIn(email, password)
  }
  const get = async (cookie: string) => {
    const res = await fetch(`${BASE}/board-pack`, { headers: { cookie } })
    return { status: res.status, html: await res.text() }
  }

  console.log("\nThe pack renders")
  const admin = await get(cookies.admin)
  check("board pack loads", admin.status === 200, `HTTP ${admin.status}`)
  check("a month is stated", /\d{4}-\d{2}/.test(admin.html))
  check("there is a print control", /Save as PDF|PDF kimi saxla|Сохранить в PDF/.test(admin.html))

  console.log("\nIt states its own data quality")
  check(
    "the data-quality section is present",
    /Data quality|Məlumat keyfiyyəti|Качество данных/.test(admin.html)
  )
  check(
    "completeness of the month is declared",
    /days imported|yüklənib|дней/.test(admin.html)
  )
  // The pack covers 3–30 July, so the month is partial and must say so rather
  // than presenting the totals as a full month.
  check(
    "a partial month is labelled as partial, not shown as whole",
    /Partial month|Natamam ay|Неполный месяц/.test(admin.html),
    "the seeded window is 28 of 31 days"
  )

  console.log("\nFraud figures are framed as proposals, not findings")
  check(
    "the integrity section says a proposal is not a finding",
    /not a finding|nəticə demək deyil|не вывод/.test(admin.html)
  )
  check(
    "outstanding cases are listed as the outstanding decision",
    /awaiting a decision|qərar gözləyir|Ждёт решения/i.test(admin.html)
  )

  console.log("\nHandling note travels on the paper")
  check(
    "the pack is marked confidential",
    /Confidential|Məxfidir|Конфиденциально/.test(admin.html)
  )

  console.log("\nScoping — the assertion that matters")
  const manager = await get(cookies.manager)
  check("manager's pack loads", manager.status === 200, `HTTP ${manager.status}`)
  check(
    "no other station appears in it",
    !manager.html.includes("Ganja") && !manager.html.includes("Sheki"),
    "single station only"
  )

  const adminRevenue = headlineRevenue(admin.html)
  const managerRevenue = headlineRevenue(manager.html)
  check(
    "a manager's headline revenue is their station's, not the network's",
    managerRevenue > 0 && managerRevenue < adminRevenue / 2,
    `manager ${managerRevenue.toLocaleString("en-US")} vs network ${adminRevenue.toLocaleString("en-US")}`
  )

  console.log(`\n${pass} passed, ${fail} failed\n`)
  process.exit(fail ? 1 : 0)
}

main().catch((e) => {
  console.error("\nverification failed to run:", e.message)
  process.exit(1)
})

export {}
