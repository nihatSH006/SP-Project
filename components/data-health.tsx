import {
  IconAlertTriangle,
  IconCircleCheck,
  IconDatabase,
  IconExclamationCircle,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
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
import { adminDb } from "@/lib/firebase/admin"
import { COLLECTIONS } from "@/lib/firebase/schema"
import type { ImportIssue } from "@/lib/import-validation"
import { fullTimestamp } from "@/lib/format"
import { getT } from "@/lib/i18n/server"

type Manifest = {
  importedAt?: { toDate: () => Date }
  source?: string
  dates?: string[]
  counts?: {
    stations?: number
    workers?: number
    reports?: number
    sales?: number
    days?: number
  }
  validation?: {
    ok: boolean
    errors: number
    warnings: number
    issues: ImportIssue[]
  }
}

/**
 * Import health for admins (idea #14).
 *
 * Every score and fraud flag descends from the daily import, so if the import
 * had problems the admin should see them here rather than discovering a wrong
 * grade three weeks later.
 */
export async function DataHealth() {
  const t = await getT()

  const snap = await adminDb()
    .collection(COLLECTIONS.meta)
    .doc("import")
    .get()
    .catch(() => null)

  const manifest = snap?.data() as Manifest | undefined

  if (!manifest) {
    return (
      <Card>
        <CardContent>
          <Empty className="py-8">
            <EmptyMedia variant="icon">
              <IconDatabase />
            </EmptyMedia>
            <EmptyTitle>{t.dataHealth.never}</EmptyTitle>
            <EmptyDescription>{t.dataHealth.neverDesc}</EmptyDescription>
          </Empty>
        </CardContent>
      </Card>
    )
  }

  const v = manifest.validation
  const errors = v?.errors ?? 0
  const warnings = v?.warnings ?? 0
  const clean = errors === 0 && warnings === 0

  const stats: [string, string | number][] = [
    [t.dataHealth.days, manifest.counts?.days ?? manifest.dates?.length ?? 0],
    [t.dataHealth.stations, manifest.counts?.stations ?? 0],
    [t.dataHealth.workers, manifest.counts?.workers ?? 0],
    [t.dataHealth.shifts, (manifest.counts?.reports ?? 0).toLocaleString()],
    [t.dataHealth.sales, (manifest.counts?.sales ?? 0).toLocaleString()],
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconDatabase className="size-4 text-primary" />
          {t.dataHealth.title}
        </CardTitle>
        <CardDescription>{t.dataHealth.description}</CardDescription>
        <CardAction>
          {errors > 0 ? (
            <Badge variant="destructive">{t.dataHealth.errors(errors)}</Badge>
          ) : warnings > 0 ? (
            <Badge
              variant="outline"
              className="border-amber-500/30 bg-amber-500/10 text-amber-400"
            >
              {t.dataHealth.warnings(warnings)}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            >
              <IconCircleCheck />
              {t.dataHealth.clean}
            </Badge>
          )}
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {stats.map(([label, value]) => (
            <div key={label} className="flex flex-col">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="text-lg font-semibold tabular-nums">{value}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          {manifest.importedAt ? (
            <span>
              {t.dataHealth.lastImport}:{" "}
              <span className="text-foreground">
                {fullTimestamp(manifest.importedAt.toDate())}
              </span>
            </span>
          ) : null}
          {manifest.source ? (
            <span>
              {t.dataHealth.source}:{" "}
              <span className="font-mono text-foreground">{manifest.source}</span>
            </span>
          ) : null}
        </div>

        {clean ? (
          <p className="text-sm text-muted-foreground">
            {t.dataHealth.cleanDesc}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(v?.issues ?? []).map((issue) => {
              const isError = issue.severity === "error"
              return (
                <li
                  key={issue.code}
                  className={`flex flex-col gap-1 rounded-xl border p-3 ${
                    isError
                      ? "border-red-500/25 bg-red-500/[0.07]"
                      : "border-amber-500/25 bg-amber-500/[0.06]"
                  }`}
                >
                  <span
                    className={`flex items-center gap-2 text-sm font-medium ${
                      isError ? "text-red-400" : "text-amber-400"
                    }`}
                  >
                    {isError ? (
                      <IconExclamationCircle className="size-4 shrink-0" />
                    ) : (
                      <IconAlertTriangle className="size-4 shrink-0" />
                    )}
                    {t.dataHealth.issueCodes[issue.code] ?? issue.message}
                    <Badge variant="secondary" className="ml-auto shrink-0">
                      {t.dataHealth.affectedRows(issue.count)}
                    </Badge>
                  </span>
                  {issue.samples.length ? (
                    <span className="font-mono text-xs break-all text-muted-foreground">
                      {t.dataHealth.example}: {issue.samples[0]}
                    </span>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
