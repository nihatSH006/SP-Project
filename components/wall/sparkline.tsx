import { cn } from "@/lib/utils"

/**
 * The shape of a station's day, in about 90 bytes of SVG.
 *
 * A percentage says whether a station is behind; it does not say whether it
 * started slow and recovered or traded well all morning and stopped. On a
 * board people glance at rather than study, the shape carries that for free.
 *
 * Deliberately unlabelled and unscaled against other stations — it is a shape,
 * not a second set of figures to read. Each line is normalised to its own peak
 * so a quiet station still shows its profile.
 */
export function Sparkline({
  values,
  className,
  width = 120,
  height = 28,
}: {
  values: number[]
  className?: string
  width?: number
  height?: number
}) {
  // Two points is not a trend; render nothing rather than a misleading line.
  if (values.length < 3) {
    return <div style={{ width, height }} aria-hidden="true" />
  }

  const peak = Math.max(...values)
  if (peak <= 0) return <div style={{ width, height }} aria-hidden="true" />

  const step = width / (values.length - 1)
  // Inset by a pixel top and bottom so the stroke is never clipped.
  const points = values
    .map((value, i) => {
      const x = i * step
      const y = height - 1 - (value / peak) * (height - 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("shrink-0 overflow-visible", className)}
      aria-hidden="true"
      role="presentation"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
