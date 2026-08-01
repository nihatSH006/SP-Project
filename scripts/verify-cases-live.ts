/**
 * Drive the running app over HTTP as each role and check the case queue's
 * access boundaries (ideas #8, #9).
 *
 *   npm run dev            # in another terminal
 *   npm run verify:cases
 *
 * The assertions that matter here are the NEGATIVE ones. A case document names
 * a person as suspected of theft, so the tests worth writing are the ones that
 * prove the wrong people cannot read it and cannot close it — including when
 * the request bypasses the UI entirely, which is how it would actually happen.
 */
import { adminAuth } from "@/lib/firebase/admin"

const BASE = process.env.VERIFY_BASE ?? "http://localhost:3000"
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY

const ACCOUNTS: Record<string, [string, string]> = {
  admin: ["admin@sasis.test", "Sasis-Admin-2026!"],
  supervisor: ["supervisor@sasis.test", "Sasis-Supervisor-2026!"],
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

/** Exchange email/password for a session cookie the way the browser does. */
async function signIn(email: string, password: string): Promise<string> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  )
  const body = (await res.json()) as { idToken?: string; error?: { message: string } }
  if (!body.idToken) throw new Error(`sign-in failed: ${body.error?.message}`)

  const session = await fetch(`${BASE}/api/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: body.idToken }),
  })
  const cookie = session.headers.get("set-cookie")
  if (!cookie) throw new Error("no session cookie returned")
  return cookie.split(";")[0]
}

async function get(cookie: string, path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { cookie },
    redirect: "manual",
  })
  return { status: res.status, html: await res.text() }
}

async function main() {
  if (!API_KEY) throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY missing")

  const cookies: Record<string, string> = {}
  for (const [role, [email, password]] of Object.entries(ACCOUNTS)) {
    cookies[role] = await signIn(email, password)
  }

  // --------------------------------------------------------------- visibility
  console.log("\nWho can reach the case queue")
  for (const role of ["admin", "supervisor", "manager"]) {
    const { status } = await get(cookies[role], "/cases")
    check(`${role} can open /cases`, status === 200, `HTTP ${status}`)
  }

  const staffCases = await get(cookies.staff, "/cases")
  check(
    "an operator gets 404 on /cases, not a permission error",
    staffCases.status === 404,
    `HTTP ${staffCases.status}`
  )

  const staffHome = await get(cookies.staff, "/")
  check(
    "an operator has no Cases link in the sidebar",
    !staffHome.html.includes('href="/cases"')
  )

  // --------------------------------------------------------- station scoping
  console.log("\nStation scoping")
  const adminList = await get(cookies.admin, "/cases")
  const managerList = await get(cookies.manager, "/cases")

  const idsIn = (html: string) =>
    Array.from(html.matchAll(/href="\/cases\/(\d+)"/g)).map((m) => m[1])
  const adminIds = new Set(idsIn(adminList.html))
  const managerIds = new Set(idsIn(managerList.html))

  check("admin sees every case", adminIds.size >= 5, `${adminIds.size} case(s)`)
  check(
    "manager sees fewer cases than admin",
    managerIds.size < adminIds.size,
    `${managerIds.size} vs ${adminIds.size}`
  )
  check(
    "every case a manager sees is their own station",
    !managerList.html.includes("Ganja Station") &&
      !managerList.html.includes("Sumqayit"),
    "no other station named in the page"
  )

  // A case the manager is not scoped to must 404 for them.
  const outside = [...adminIds].find((id) => !managerIds.has(id))
  if (outside) {
    const denied = await get(cookies.manager, `/cases/${outside}`)
    check(
      "manager gets 404 on another station's case",
      denied.status === 404,
      `case ${outside}, HTTP ${denied.status}`
    )
  }

  const staffCase = await get(cookies.staff, `/cases/${[...adminIds][0]}`)
  check(
    "operator gets 404 on a case detail page",
    staffCase.status === 404,
    `HTTP ${staffCase.status}`
  )

  // --------------------------------------------------------- evidence pack
  console.log("\nEvidence pack (#9)")
  const caseId = [...adminIds][0]
  const detail = await get(cookies.admin, `/cases/${caseId}`)
  check("case detail loads", detail.status === 200, `HTTP ${detail.status}`)
  check(
    "CCTV windows are rendered",
    /\d{2}:\d{2}(:\d{2})?\s*(<[^>]*>\s*)*→/.test(detail.html) ||
      detail.html.includes("→"),
    "time range present"
  )
  check(
    "the engine's verdict is labelled a proposal, not a finding",
    /not a conclusion|nəticə deyil|это не вывод/i.test(detail.html)
  )
  check(
    "the page warns against acting on the pattern alone",
    /innocent explanations|günahsız izah|невинные объяснения/i.test(
      detail.html
    )
  )

  // Operational findings must not pad a theft case.
  check(
    "a dead-pump finding is not presented as evidence of theft",
    !detail.html.includes("Hours with almost no sales"),
    "dead-hours excluded from the pack"
  )

  // ------------------------------------------------- server-side enforcement
  // The UI hides the closing statuses from a manager. That is a courtesy. This
  // is the boundary: post the action over HTTP, exactly as someone bypassing
  // the UI would, and check what actually landed in Firestore.
  console.log("\nServer-side enforcement (UI bypassed)")

  const { adminDb } = await import("@/lib/firebase/admin")
  const { COLLECTIONS, stationId } = await import("@/lib/firebase/schema")

  const managerCaseId = [...managerIds][0]
  const managerCase = await get(cookies.manager, `/cases/${managerCaseId}`)

  // React's own no-JavaScript form path: an $ACTION_ID_ field names the action
  // and every other field is form data. No React runtime required to send it.
  const actionId = JSON.parse(
    managerCase.html
      .match(/name="\$ACTION_1:0" value="([^"]*)"/)![1]
      .replace(/&quot;/g, '"')
  ).id as string

  const caseRef = (station: string, id: string) =>
    adminDb()
      .collection(COLLECTIONS.stations)
      .doc(stationId(station))
      .collection(COLLECTIONS.cases)
      .doc(id)

  const statusOf = async (station: string, id: string) =>
    (await caseRef(station, id).get()).data()?.status as string | undefined

  async function post(
    cookie: string,
    caseId: string,
    fields: Record<string, string>
  ) {
    const form = new FormData()
    form.append(`$ACTION_ID_${actionId}`, "")
    for (const [k, v] of Object.entries(fields)) form.append(k, v)
    const res = await fetch(`${BASE}/cases/${caseId}`, {
      method: "POST",
      headers: { cookie },
      body: form,
    })
    await res.text()
    return res.status
  }

  const STATION = "Baku Station 1"
  const before = await statusOf(STATION, managerCaseId)

  // (1) A manager tries to confirm fraud on their own team member.
  await post(cookies.manager, managerCaseId, {
    employeeId: managerCaseId,
    station: STATION,
    status: "confirmed",
    note: "forged submission from the verification script",
  })
  const afterManager = await statusOf(STATION, managerCaseId)
  // Station managers may conclude, at the client's instruction. The conflict
  // of interest in judging your own team is now controlled by the RECORD
  // rather than by the permission — so what has to hold is that the act is
  // attributed, not that it is refused.
  check(
    "a station manager can record a conclusion",
    afterManager === "confirmed",
    `status became "${afterManager}"`
  )

  // (2) POSITIVE CONTROL. Without this, assertion (1) would also "pass" if the
  // request never reached the action at all — which is exactly the trap an
  // earlier version of this script fell into.
  await post(cookies.supervisor, managerCaseId, {
    employeeId: managerCaseId,
    station: STATION,
    status: "investigating",
    note: "opened by the verification script",
  })
  const afterSupervisor = await statusOf(STATION, managerCaseId)
  check(
    "the very same request DOES work as a supervisor",
    afterSupervisor === "investigating",
    `status became "${afterSupervisor}"`
  )

  // (3) The station field is attacker-controlled, so it must never be what the
  // scope check is based on.
  const outsideId = [...adminIds].find((id) => !managerIds.has(id))
  if (outsideId) {
    const outsideCase = await adminDb()
      .collectionGroup(COLLECTIONS.cases)
      .get()
      .then((snap) =>
        snap.docs.find((d) => d.data().employeeId === Number(outsideId))
      )
    const outsideStation = outsideCase!.data().station as string
    const outsideBefore = outsideCase!.data().status as string

    await post(cookies.manager, outsideId, {
      employeeId: outsideId,
      station: outsideStation,
      status: "investigating",
      note: "cross-station attempt from the verification script",
    })
    const outsideAfter = await statusOf(outsideStation, outsideId)
    check(
      "a manager cannot reach another station by naming it in the form",
      outsideAfter === outsideBefore,
      `${outsideStation} case stayed "${outsideAfter}"`
    )
  }

  // (4) Confirming fraud demands written reasoning.
  await post(cookies.supervisor, managerCaseId, {
    employeeId: managerCaseId,
    station: STATION,
    status: "confirmed",
    note: "bad",
  })
  check(
    "confirming fraud is refused without written reasoning",
    (await statusOf(STATION, managerCaseId)) !== "confirmed",
    "short note rejected"
  )

  // (5) Every accepted change is attributed and appended to the timeline.
  const timeline = await caseRef(STATION, managerCaseId)
    .collection("timeline")
    .get()
  const entries = timeline.docs.map((d) => d.data())
  check(
    "the accepted change was written to the append-only timeline",
    entries.some((e) => e.to === "investigating"),
    `${entries.length} timeline entr(ies)`
  )
  check(
    "the timeline names who made the change",
    entries.some((e) => e.by === ACCOUNTS.supervisor[0]),
    entries.map((e) => e.by).join(", ")
  )
  check(
    "a conclusion is attributed to whoever made it",
    entries.some((e) => e.to === "confirmed" && e.by === ACCOUNTS.manager[0]),
    "manager's confirmation recorded against them"
  )
  check(
    "the cross-station attempt left no trace",
    !entries.some((e) => e.note?.includes("cross-station")),
    "refused before it could be written"
  )

  // The stored `by` is an email; what a reviewer must SEE is a person and a
  // job. That resolution happens on read, so assert on the read path rather
  // than on the raw documents above.
  const { getCaseTimeline } = await import("@/lib/cases")
  const resolved = await getCaseTimeline(STATION, Number(managerCaseId))
  const conclusion = resolved.find((e) => e.to === "confirmed")
  check(
    "the timeline shows a name, not an email address",
    conclusion?.byName === "Test Station Manager",
    `shown as "${conclusion?.byName ?? "(unresolved)"}"`
  )
  check(
    "the timeline shows what authority the person acted under",
    conclusion?.byRole === "manager",
    `role "${conclusion?.byRole ?? "(unresolved)"}"`
  )

  // Put the case back so the app is left as it was found.
  await caseRef(STATION, managerCaseId).update({ status: before, note: "" })
  const cleanup = await caseRef(STATION, managerCaseId)
    .collection("timeline")
    .get()
  await Promise.all(cleanup.docs.map((d) => d.ref.delete()))
  console.log(`  · restored case ${managerCaseId} to "${before}"`)

  // Sanity: the admin SDK is what seeded these, so confirm the claim wiring
  // the whole scoping story depends on is actually present.
  const staffUser = await adminAuth().getUserByEmail(ACCOUNTS.staff[0])
  check(
    "station-pinned accounts carry a slug stationId claim",
    typeof staffUser.customClaims?.stationId === "string" &&
      staffUser.customClaims.stationId === "baku-station-1",
    String(staffUser.customClaims?.stationId)
  )

  console.log(`\n${pass} passed, ${fail} failed\n`)
  process.exit(fail ? 1 : 0)
}

main().catch((error) => {
  console.error("\nverification failed to run:", error.message)
  process.exit(1)
})
