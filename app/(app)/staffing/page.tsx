import {
  IconAlertTriangle,
  IconGauge,
  IconTrendingDown,
  IconTrendingUp,
  IconInfoCircle,
  IconMoonStars,
} from "@tabler/icons-react"

import { PageShell } from "@/components/page-shell"
import { StaffingHeatmap } from "@/components/staffing-heatmap"
import { MiniStat } from "@/components/mini-stat"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { getT } from "@/lib/i18n/server"
import { money } from "@/lib/format"
import { cn } from "@/lib/utils"
import { suggestions } from "@/lib/staffing"
import { getNetworkStaffing, getStaffingProfiles } from "@/lib/staffing-server"

export const metadata = { title: "Staffing" }

export default async function StaffingPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const t = await getT()
  const params = await props.searchParams
  const wanted = Array.isArray(params.station) ? params.station[0] : params.station
  const profiles = await getStaffingProfiles()
  const network = await getNetworkStaffing(profiles, t.staffing.networkLabel)

  if (profiles.length === 0) {
    return (
      <PageShell title={t.staffing.title} description={t.staffing.description}>
        <Empty className="py-10">
          <EmptyMedia variant="icon">
            <IconInfoCircle />
          </EmptyMedia>
          <EmptyTitle>{t.staffing.noData}</EmptyTitle>
        </Empty>
      </PageShell>
    )
  }

  const views = network ? [network, ...profiles] : profiles

  // Only the chosen station is rendered. Every station's grid is 168 cells, so
  // drawing all nine at once shipped ~1,500 cells of markup to display one —
  // the page was six times heavier than it needed to be, and the tabs were
  // switching between grids the browser had already paid for.
  const profile = views.find((p) => p.station === wanted) ?? views[0]
  const flagged = suggestions(profile)
  const weekday = (n: number) => t.staffing.weekdays[n]
  const clock = (h: number) => `${String(h).padStart(2, "0")}:00`

  return (
    <PageShell title={t.staffing.title} description={t.staffing.description}>
      <div className="flex flex-wrap gap-2">
        {views.map((view) => (
          <Button
            key={view.station}
            size="sm"
            variant={view.station === profile.station ? "default" : "outline"}
            nativeButton={false}
            render={
              <Link
                href={`/staffing?station=${encodeURIComponent(view.station)}`}
                scroll={false}
              />
            }
          >
            {view.station}
          </Button>
        ))}
      </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MiniStat
            icon={IconGauge}
            label={t.staffing.median}
            value={money(profile.median)}
            unit="₼/h"
          />
          <MiniStat
            icon={IconAlertTriangle}
            label={t.staffing.busiest}
            value={
              profile.busiestCell
                ? `${weekday(profile.busiestCell.weekday)} ${clock(profile.busiestCell.hour)}`
                : "—"
            }
          />
          <MiniStat
            icon={IconMoonStars}
            label={t.staffing.quietest}
            value={
              profile.quietestCell
                ? `${weekday(profile.quietestCell.weekday)} ${clock(profile.quietestCell.hour)}`
                : "—"
            }
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t.staffing.heatmap}</CardTitle>
            <CardAction>
              {/* A scale shows what the shading means in three words; the
                  paragraph it replaces took thirty. */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{t.staffing.legendLow}</span>
                <span className="flex gap-0.5">
                  {[12, 34, 56, 78, 100].map((step) => (
                    <span
                      key={step}
                      className="size-3 rounded-[3px]"
                      style={{
                        backgroundColor: `color-mix(in oklab, var(--color-primary) ${step}%, transparent)`,
                      }}
                    />
                  ))}
                </span>
                <span>{t.staffing.legendHigh}</span>
              </div>
            </CardAction>
          </CardHeader>
          <CardContent>
            <StaffingHeatmap profile={profile} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.staffing.suggestions}</CardTitle>
            <CardDescription>
              {t.staffing.suggestionsDesc}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {flagged.length === 0 ? (
              <EmptyDescription>
                {t.staffing.noSuggestions}
              </EmptyDescription>
            ) : (
              /* One line each: when, which way, by how much. The previous
                 row carried the rate, the baseline and the headcount under the
                 time — three numbers to compare before you knew whether the
                 hour was busy or quiet. The arrow says which way at a glance
                 and the multiple says how far. */
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {flagged.map((s) => {
                  const stretched = s.kind === "stretched"
                  const Icon = stretched ? IconTrendingUp : IconTrendingDown
                  return (
                    <div
                      key={`${s.weekday}-${s.hour}`}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border px-3 py-2.5",
                        stretched
                          ? "border-amber-500/25 bg-amber-500/[0.06]"
                          : "border-sky-500/25 bg-sky-500/[0.06]"
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-7 shrink-0",
                          stretched ? "text-amber-600 dark:text-amber-400" : "text-sky-600 dark:text-sky-400"
                        )}
                      />
                      <div className="flex min-w-0 flex-col">
                        <span className="font-medium">
                          {weekday(s.weekday)} {clock(s.hour)}
                        </span>
                        <span
                          className={cn(
                            "text-sm",
                            stretched ? "text-amber-700 dark:text-amber-300" : "text-sky-700 dark:text-sky-300"
                          )}
                        >
                          {stretched
                            ? t.staffing.busierBy(s.ratio)
                            : t.staffing.quieterBy(s.ratio)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {/* Stated on the page, not just in the code: this view has
                no idea why a night shift is staffed the way it is. */}
            <p className="text-xs text-muted-foreground">
              {t.staffing.caveat}
            </p>
          </CardContent>
        </Card>
    </PageShell>
  )
}
