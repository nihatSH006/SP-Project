/**
 * Check the staffing page renders and stays station-scoped (idea #12).
 *
 *   npm run dev              # in another terminal
 *   npm run verify:staffing-live
 */
const BASE = process.env.VERIFY_BASE ?? "http://localhost:3000"
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY

const ACCOUNTS: Record<string, [string, string]> = {
  admin: ["admin@sasis.test", "Sasis-Admin-2026!"],
  manager: ["manager@sasis.test", "Sasis-Manager-2026!"],
  staff: ["staff@sasis.test", "Sasis-Staff-2026!"],
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

async function main() {
  const cookies: Record<string, string> = {}
  for (const [role, [email, password]] of Object.entries(ACCOUNTS)) {
    cookies[role] = await signIn(email, password)
  }
  const get = async (cookie: string) => {
    const res = await fetch(`${BASE}/staffing`, { headers: { cookie } })
    return { status: res.status, html: await res.text() }
  }

  console.log("\nThe page renders")
  const admin = await get(cookies.admin)
  check("staffing loads", admin.status === 200, `HTTP ${admin.status}`)
  check(
    "the whole-network view is offered first",
    /Whole network|Bütün şəbəkə|Вся сеть/.test(admin.html)
  )
  check(
    "all 8 stations have a tab",
    (admin.html.match(/Station/g) ?? []).length >= 8,
    "station tabs present"
  )
  // 7 rows x 24 columns of cells, rendered as titled divs.
  const cells = (admin.html.match(/operator-hour|operator-saat|операторо-час/g) ?? []).length
  check("the grid is rendered", cells > 50, `${cells} labelled cells`)

  console.log("\nHonesty of the framing")
  check(
    "the page says the rate reflects customers, not effort",
    /not how hard anyone worked|kiminsə nə qədər çalışdığını yox|а не усердие/.test(admin.html)
  )
  check(
    "the night-cover caveat is shown to the user, not just in the code",
    /safety and single-manning|təhlükəsizlik|ради безопасности/.test(
      admin.html
    )
  )
  check(
    "it explains why it does not compare against the weekly average",
    /nights are quiet|gecələr sakitdir|ночью тихо/.test(admin.html)
  )

  console.log("\nScoping")
  const manager = await get(cookies.manager)
  check("manager's view loads", manager.status === 200, `HTTP ${manager.status}`)
  check(
    "manager sees only their own station",
    !manager.html.includes("Ganja Station") && !manager.html.includes("Sheki Station"),
    "no other station named"
  )
  check(
    "with one station there is no network roll-up to compare against",
    !/Whole network|Bütün şəbəkə|Вся сеть/.test(manager.html)
  )

  const staff = await get(cookies.staff)
  check("operators can see the rota view", staff.status === 200, `HTTP ${staff.status}`)

  console.log(`\n${pass} passed, ${fail} failed\n`)
  process.exit(fail ? 1 : 0)
}

main().catch((e) => {
  console.error("\nverification failed to run:", e.message)
  process.exit(1)
})

// Keeps this file a module: two verifier scripts otherwise declare the same
// top-level names in the global scope and collide at type-check time.
export {}
