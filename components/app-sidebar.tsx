"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  IconAlertTriangle,
  IconCalendarStats,
  IconChartHistogram,
  IconDeviceTv,
  IconFileText,
  IconFolders,
  IconBuildingStore,
  IconGasStation,
  IconLayoutDashboard,
  IconSettings,
  IconTrophy,
  IconUsers,
} from "@tabler/icons-react"

import { useT } from "@/components/i18n-provider"
import { Badge } from "@/components/ui/badge"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

/**
 * Navigation grouped by the question each page answers, rather than one flat
 * list of nine links. A chief executive should be able to find "is anything
 * wrong" without reading every label to work out which page holds it.
 */
const SECTIONS = [
  {
    label: "sectionOverview",
    items: [
      { key: "dashboard", href: "/", icon: IconLayoutDashboard },
      { key: "breakdown", href: "/breakdown", icon: IconChartHistogram },
      { key: "boardPack", href: "/board-pack", icon: IconFileText },
      { key: "wall", href: "/wall", icon: IconDeviceTv },
    ],
  },
  {
    label: "sectionPeople",
    items: [
      { key: "operators", href: "/operators", icon: IconUsers },
      { key: "leaderboard", href: "/leaderboard", icon: IconTrophy },
    ],
  },
  {
    label: "sectionSites",
    items: [
      { key: "stations", href: "/stations", icon: IconBuildingStore },
      { key: "staffing", href: "/staffing", icon: IconCalendarStats },
    ],
  },
  {
    label: "sectionIntegrity",
    items: [
      { key: "alerts", href: "/alerts", icon: IconAlertTriangle },
      { key: "cases", href: "/cases", icon: IconFolders },
    ],
  },
] as const

export function AppSidebar({
  alertCount,
  isAdmin = false,
  canSeeCases = false,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  alertCount: number
  isAdmin?: boolean
  /** Operators never see the case queue — it names their colleagues. */
  canSeeCases?: boolean
}) {
  const pathname = usePathname()
  const t = useT()

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip={t.brand.name}
              render={<Link href="/" />}
            >
              <span className="btn-3d flex aspect-square size-8 items-center justify-center rounded-xl border">
                <IconGasStation className="size-4" />
              </span>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-semibold tracking-tight">
                  {t.brand.name}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {t.brand.tagline}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {SECTIONS.map((section) => {
          // Hidden rather than merely disabled: an operator has no business
          // knowing a case queue exists, let alone that it is one click away.
          // Both are gated on the same predicate: an operator has no business
          // knowing a case queue exists, and no reason to put a network board
          // on a wall.
          const items = section.items.filter(
            (item) =>
              (item.href !== "/cases" && item.href !== "/wall") || canSeeCases
          )
          if (items.length === 0) return null

          return (
            <SidebarGroup key={section.label}>
              <SidebarGroupLabel>{t.nav[section.label]}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const isActive =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname.startsWith(item.href)

                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          tooltip={t.nav[item.key]}
                          isActive={isActive}
                          render={<Link href={item.href} />}
                        >
                          <item.icon />
                          <span>{t.nav[item.key]}</span>
                        </SidebarMenuButton>
                        {item.href === "/alerts" && alertCount > 0 ? (
                          <SidebarMenuBadge>
                            <Badge variant="destructive">{alertCount}</Badge>
                          </SidebarMenuBadge>
                        ) : null}
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}

        {isAdmin ? (
          <SidebarGroup>
            <SidebarGroupLabel>{t.nav.sectionAdmin}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={t.nav.settings}
                    isActive={pathname.startsWith("/settings")}
                    render={<Link href="/settings" />}
                  >
                    <IconSettings />
                    <span>{t.nav.settings}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500/70" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              {t.brand.systemOnline} · v1.0
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
