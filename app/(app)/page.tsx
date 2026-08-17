import { redirect } from "next/navigation"

/**
 * This app IS the alert center — the root only forwards to it. The sales /
 * workforce dashboard lives in the primary SASIS app; keeping a landing page
 * here would just duplicate one of the two.
 */
export default function Home() {
  redirect("/alerts")
}
