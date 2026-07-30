/**
 * Provision the full test workforce as real Firebase Auth accounts:
 *
 *   - 8  station managers  (role: manager, pinned to their station)
 *   - 64 workers           (role: staff,   pinned to their station,
 *                           linked to their roster row via employeeId claim)
 *
 * The existing admin account is left untouched — it already exists.
 *
 *   npm run seed-users
 *
 * Credentials are written to ./test-accounts.csv (gitignored — it contains
 * passwords). Idempotent: existing accounts get their password reset and
 * claims refreshed rather than erroring.
 */
import { randomBytes } from "node:crypto"
import { writeFileSync } from "node:fs"

import { adminAuth, adminDb, usingEmulators } from "@/lib/firebase/admin"
import { COLLECTIONS, stationId } from "@/lib/firebase/schema"
import { emailFor, generateManagers, generateWorkers } from "@/lib/testdata"
import { Timestamp } from "firebase-admin/firestore"

type Account = {
  role: "manager" | "staff"
  name: string
  email: string
  password: string
  station: string
  employeeId: number | null
}

/** Memorable-but-strong: Sasis-<random>-<random>! (16+ chars). */
function generatePassword(): string {
  const token = randomBytes(9).toString("base64url").replace(/[-_]/g, "x")
  return `Sasis-${token}!`
}

async function upsert(account: Account) {
  const auth = adminAuth()

  const user = await auth
    .getUserByEmail(account.email)
    .then(async (existing) => {
      await auth.updateUser(existing.uid, {
        password: account.password,
        displayName: account.name,
      })
      return existing
    })
    .catch(async (error: { code?: string }) => {
      if (error.code !== "auth/user-not-found") throw error
      return auth.createUser({
        email: account.email,
        password: account.password,
        displayName: account.name,
        emailVerified: true,
      })
    })

  await auth.setCustomUserClaims(user.uid, {
    role: account.role,
    station: account.station,
    stationId: stationId(account.station),
    ...(account.employeeId !== null ? { employeeId: account.employeeId } : {}),
  })

  await adminDb().collection(COLLECTIONS.users).doc(user.uid).set(
    {
      email: account.email,
      displayName: account.name,
      role: account.role,
      station: account.station,
      employeeId: account.employeeId,
      createdAt: Timestamp.now(),
    },
    { merge: true }
  )

  // Claims only apply on the next token; kill any existing sessions.
  await auth.revokeRefreshTokens(user.uid)
}

async function main() {
  console.log(
    `Provisioning accounts on ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}` +
      `${usingEmulators ? " (emulators)" : ""}…`
  )

  const accounts: Account[] = []

  for (const manager of generateManagers()) {
    accounts.push({
      role: "manager",
      name: manager.name,
      email: emailFor(manager.name),
      password: generatePassword(),
      station: manager.station,
      employeeId: null,
    })
  }

  for (const worker of generateWorkers()) {
    accounts.push({
      role: "staff",
      name: worker.name,
      email: emailFor(worker.name),
      password: generatePassword(),
      station: worker.station,
      employeeId: worker.employeeId,
    })
  }

  // Guard against generator name collisions producing duplicate emails.
  const emails = new Set<string>()
  for (const account of accounts) {
    if (emails.has(account.email)) {
      throw new Error(`Duplicate generated email: ${account.email}`)
    }
    emails.add(account.email)
  }

  let done = 0
  for (const account of accounts) {
    await upsert(account)
    done += 1
    if (done % 10 === 0 || done === accounts.length) {
      console.log(`  ${done}/${accounts.length}`)
    }
  }

  const csv = [
    "role,name,email,password,station",
    ...accounts.map(
      (a) => `${a.role},${a.name},${a.email},${a.password},"${a.station}"`
    ),
  ].join("\n")
  writeFileSync("test-accounts.csv", csv, "utf8")

  const managers = accounts.filter((a) => a.role === "manager")
  console.log(`\nDone: ${managers.length} managers + ${accounts.length - managers.length} workers.`)
  console.log("Credentials written to test-accounts.csv (gitignored).")
  console.log("\nStation managers:")
  for (const m of managers) {
    console.log(`  ${m.station.padEnd(26)} ${m.email}`)
  }
}

main().catch((error) => {
  console.error("\nFailed:", error instanceof Error ? error.message : error)
  process.exit(1)
})
