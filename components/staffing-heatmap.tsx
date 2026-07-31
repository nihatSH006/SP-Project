import { money } from "@/lib/format"
import type { Dictionary } from "@/lib/i18n"
import type { StaffingProfile } from "@/lib/staffing"

/**
 * Week × hour grid of revenue per operator-hour.
 *
 * Intensity is scaled against the 95th percentile rather than the maximum, so
 * one freak hour cannot wash the entire grid out to near-white. Cells with too
 * little coverage to have a meaningful rate are drawn as absent rather than as
 * "zero demand" — the two are not the same thing, and colouring an unstaffed
 * hour as dead quiet would invite exactly the wrong conclusion.
 */
export function StaffingHeatmap({
  profile,
  t,
}: {
  profile: StaffingProfile
  t: Dictionary
}) {
  const covered = profile.cells.filter((c) => c.operatorHours >= 1)
  const sorted = [...covered.map((c) => c.perOperatorHour)].sort((a, b) => a - b)
  const p95 = sorted.length
    ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]
    : 1
  const scale = p95 > 0 ? p95 : 1

  const byKey = new Map(profile.cells.map((c) => [c.weekday * 24 + c.hour, c]))

  return (
    <div className="overflow-x-auto">
      <table className="border-separate border-spacing-0.5">
        <thead>
          <tr>
            <th className="w-10" />
            {Array.from({ length: 24 }, (_, hour) => (
              <th
                key={hour}
                className="px-0.5 pb-1 text-center font-mono text-[10px] font-normal text-muted-foreground"
              >
                {hour % 3 === 0 ? String(hour).padStart(2, "0") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 7 }, (_, weekday) => (
            <tr key={weekday}>
              <td className="pr-2 text-right text-xs text-muted-foreground">
                {t.staffing.weekdays[weekday]}
              </td>
              {Array.from({ length: 24 }, (_, hour) => {
                const cell = byKey.get(weekday * 24 + hour)
                const hasData = Boolean(cell && cell.operatorHours >= 1)
                const intensity = hasData
                  ? Math.min(1, cell!.perOperatorHour / scale)
                  : 0

                return (
                  <td key={hour} className="p-0">
                    <div
                      className="size-5 rounded-[4px] border border-border/40"
                      style={
                        hasData
                          ? {
                              // Single hue, varying opacity: a rainbow scale
                              // implies categories where there is only "more"
                              // and "less".
                              backgroundColor: `color-mix(in oklab, var(--color-primary) ${Math.round(
                                12 + intensity * 88
                              )}%, transparent)`,
                            }
                          : undefined
                      }
                      title={
                        hasData
                          ? `${t.staffing.weekdays[weekday]} ${String(hour).padStart(2, "0")}:00 — ${money(
                              cell!.perOperatorHour
                            )} ${t.staffing.perOperatorHour}, ~${cell!.avgOperators} ${t.staffing.onShift}`
                          : `${t.staffing.weekdays[weekday]} ${String(hour).padStart(2, "0")}:00 — ${t.staffing.noData}`
                      }
                    />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
