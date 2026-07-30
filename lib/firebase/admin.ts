import "server-only"

import { cert, getApps, initializeApp, type App } from "firebase-admin/app"
import { getAuth, type Auth } from "firebase-admin/auth"
import { getFirestore, type Firestore } from "firebase-admin/firestore"

const APP_NAME = "sasis-admin"

/**
 * Admin credentials, in the order we prefer them:
 *  1. FIREBASE_SERVICE_ACCOUNT — the whole JSON key, for hosts that only offer
 *     env vars.
 *  2. GOOGLE_APPLICATION_CREDENTIALS / workload identity — picked up
 *     automatically by applicationDefault() on Google infrastructure.
 *  3. Emulators — no credential needed at all.
 */
function createApp(): App {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

  if (!projectId) {
    throw new Error(
      "Firebase project id missing. Set NEXT_PUBLIC_FIREBASE_PROJECT_ID (see .env.example)."
    )
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (raw) {
    const parsed = JSON.parse(raw) as {
      project_id: string
      client_email: string
      private_key: string
    }
    return initializeApp(
      {
        credential: cert({
          projectId: parsed.project_id,
          clientEmail: parsed.client_email,
          // Env vars flatten newlines; the PEM parser needs them back.
          privateKey: parsed.private_key.replace(/\\n/g, "\n"),
        }),
        projectId,
      },
      APP_NAME
    )
  }

  // Emulators and ADC both work without an explicit credential.
  return initializeApp({ projectId }, APP_NAME)
}

function adminApp(): App {
  const existing = getApps().find((app) => app.name === APP_NAME)
  return existing ?? createApp()
}

export function adminAuth(): Auth {
  return getAuth(adminApp())
}

/**
 * No `db.settings()` call here on purpose. `settings()` may only run once per
 * Firestore instance, but a module-scoped "already configured" flag is reset by
 * HMR while `getFirestore()` keeps returning the same cached instance — so the
 * second render throws "Firestore has already been initialized". Nothing in this
 * codebase writes `undefined`, so the setting bought nothing.
 */
export function adminDb(): Firestore {
  return getFirestore(adminApp())
}

export const usingEmulators = Boolean(
  process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST
)
