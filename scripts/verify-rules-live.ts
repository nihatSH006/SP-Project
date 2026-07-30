/**
 * Verify the **deployed** Firestore rules against the real project, using the
 * client SDK exactly as a browser would.
 *
 *   npm run rules:verify
 *
 * This is the counterpart to `scripts/verify-rules.ts` (which needs the
 * emulator, and therefore JDK 21). Testing live has one advantage the emulator
 * cannot offer: it proves what is actually released, not what is on disk.
 *
 * Credentials come from the environment so no secrets live in this file:
 *   RULES_ADMIN_EMAIL / RULES_ADMIN_PASSWORD
 *   RULES_STAFF_EMAIL / RULES_STAFF_PASSWORD   (must be role=staff, Baku Station 1)
 */
import { initializeApp, deleteApp, type FirebaseApp } from "firebase/app"
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
} from "firebase/auth"
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  setDoc,
  type Firestore,
} from "firebase/firestore"

import { firebaseConfig } from "@/lib/firebase/config"

const BAKU_1 = "baku-station-1"
const GANJA = "ganja-station"

let passed = 0
let failed = 0

/** `expected: "allow"` asserts the read succeeds; `"deny"` asserts it is refused. */
async function check(
  label: string,
  expected: "allow" | "deny",
  run: () => Promise<unknown>
) {
  let outcome: "allow" | "deny"
  let detail = ""
  try {
    await run()
    outcome = "allow"
  } catch (error) {
    outcome = "deny"
    detail = error instanceof Error ? error.message.slice(0, 60) : ""
  }

  const ok = outcome === expected
  console.log(
    `  ${ok ? "✓" : "✗"} ${label} — ${outcome}${ok ? "" : ` (expected ${expected}) ${detail}`}`
  )
  if (ok) passed += 1
  else failed += 1
}

function need(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing env var ${name}`)
  return value
}

async function main() {
  const app: FirebaseApp = initializeApp(firebaseConfig, "rules-live")
  const auth: Auth = getAuth(app)
  const db: Firestore = getFirestore(app)

  console.log(`\nDeployed rules — project ${firebaseConfig.projectId}\n`)

  // ------------------------------------------------------------ anonymous
  console.log("Anonymous (no sign-in)")
  await check("read a station document", "deny", () =>
    getDoc(doc(db, `stations/${BAKU_1}`))
  )
  await check("list a station's employees", "deny", () =>
    getDocs(collection(db, `stations/${BAKU_1}/employees`))
  )
  await check("list a station's sales", "deny", () =>
    getDocs(collection(db, `stations/${BAKU_1}/sales`))
  )
  await check("read import metadata", "deny", () =>
    getDoc(doc(db, "meta/import"))
  )

  // ---------------------------------------------------------- staff role
  await signInWithEmailAndPassword(
    auth,
    need("RULES_STAFF_EMAIL"),
    need("RULES_STAFF_PASSWORD")
  )
  console.log("\nStaff, pinned to Baku Station 1")
  await check("list own station's employees", "allow", () =>
    getDocs(collection(db, `stations/${BAKU_1}/employees`))
  )
  await check("list own station's sales", "allow", () =>
    getDocs(collection(db, `stations/${BAKU_1}/sales`))
  )
  await check("list ANOTHER station's employees", "deny", () =>
    getDocs(collection(db, `stations/${GANJA}/employees`))
  )
  await check("read ANOTHER station's document", "deny", () =>
    getDoc(doc(db, `stations/${GANJA}`))
  )
  await check("read import metadata", "deny", () =>
    getDoc(doc(db, "meta/import"))
  )
  await check("write a forged sale", "deny", () =>
    setDoc(doc(db, `stations/${BAKU_1}/sales/forged`), { amount: 999999 })
  )
  await check("write to own user profile", "deny", () =>
    setDoc(doc(db, `users/${auth.currentUser!.uid}`), { role: "admin" })
  )
  await signOut(auth)

  // ---------------------------------------------------------- admin role
  await signInWithEmailAndPassword(
    auth,
    need("RULES_ADMIN_EMAIL"),
    need("RULES_ADMIN_PASSWORD")
  )
  console.log("\nAdmin")
  await check("list any station's sales", "allow", () =>
    getDocs(collection(db, `stations/${GANJA}/sales`))
  )
  await check("read import metadata", "allow", () =>
    getDoc(doc(db, "meta/import"))
  )
  await check("write a forged sale", "deny", () =>
    setDoc(doc(db, `stations/${GANJA}/sales/forged`), { amount: 999999 })
  )
  await signOut(auth)

  await deleteApp(app)

  console.log(`\n${passed} passed, ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

main().catch((error) => {
  console.error("\nFailed:", error instanceof Error ? error.message : error)
  process.exit(1)
})
