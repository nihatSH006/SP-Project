"use client"

import { IconDatabaseOff, IconRefresh } from "@tabler/icons-react"

import { useT } from "@/components/i18n-provider"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

/**
 * Error boundary for the signed-in routes.
 *
 * Without this, a failed Firestore read renders Next's blank error screen — the
 * "this page couldn't load" symptom. The most likely cause by far is the free
 * tier's daily read quota, so say so and offer a retry rather than a dead end.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useT()

  return (
    <main className="flex min-h-svh flex-1 items-center justify-center bg-background p-6">
      <Empty className="max-w-md">
        <EmptyMedia variant="icon">
          <IconDatabaseOff className="text-amber-600 dark:text-amber-400" />
        </EmptyMedia>
        <EmptyTitle>{t.errors.dataTitle}</EmptyTitle>
        <EmptyDescription>{t.errors.dataDesc}</EmptyDescription>
        <div className="flex items-center gap-2">
          <Button className="btn-3d" onClick={reset}>
            <IconRefresh data-icon="inline-start" />
            {t.common.tryAgain}
          </Button>
        </div>
        {error.digest ? (
          <p className="mt-2 font-mono text-xs text-muted-foreground">
            ref {error.digest}
          </p>
        ) : null}
      </Empty>
    </main>
  )
}
