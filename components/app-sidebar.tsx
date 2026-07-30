"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  IconAlertTriangle,
  IconBuildingStore,
  IconGasStation,
  IconLayoutDashboard,
  IconSettings,
  IconTrophy,
  IconUsers,
} from "@tabler/icons-react"

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

const nav = [
  { title: "Dashboard", href: "/", icon: IconLayoutDashboard },
  { title: "Operators", href: "/operators", icon: IconUsers },
  { title: "Leaderboard", href: "/leaderboard", icon: IconTrophy },
  { title: "Stations", href: "/stations", icon: IconBuildingStore },
  { title: "Alerts", href: "/alerts", icon: IconAlertTriangle },
]

export function AppSidebar({
  alertCount,
  isAdmin = false,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  alertCount: number
  isAdmin?: boolean
}) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip="SOCAR SASIS"
              render={<Link href="/" />}
            >
              <span className="btn-3d flex aspect-square size-8 items-center justify-center rounded-xl border">
                <IconGasStation className="size-4" />
              </span>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-semibold tracking-tight">
                  SOCAR SASIS
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  Sales &amp; Staff Intelligence
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Analysis</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href)

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={isActive}
                      render={<Link href={item.href} />}
                    >
                      <item.icon />
                      <span>{item.title}</span>
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

        {isAdmin ? (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="Settings"
                    isActive={pathname.startsWith("/settings")}
                    render={<Link href="/settings" />}
                  >
                    <IconSettings />
                    <span>Settings</span>
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
              System online · v1.0
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
