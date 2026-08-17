import { redirect } from "next/navigation"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { getSessionUser } from "@/lib/auth"
import { getTotalAlerts, getWorkerDays } from "@/lib/data"
import { stationId } from "@/lib/firebase/schema"

/**
 * Authoritative auth boundary AND the persistent chrome for every signed-in
 * route. `proxy.ts` only checks that a cookie exists; this is where the
 * cookie is actually verified — signature, expiry, revocation and role
 * claim — on every request. Because it wraps the whole route group, a new
 * page added under `app/(app)/` is protected without anyone opting in.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSessionUser()

  if (!user) {
    redirect("/login")
  }

  // Every alert on record, not just the latest day's — a badge that resets
  // each morning tells nobody how much is outstanding.
  const alertCount = await getTotalAlerts()

  // Command palette: the latest day's workers, already station-scoped.
  const latest = await getWorkerDays()
  const workers = latest.map((r) => ({
    userid: r.userid,
    name: r.adSoyad,
    station: r.station,
    href: `/workers/${r.userid}?date=${r.date}&st=${stationId(r.station)}`,
  }))

  return (
    <SidebarProvider>
      <AppSidebar alertCount={alertCount} />
      <SidebarInset className="overflow-hidden ring-1 ring-border/60">
        <SiteHeader
          workers={workers}
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
