import Link from "next/link"
import { IconArrowUpRight, IconDeviceTv } from "@tabler/icons-react"

import type { Dictionary } from "@/lib/i18n"

/**
 * Launches the office screen from the overview.
 *
 * Deliberately a wide banner rather than another button in the header row:
 * this is something someone does once, on a TV, and it should be findable
 * without hunting — but it must not compete with the revenue figure, which is
 * why it sits below the fold-line content rather than beside it.
 */
export function WallLauncher({ t }: { t: Dictionary }) {
  return (
    <Link
      href="/wall"
      className="group relative flex items-center justify-between gap-4 overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/[0.14] via-primary/[0.06] to-transparent px-5 py-4 transition-colors hover:border-primary/45 hover:from-primary/[0.2]"
    >
      <span className="flex items-center gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25 transition-transform group-hover:scale-105">
          <IconDeviceTv className="size-6" />
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
