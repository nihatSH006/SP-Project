import Link from "next/link"
import { IconArrowUpRight, IconDeviceTv } from "@tabler/icons-react"

import type { Dictionary } from "@/lib/i18n"

/**
 * Launches the office screen from the overview.
 *
 * Deliberately a wide, quiet row rather than another button in the header:
 * this is something someone does once, on a TV, so it should be findable
 * without hunting and invisible the rest of the time. An earlier version used
 * a blue gradient fill, which made a once-a-month action the brightest thing
 * on a page whose job is to show revenue.
 */
export function WallLauncher({ t }: { t: Dictionary }) {
  return (
    <Link
      href="/wall"
      // A new window is the point: you drag it onto the second screen and
      // full-screen it there, while the dashboard stays on the main monitor.
      // It also matters because the board has no back button — opening it in
      // place would leave nothing to click to get out of.
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.04]"
    >
      <span className="flex items-center gap-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <IconDeviceTv className="size-5" />
        </span>
        <span className="flex flex-col">
          <span className="font-semibold">{t.wall.open}</span>
          <span className="text-sm text-muted-foreground">
            {t.wall.launchHint}
          </span>
        </span>
      </span>
      <IconArrowUpRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
    </Link>
  )
}
