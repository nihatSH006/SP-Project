import type * as React from "react"

import { FilterBar } from "@/components/filter-bar"
import type { FilterOptions } from "@/lib/data"

/**
 * The body of a page: heading, optional filter bar, content.
 *
 * Deliberately synchronous and free of data fetching. The sidebar and header
 * used to live here, which meant every page re-rendered and re-fetched the
 * whole chrome on each navigation — the click hung until the new page's data
 * arrived, then everything jumped at once. That chrome now sits in
 * `app/(app)/layout.tsx`, which App Router preserves across navigation.
 */
export function PageShell({
  title,
  description,
  actions,
  options = null,
  children,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  /** Pass the options from `getSlice` to show the filter bar; omit to hide it. */
  options?: FilterOptions | null
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div
        data-page-heading
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-balance md:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-muted-foreground text-pretty">
              {description}
            </p>
          ) : null}
        </div>
        {actions}
      </div>

      {options ? <FilterBar options={options} /> : null}

      {children}
    </div>
  )
}
