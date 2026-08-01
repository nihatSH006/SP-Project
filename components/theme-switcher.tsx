"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import {
  IconCheck,
  IconDeviceDesktop,
  IconMoon,
  IconSun,
} from "@tabler/icons-react"

import { useI18n } from "@/components/i18n-provider"
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

const OPTIONS = [
  { value: "light", icon: IconSun },
  { value: "dark", icon: IconMoon },
  { value: "system", icon: IconDeviceDesktop },
] as const

type ThemeChoice = (typeof OPTIONS)[number]["value"]

/** The store never emits; only the server/client snapshot pair matters. */
const NEVER_CHANGES = () => () => {}

/**
 * Light / dark / follow-the-system, beside the language picker.
 *
 * The trigger shows the theme in EFFECT, not the one stored: "system" is a
 * rule, and an icon of a monitor tells you nothing about what you are looking
 * at. Which theme that resolves to is only knowable in the browser, so the
 * trigger renders the stored preference's icon until mount and swaps after —
 * without `mounted` the server's guess and the client's reading disagree and
 * React throws a hydration error on every page.
 */
export function ThemeSwitcher() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const { t } = useI18n()
  // "Has this rendered in a browser yet?" is a fact about the environment,
  // not React state — `useSyncExternalStore` answers it without a setState in
  // an effect, which cascades a second render on every mount.
  const mounted = React.useSyncExternalStore(
    NEVER_CHANGES,
    () => true,
    () => false
  )

  const current = (theme ?? "system") as ThemeChoice
  const showing = mounted ? (resolvedTheme ?? "dark") : "dark"
  const TriggerIcon = showing === "light" ? IconSun : IconMoon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t.theme.switch}
          />
        }
      >
        <TriggerIcon className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t.theme.switch}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {OPTIONS.map(({ value, icon: Icon }) => (
            <DropdownMenuItem key={value} onClick={() => setTheme(value)}>
              {mounted && value === current ? (
                <IconCheck />
              ) : (
                <span className="size-4" aria-hidden />
              )}
              <Icon className="size-4 text-muted-foreground" />
              {t.theme[value]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
