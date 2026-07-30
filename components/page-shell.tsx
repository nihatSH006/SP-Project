import type * as React from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { FilterBar } from "@/components/filter-bar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { collectAlerts } from "@/lib/analytics"
import { getSessionUser } from "@/lib/auth"
import { getOperatorReports, type FilterOptions } from "@/lib/data"

/**
 * Shared chrome: sidebar, header, optional filter bar, page heading. Every
 * route renders its body inside this so the scope controls stay in one place.
 */
export async function PageShell({
  title,
  description,
  actions,
  options = null,
  children,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  /** Pass the options from `getSlice` to show the filter bar; omit to hide it. */
  options?: FilterOptions | null
  children: React.ReactNode
}) {
  // Sidebar badge + command palette always reflect the LATEST day, regardless
  // of which historical day the page itself is showing.
  const [user, latestReports] = await Promise.all([
    getSessionUser(),
    getOperatorReports(),
  ])

  const alertCount = collectAlerts(latestReports).length
  const operators = latestReports.map((r) => ({
    id: r.id,
    name: r.name,
    station: r.station,
  }))

  return (
    <SidebarProvider>
      <AppSidebar alertCount={alertCount} isAdmin={user?.role === "admin"} />
      <SidebarInset className="overflow-hidden ring-1 ring-border/60">
        {/* Account lives in the header, not as a sidebar banner. */}
        <SiteHeader
          operators={operators}
          user={
            user
              ? {
                  name: user.name ?? user.email ?? "Signed in",
                  email: user.email,
                  role: user.role,
                  station: user.station,
                }
              : null
          }
        />

        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">
                {title}
              </h1>
              {description ? (
                <p className="max-w-2xl text-muted-foreground text-pretty">
                  {description}
                </p>
              ) : null}
            </div>
            {actions}
          </div>

          {options ? <FilterBar options={options} /> : null}

          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
