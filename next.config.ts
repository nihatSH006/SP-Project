import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Keep the Admin SDK out of the bundle. It is a Node-only package with native
   * dependencies, and on Windows Turbopack fails trying to junction-point it
   * into `.next/dev/node_modules` ("failed to create junction point … os error
   * 80"). Marking it external skips that path entirely, and is the right call
   * regardless — it must never be bundled for the browser or the Edge runtime.
   */
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
