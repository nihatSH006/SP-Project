/**
 * Web SDK config. These values are public by design — Firebase identifies the
 * project with them, it does not authenticate with them. Access is gated by
 * Auth + the rules in `firestore.rules`, never by keeping this secret.
 */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
}

/** Point the client SDK at the local Auth emulator instead of Google. */
export const authEmulatorHost =
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || null

export const usingEmulators = Boolean(authEmulatorHost)
