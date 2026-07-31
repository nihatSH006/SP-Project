import {
  IconAlertTriangle,
  IconInfoCircle,
  IconMoonStars,
  IconZzz,
} from "@tabler/icons-react"

import { PageShell } from "@/components/page-shell"
import { StaffingHeatmap } from "@/components/staffing-heatmap"
import { StatTile } from "@/components/stat-tile"
import { Badge } from "@/components/ui/badge"
import {
  Card,
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
          <StatTile
            label={t.staffing.median}
            value={money(profile.median)}
            caption={t.staffing.perOperatorHour}
          />
          <StatTile
            label={t.staffing.busiest}
            value={
              profile.busiestCell
                ? `${weekday(profile.busiestCell.weekday)} ${clock(profile.busiestCell.hour)}`
                : "—"
            }
            icon={IconAlertTriangle}
            caption={
              profile.busiestCell
                ? `${money(profile.busiestCell.perOperatorHour)} ${t.staffing.perOperatorHour}`
                : undefined
            }
          />
          <StatTile
            label={t.staffing.quietest}
            value={
              profile.quietestCell
                ? `${weekday(profile.quietestCell.weekday)} ${clock(profile.quietestCell.hour)}`
                : "—"
            }
            icon={IconMoonStars}
            caption={
              profile.quietestCell
                ? `${money(profile.quietestCell.perOperatorHour)} ${t.staffing.perOperatorHour}`
                : undefined
            }
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t.staffing.heatmap}</CardTitle>
            <CardDescription>{t.staffing.heatmapDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <StaffingHeatmap profile={profile} t={t} />
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
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {flagged.map((s) => (
                  <div
                    key={`${s.weekday}-${s.hour}`}
                    className={
                      s.kind === "stretched"
                        ? "flex items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2"
                        : "flex items-center justify-between gap-3 rounded-xl border border-sky-500/25 bg-sky-500/[0.06] px-3 py-2"
                    }
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {s.kind === "stretched" ? (
                          <IconAlertTriangle className="size-4 text-amber-400" />
                        ) : (
                          <IconZzz className="size-4 text-sky-400" />
                        )}
                        {weekday(s.weekday)} {clock(s.hour)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {money(s.perOperatorHour)}{" "}
                        {t.staffing.perOperatorHour} ·{" "}
                        {t.staffing.usualAt(s.hourBaseline)} · ~
                        {s.avgOperators} {t.staffing.onShift}
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {s.kind === "stretched"
                        ? t.staffing.stretched
                        : t.staffing.idle}
                    </Badge>
                  </div>
                ))}
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
