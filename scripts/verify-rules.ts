/**
 * Security-rules test suite. Runs against the Firestore emulator:
 *
 *   npm run rules:test
 *
 * These assertions are the actual specification of who can read what. If a rule
 * is loosened by accident, this fails rather than silently exposing data.
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing"
import { doc, getDoc, getDocs, collection, setDoc } from "firebase/firestore"
import { readFileSync } from "node:fs"

const PROJECT_ID = "socar-sasis"
const BAKU_1 = "baku-station-1"
const GANJA = "ganja-station"

let passed = 0
let failed = 0

async function check(label: string, run: () => Promise<unknown>) {
  try {
    await run()
    console.log(`  ✓ ${label}`)
    passed += 1
  } catch (error) {
    console.error(`  ✗ ${label}`)
    console.error(`      ${error instanceof Error ? error.message : error}`)
    failed += 1
  }
}

async function main() {
  const testEnv: RulesTestEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  })

  // Seed a little data with rules disabled.
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    await setDoc(doc(db, `stations/${BAKU_1}`), { name: "Baku Station 1" })
    await setDoc(doc(db, `stations/${GANJA}`), { name: "Ganja Station" })
    await setDoc(doc(db, `stations/${BAKU_1}/employees/1`), {
      employeeId: 1,
      name: "Ali",
      station: "Baku Station 1",
    })
    await setDoc(doc(db, `stations/${GANJA}/employees/4`), {
      employeeId: 4,
      name: "Kamran",
      station: "Ganja Station",
    })
    await setDoc(doc(db, `stations/${BAKU_1}/sales/s1`), {
      employeeId: 1,
      amount: 10,
      station: "Baku Station 1",
    })
    await setDoc(doc(db, "users/staff-uid"), { email: "s@socar.az" })
    await setDoc(doc(db, "meta/import"), { counts: {} })
  })

  const anon = testEnv.unauthenticatedContext().firestore()
  const noRole = testEnv.authenticatedContext("no-role-uid").firestore()
  const staff = testEnv
    .authenticatedContext("staff-uid", {
      role: "staff",
      station: "Baku Station 1",
    })
    .firestore()
  const supervisor = testEnv
    .authenticatedContext("sup-uid", { role: "supervisor" })
    .firestore()
  const admin = testEnv
    .authenticatedContext("admin-uid", { role: "admin" })
    .firestore()

  console.log("\nAnonymous")
  await check("cannot read a station", () =>
    assertFails(getDoc(doc(anon, `stations/${BAKU_1}`)))
  )
  await check("cannot read employees", () =>
    assertFails(getDocs(collection(anon, `stations/${BAKU_1}/employees`)))
  )
  await check("cannot read sales", () =>
    assertFails(getDocs(collection(anon, `stations/${BAKU_1}/sales`)))
  )

  console.log("\nSigned in, no role claim")
  await check("cannot read employees", () =>
    assertFails(getDocs(collection(noRole, `stations/${BAKU_1}/employees`)))
  )
  await check("can still read own profile", () =>
    assertSucceeds(getDoc(doc(noRole, "users/no-role-uid")))
  )

  console.log("\nStaff (Baku Station 1)")
  await check("reads own station's employees", () =>
    assertSucceeds(getDocs(collection(staff, `stations/${BAKU_1}/employees`)))
  )
  await check("reads own station's sales", () =>
    assertSucceeds(getDocs(collection(staff, `stations/${BAKU_1}/sales`)))
  )
  await check("CANNOT read another station's employees", () =>
    assertFails(getDocs(collection(staff, `stations/${GANJA}/employees`)))
  )
  await check("CANNOT read another station's document", () =>
    assertFails(getDoc(doc(staff, `stations/${GANJA}`)))
  )
  await check("CANNOT read another user's profile", () =>
    assertFails(getDoc(doc(staff, "users/admin-uid")))
  )
  await check("CANNOT read import metadata", () =>
    assertFails(getDoc(doc(staff, "meta/import")))
  )
  await check("CANNOT write to sales", () =>
    assertFails(
      setDoc(doc(staff, `stations/${BAKU_1}/sales/forged`), { amount: 1 })
    )
  )

  console.log("\nSupervisor")
  await check("reads any station", () =>
    assertSucceeds(getDocs(collection(supervisor, `stations/${GANJA}/sales`)))
  )
  await check("CANNOT read import metadata", () =>
    assertFails(getDoc(doc(supervisor, "meta/import")))
  )
  await check("CANNOT write employees", () =>
    assertFails(
      setDoc(doc(supervisor, `stations/${GANJA}/employees/999`), { name: "x" })
    )
  )

  console.log("\nAdmin")
  await check("reads import metadata", () =>
    assertSucceeds(getDoc(doc(admin, "meta/import")))
  )
  await check("still CANNOT write from the client", () =>
    assertFails(setDoc(doc(admin, `stations/${GANJA}/sales/forged`), { a: 1 }))
  )

  await testEnv.cleanup()

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
