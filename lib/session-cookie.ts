/**
 * Session-cookie constants, deliberately in their own module with no imports.
 *
 * `proxy.ts` runs in the Edge runtime and needs the cookie name, but it must not
 * pull in `firebase-admin` — that package is Node-only and cannot be bundled for
 * Edge. Keeping these values isolated is what stops an innocent-looking
 * `import { SESSION_COOKIE } from "@/lib/auth"` from dragging the whole Admin
 * SDK into the Edge bundle.
 */

export const SESSION_COOKIE = "sasis_session"

/** Firebase allows up to 14 days; one shift is the right blast radius here. */
export const SESSION_MAX_AGE_MS = 60 * 60 * 8 * 1000
