import { redirect } from "next/navigation"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { canCompareStations, getSessionUser } from "@/lib/auth"
import { canTriageCase } from "@/lib/cases"
import { getOperatorReports, getTotalAlerts } from "@/lib/data"

/**
 * Authoritative auth boundary AND the persistent chrome for every signed-in
 * route.
 *
 * `proxy.ts` only checks that a cookie exists; this is where the cookie is
 * actually verified — signature, expiry, revocation and role claim — on every
 * request. Because it wraps the whole route group, a new page added under
 * `app/(app)/` is protected without anyone remembering to opt in.
 *
 * The sidebar and header live HERE rather than inside each page on purpose.
 * A layout is preserved across client-side navigation: it does not re-render,
 * and its data is not re-fetched, when you move between its children. While
 * this chrome sat inside `PageShell`, every navigation re-read the sidebar's
 * alert count and the command-palette roster before anything could paint — so
 * a click appeared to hang, then jump. Now the shell stays put and only the
 * body swaps, behind the boundary in `loading.tsx`.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSessionUser()

  if (!user) {
    // The cookie was missing, forged, expired, revoked, or carried no role.
    redirect("/login")
  }

  // Sidebar badge + command palette always reflect the LATEST day, regardless
  // of which historical day the page itself is showing.
  const latestReports = await getOperatorReports()
  // Every alert on record, not just the latest day's — a badge that resets
  // each morning tells nobody how much is outstanding.
  const alertCount = await getTotalAlerts()
  const multiStation = await canCompareStations()
  const operators = latestReports.map((r) => ({
    id: r.id,
    name: r.name,
    station: r.station,
  }))

  return (
    <SidebarProvider>
      <AppSidebar
        alertCount={alertCount}
        isAdmin={user.role === "admin"}
        canSeeCases={canTriageCase(user)}
        canCompareStations={multiStation}
      />
      <SidebarInset className="overflow-hidden ring-1 ring-border/60">
        {/* Account lives in the header, not as a sidebar banner. */}
        <SiteHeader
          operators={operators}
          user={{
            name: user.name ?? user.email ?? "Signed in",
            email: user.email,
            role: user.role,
            station: user.station,
          }}
        />
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
