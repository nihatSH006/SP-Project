"use client"

import { IconPrinter } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { useT } from "@/components/i18n-provider"

/**
 * Hands the pack to the browser's print dialog, which also saves it as a PDF.
 *
 * One button, because there is only one thing here: a browser cannot write a
 * file to disk from a page, so a second "download" button would open this same
 * dialog and promise something it does not do. The dialog's own destination
 * picker is where PDF-versus-paper is chosen, and it produces a real,
 * text-selectable PDF from the print stylesheet.
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
