"use client"

import { getApp, getApps, initializeApp } from "firebase/app"
import {
  browserSessionPersistence,
  connectAuthEmulator,
  getAuth,
  setPersistence,
  type Auth,
} from "firebase/auth"

import { authEmulatorHost, firebaseConfig } from "@/lib/firebase/config"

let cachedAuth: Auth | null = null

/**
 * Browser Auth instance. Used only to exchange an email/password for an ID
 * token, which is immediately traded for an httpOnly session cookie — the token
 * is never persisted to localStorage, so an XSS payload cannot lift a
 * long-lived credential out of the page.
 */
export function getFirebaseAuth(): Auth {
  if (cachedAuth) return cachedAuth

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
  const auth = getAuth(app)

  if (authEmulatorHost) {
    connectAuthEmulator(auth, `http://${authEmulatorHost}`, {
      disableWarnings: true,
    })
  }

  // In-tab only; the server session cookie is the source of truth.
  void setPersistence(auth, browserSessionPersistence)

  cachedAuth = auth
  return auth
}
