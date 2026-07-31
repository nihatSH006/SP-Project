"use client"

import { IconPrinter } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { useT } from "@/components/i18n-provider"

/**
 * Hands the page to the browser's own print dialogue, which every desktop
 * browser can save as a PDF.
 *
 * Deliberately not a server-rendered PDF: that would mean shipping a headless
 * browser into production to reproduce a layout the app can already draw. The
 * print stylesheet does the work instead, and the output honours the reader's
 * own paper size and language.
 */
export function PrintButton() {
  const t = useT()
  return (
    <Button className="btn-3d print:hidden" onClick={() => window.print()}>
      <IconPrinter className="size-4" />
      {t.boardPack.print}
    </Button>
  )
}
