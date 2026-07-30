"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { IconCheck, IconLanguage } from "@tabler/icons-react"

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
import { LOCALES, type Locale } from "@/lib/i18n"

const SHORT: Record<Locale, string> = { az: "AZ", ru: "RU", en: "EN" }

export function LanguageSwitcher() {
  const { locale, t } = useI18n()
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()

  function choose(next: Locale) {
    if (next === locale) return
    startTransition(async () => {
      await fetch("/api/language", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      })
      // Every page is server-rendered, so re-fetch rather than reload.
      router.refresh()
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 px-2"
            aria-label={t.languages.switch}
            disabled={pending}
          />
        }
      >
        <IconLanguage className="size-4" />
        <span className="font-medium">{SHORT[locale]}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t.languages.switch}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {LOCALES.map((code) => (
            <DropdownMenuItem key={code} onClick={() => choose(code)}>
              {code === locale ? (
                <IconCheck />
              ) : (
                <span className="size-4" aria-hidden />
              )}
              {t.languages[code]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
