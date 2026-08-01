/**
 * Resolving a `?from=`/`?to=` pair against the days that were actually
 * imported.
 *
 * Extracted the second time a page needed it. The board pack and the
 * leaderboard both let a reader choose a period, and both have to reject dates
 * that were never imported — a period silently accepted but never loaded would
 * render as a quiet, empty month rather than as a mistake.
 */

/** Guards against someone asking for a decade and waiting on 20,000 reads. */
export const MAX_PERIOD_DAYS = 62

export type Period = {
  from: string
  to: string
  /** Every imported day inside the period, ascending. */
  dates: string[]
}

/** Inclusive day count between two `YYYY-MM-DD` strings. */
export function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number)
  const [ty, tm, td] = to.split("-").map(Number)
  const start = Date.UTC(fy, fm - 1, fd)
  const end = Date.UTC(ty, tm - 1, td)
  return Math.max(1, Math.round((end - start) / 86_400_000) + 1)
}

/**
 * Anything unrecognised is dropped rather than obeyed, so a hand-edited URL
 * cannot ask for a period that was never imported. Reversed endpoints are
 * swapped rather than rejected: someone dragging the start past the end means
 * to move the period, not to make an error.
 */
export function resolvePeriod(
  availableDates: string[],
  requestedFrom?: string,
  requestedTo?: string
): Period | null {
  if (availableDates.length === 0) return null

  const known = new Set(availableDates)
  const latest = availableDates[availableDates.length - 1]
  // Default: the latest month present, which for a single-month import is the
  // whole window.
  const defaultFrom = availableDates.find((d) =>
    d.startsWith(latest.slice(0, 7))
  )!

  const from =
    requestedFrom && known.has(requestedFrom) ? requestedFrom : defaultFrom
  const toRaw = requestedTo && known.has(requestedTo) ? requestedTo : latest

  const [lo, hi] = toRaw < from ? [toRaw, from] : [from, toRaw]

  return {
    from: lo,
    to: hi,
    dates: availableDates
      .filter((d) => d >= lo && d <= hi)
      .slice(0, MAX_PERIOD_DAYS),
  }
}
