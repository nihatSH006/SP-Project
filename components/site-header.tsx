"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  IconAlertTriangle,
  IconBuildingStore,
  IconCommand,
  IconLayoutDashboard,
  IconLogout,
  IconSearch,
  IconTrophy,
  IconUserCircle,
  IconUsers,
} from "@tabler/icons-react"

import { useT } from "@/components/i18n-provider"
import { LanguageSwitcher } from "@/components/language-switcher"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { SidebarTrigger } from "@/components/ui/sidebar"

const PAGES = [
  { key: "dashboard", href: "/", icon: IconLayoutDashboard },
  { key: "operators", href: "/operators", icon: IconUsers },
  { key: "leaderboard", href: "/leaderboard", icon: IconTrophy },
  { key: "stations", href: "/stations", icon: IconBuildingStore },
  { key: "alerts", href: "/alerts", icon: IconAlertTriangle },
] as const

export type PaletteOperator = { id: number; name: string; station: string }

export type HeaderUser = {
  name: string
  email: string | null
  role: string
  station: string | null
}

export function SiteHeader({
  operators,
  user,
}: {
  operators: PaletteOperator[]
  user: HeaderUser | null
}) {
  const router = useRouter()
  const t = useT()
  const [open, setOpen] = React.useState(false)
  const [signingOut, setSigningOut] = React.useState(false)

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  const go = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  async function signOut() {
    setSigningOut(true)
    // Clears the httpOnly cookie and revokes the refresh token server-side, so
    // any other open session for this account dies too.
    await fetch("/api/auth/session", { method: "DELETE" })
    router.replace("/login")
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl">
      <SidebarTrigger className="-ml-1" />
      <div className="ml-auto flex items-center gap-2">
        <InputGroup
          className="hidden w-64 lg:flex"
          onClick={() => setOpen(true)}
        >
          <InputGroupAddon>
            <IconSearch />
          </InputGroupAddon>
          <InputGroupInput
            readOnly
            placeholder={t.search.placeholder}
            className="cursor-pointer"
          />
          <InputGroupAddon align="inline-end">
            <KbdGroup>
              <Kbd>
                <IconCommand className="size-3" />
              </Kbd>
              <Kbd>K</Kbd>
            </KbdGroup>
          </InputGroupAddon>
        </InputGroup>

        <LanguageSwitcher />

        {user ? (
          <>
            <Separator orientation="vertical" className="mx-1 h-5" />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 px-1.5"
                    aria-label={t.auth.account}
                  />
                }
              >
                <Avatar size="sm" className="rounded-lg">
                  <AvatarFallback className="rounded-lg text-[11px]">
                    {initialsFor(user.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-32 truncate sm:inline">
                  {user.name}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-60">
                {/* Base UI's GroupLabel requires a Group ancestor — it reads
                    MenuGroupContext to wire up aria-labelledby. */}
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="flex flex-col gap-1 py-2 text-sm text-foreground">
                    <span className="font-medium">{user.name}</span>
                    {user.email ? (
                      <span className="text-xs font-normal text-muted-foreground">
                        {user.email}
                      </span>
                    ) : null}
                    <span className="mt-1 flex flex-wrap gap-1.5">
                      <Badge variant="secondary" className="capitalize">
                        {user.role}
                      </Badge>
                      {user.station ? (
                        <Badge variant="outline">{user.station}</Badge>
                      ) : (
                        <Badge variant="outline">{t.auth.allStations}</Badge>
                      )}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled>
                    <IconUserCircle />
                    Profile
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={signingOut}
                  onClick={(event) => {
                    // Keep the menu open while the request is in flight.
                    event.preventDefault()
                    void signOut()
                  }}
                >
                  {signingOut ? <Spinner /> : <IconLogout />}
                  {signingOut ? t.auth.signingOut : t.auth.signOut}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : null}
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command>
          <CommandInput placeholder={t.search.dialogPlaceholder} />
          <CommandList>
            <CommandEmpty>{t.search.noResults}</CommandEmpty>
            <CommandGroup heading={t.search.pages}>
              {PAGES.map((page) => (
                <CommandItem
                  key={page.href}
                  value={t.nav[page.key]}
                  onSelect={() => go(page.href)}
                >
                  <page.icon />
                  {t.nav[page.key]}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading={t.search.operators}>
              {operators.map((operator) => (
                <CommandItem
                  key={operator.id}
                  value={`${operator.name} ${operator.station}`}
                  onSelect={() => go(`/operators/${operator.id}`)}
                >
                  <IconUsers />
                  {operator.name}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {operator.station}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </header>
  )
}

/** "Kamran Musayev" -> "KM"; falls back to the first character. */
function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
