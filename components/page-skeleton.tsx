import { Skeleton } from "@/components/ui/skeleton"

/**
 * The instant-paint placeholder behind every `loading.tsx`.
 *
 * Its shape mirrors a real page — heading, filter bar, tiles, panels — so the
 * layout does not lurch when the content arrives.
 */
export function PageSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <Skeleton className="h-12 w-full rounded-2xl" />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Skeleton className="h-72 rounded-2xl xl:col-span-2" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>

      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  )
}
