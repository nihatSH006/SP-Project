/**
 * Provision a SASIS account. Roles are custom claims, which only the Admin SDK
 * can set — that is deliberate: if roles lived in a Firestore document the
 * client could write, a user could grant themselves regional visibility.
 *
 *   npm run create-user -- --email a@socar.az --password '…' --role admin
 *   npm run create-user -- --email s@socar.az --password '…' --role staff \
 *     --station "Baku Station 1"
 *
 * Roles:
 *   admin       full access, including import metadata and settings
 *   supervisor  every station (regional)
 *   manager     head of ONE station, set with --station
 *   staff       one station, set with --station
 */
import { adminAuth, adminDb, usingEmulators } from "@/lib/firebase/admin"
import { COLLECTIONS, stationId } from "@/lib/firebase/schema"
import { Timestamp } from "firebase-admin/firestore"

type Role = "admin" | "supervisor" | "manager" | "staff"
const ROLES: Role[] = ["admin", "supervisor", "manager", "staff"]

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? undefined : process.argv[index + 1]
}

async function main() {
  const email = arg("email")
  const password = arg("password")
  const role = arg("role") as Role | undefined
  const station = arg("station") ?? null
  const displayName = arg("name") ?? email?.split("@")[0] ?? "SASIS user"

  if (!email || !password || !role) {
    throw new Error(
      "Usage: npm run create-user -- --email <email> --password <password> --role <admin|supervisor|manager|staff> [--station <name>] [--name <display name>]"
    )
  }
  if (!ROLES.includes(role)) {
    throw new Error(`Role must be one of: ${ROLES.join(", ")}`)
  }
  if ((role === "staff" || role === "manager") && !station) {
    throw new Error("--station is required for the staff and manager roles.")
  }
  // Firebase enforces 6; the extra length is the cheapest real hardening here.
  if (password.length < 12) {
    throw new Error("Use a password of at least 12 characters.")
  }

  const auth = adminAuth()

  const user = await auth
    .getUserByEmail(email)
    .then(async (existing) => {
      await auth.updateUser(existing.uid, { password, displayName })
      console.log(`Updated existing account ${email}`)
      return existing
    })
    .catch(async (error: { code?: string }) => {
      if (error.code !== "auth/user-not-found") throw error
      const created = await auth.createUser({
        email,
        password,
        displayName,
        emailVerified: true,
      })
      console.log(`Created ${email}`)
      return created
    })

  // Two station claims on purpose: `station` is the display name the UI shows,
  // `stationId` is the slug that firestore.rules compares against the document
  // path. Rules cannot slugify, so the id has to be minted here.
  await auth.setCustomUserClaims(user.uid, {
    role,
    ...(station ? { station, stationId: stationId(station) } : {}),
  })

  // Mirror into Firestore for display; the claims remain authoritative.
  await adminDb()
    .collection(COLLECTIONS.users)
    .doc(user.uid)
    .set(
      {
        email,
        displayName,
        role,
        station,
        createdAt: Timestamp.now(),
      },
      { merge: true }
    )

  // Claims only reach a client on its next token refresh; force it now so the
  // account cannot sign in during the window where it has no role.
  await auth.revokeRefreshTokens(user.uid)

  console.log(
    `  role: ${role}${station ? ` · station: ${station}` : ""}` +
      `${usingEmulators ? "  (emulator)" : ""}`
  )
}

main().catch((error) => {
  console.error("\nFailed:", error instanceof Error ? error.message : error)
  process.exit(1)
})
