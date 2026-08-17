"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  IconAlertTriangle,
  IconDeviceTv,
  IconUsers,
} from "@tabler/icons-react"

import { useT } from "@/components/i18n-provider"
import { SocarLogo } from "@/components/socar-logo"
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
 * One section, three pages — the whole core: the alert log, the workers
 * (presence + sales), and the wall board for a security-office screen.
 */
const SECTIONS = [
  {
    label: "sectionIntegrity",
    items: [
      { key: "alerts", href: "/alerts", icon: IconAlertTriangle },
      { key: "workers", href: "/workers", icon: IconUsers },
      { key: "wall", href: "/wall", icon: IconDeviceTv },
    ],
  },
] as const

export function AppSidebar({
  alertCount,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  alertCount: number
}) {
  const pathname = usePathname()
  const t = useT()

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            {/* No bordered tile behind the mark: the flame is already the
                left third of the wordmark, so boxing a second copy of it
                beside the first read as two logos fighting.

                The sizes carry `!` because SidebarMenuButton sets
                `[&_svg]:size-4` on every descendant svg — an element+class
                selector that out-specifies a plain `h-5 w-auto`, which was
                squashing a 504x119 wordmark into a 16x16 square. */}
            <SidebarMenuButton
              size="lg"
              tooltip={t.brand.name}
              render={<Link href="/alerts" />}
              className="h-auto! gap-2.5 py-2.5 hover:bg-transparent active:bg-transparent group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center"
            >
              {/* Collapsed rail: the flame alone, all that fits. */}
              <SocarLogo
                mark
                className="hidden h-7! shrink-0 group-data-[collapsible=icon]:block"
              />
              {/* Expanded: the real wordmark, lettering on `currentColor` so
                  it is white on the dark theme and dark on the light one. */}
              {/* `items-start` so the wordmark hugs the left edge instead of
                  stretching across the column. */}
              <div className="flex min-w-0 flex-1 flex-col items-start gap-1 group-data-[collapsible=icon]:hidden">
                <SocarLogo className="h-8!" />
                <span className="truncate text-[11px] text-muted-foreground">
                  {t.brand.tagline}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {SECTIONS.map((section) => {
          const items = section.items

          return (
            <SidebarGroup key={section.label}>
              <SidebarGroupLabel>{t.nav[section.label]}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const isActive = pathname.startsWith(item.href)

                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          tooltip={t.nav[item.key]}
                          isActive={isActive}
                          render={
                            item.href === "/wall" ? (
                              // The board fills the screen and has no way back;
                              // it opens in its own window so the app is still
                              // there when you are done with it.
                              <Link
                                href={item.href}
                                target="_blank"
                                rel="noopener noreferrer"
                              />
                            ) : (
                              <Link href={item.href} />
                            )
                          }
                        >
                          <item.icon />
                          <span>{t.nav[item.key]}</span>
                        </SidebarMenuButton>
                        {item.href === "/alerts" && alertCount > 0 ? (
                          // Readable without parsing nested markup — the
                          // count is a fact worth being able to check.
                          <SidebarMenuBadge data-alert-count={alertCount}>
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

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent className="group-data-[collapsible=icon]:hidden">
            {/* Above the status line, and quieter than it: a credit should be
                findable, not competing with whether the system is up. */}
            <a
              href="https://www.linkedin.com/in/nihat-shikhizada-6062a8333/"
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl px-3 pt-2 text-[11px] text-muted-foreground/70 transition-colors hover:text-foreground"
            >
              {t.credit.developedBy}{" "}
              <span className="font-medium underline-offset-2 hover:underline">
                {t.credit.author}
              </span>
            </a>
            <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-muted-foreground">
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
