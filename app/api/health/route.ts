import { NextResponse } from "next/server"

/**
 * Deployment diagnostic.
 *
 * Reports whether the server can load the Admin SDK and which configuration
 * keys are present. It NEVER reports a value — only whether a name is set —
 * because this endpoint is reachable without signing in.
 *
 * Nothing here is imported at module scope on purpose: the whole point is to
 * survive an import that fails, and a static import of the Admin SDK would
 * take this route down with it.
 */
export const dynamic = "force-dynamic"

const CONFIG_KEYS = [
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "FIREBASE_SERVICE_ACCOUNT",
  "FIREBASE_PROJECT_ID",
  "GOOGLE_APPLICATION_CREDENTIALS",
]

function describe(error: unknown) {
  if (!(error instanceof Error)) return { message: String(error) }
  return {
    name: error.name,
    message: error.message,
    code: (error as NodeJS.ErrnoException).code ?? null,
    // First few frames only — enough to name the module that failed.
    frames: (error.stack ?? "").split("\n").slice(1, 5).map((l) => l.trim()),
  }
}

export async function GET() {
  const report: Record<string, unknown> = {
    runtime: process.env.NEXT_RUNTIME ?? "nodejs",
    node: process.version,
    vercel: Boolean(process.env.VERCEL),
    // Presence only. Never the value.
    config: Object.fromEntries(
      CONFIG_KEYS.map((key) => [key, Boolean(process.env[key])])
    ),
  }

  // 1. Can the Admin SDK even be required?
  try {
    await import("firebase-admin/app")
    report.canImportAdminSdk = true
  } catch (error) {
    report.canImportAdminSdk = false
    report.importError = describe(error)
    return NextResponse.json(report, { status: 200 })
  }

  // 2. Can our own wrapper initialise an app with the configured credentials?
  try {
    const { adminDb } = await import("@/lib/firebase/admin")
    adminDb()
    report.canInitialiseApp = true
  } catch (error) {
    report.canInitialiseApp = false
    report.initError = describe(error)
    return NextResponse.json(report, { status: 200 })
  }

  // 3. Can it actually reach Firestore with those credentials?
  try {
    const { adminDb } = await import("@/lib/firebase/admin")
    const snapshot = await adminDb().collection("settings").doc("global").get()
    report.canReadFirestore = true
    report.settingsDocExists = snapshot.exists
  } catch (error) {
    report.canReadFirestore = false
    report.firestoreError = describe(error)
  }

  return NextResponse.json(report, { status: 200 })
}
