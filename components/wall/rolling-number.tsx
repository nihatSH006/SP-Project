"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * An odometer: each digit rides a vertical strip of 0–9 and slides to its new
 * position when the value changes.
 *
 * Built from CSS transforms rather than a counting timer. A timer that steps
 * through every intermediate value is the obvious approach and the wrong one
 * here — this board is left running for weeks, and re-rendering a nine-digit
 * figure sixty times a second is a real cost for a screen nobody is touching.
 * A transform animates on the compositor and costs nothing per frame.
 *
 * Digits animate with a small stagger from the right, which is what makes it
 * read as a counter rolling over rather than a row of numbers twitching at
 * once.
 */
export function RollingNumber({
  /** Pre-formatted, e.g. "193,521" — separators are rendered as-is. */
  text,
  className,
  digitClassName,
}: {
  text: string
  className?: string
  digitClassName?: string
}) {
  const characters = React.useMemo(() => text.split(""), [text])
  const lastDigit = characters.length - 1

  return (
    <span className={cn("inline-flex items-baseline", className)}>
      {characters.map((character, index) =>
        /\d/.test(character) ? (
          <Digit
            key={`${index}-${characters.length}`}
            digit={Number(character)}
            // Rightmost digit leads; it is the one that actually changes most.
            delayMs={(lastDigit - index) * 35}
            className={digitClassName}
          />
        ) : (
          <span key={`${index}-${characters.length}`} aria-hidden="true">
            {character}
          </span>
        )
      )}
      {/* The whole figure, once, for anything that reads rather than looks. */}
      <span className="sr-only">{text}</span>
    </span>
  )
}

function Digit({
  digit,
  delayMs,
  className,
}: {
  digit: number
  delayMs: number
  className?: string
}) {
  return (
    <span
      className={cn(
        "relative inline-block overflow-hidden align-baseline",
        className
      )}
      aria-hidden="true"
    >
      {/* Invisible zero sizes the box to one tabular digit, so the strip needs
          no hard-coded width and stays correct at any font size. */}
      <span className="invisible">0</span>
      <span
        className="absolute inset-x-0 top-0 flex flex-col motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          transform: `translateY(-${digit * 10}%)`,
          transitionDelay: `${delayMs}ms`,
        }}
      >
        {Array.from({ length: 10 }, (_, n) => (
          <span key={n} className="flex justify-center">
            {n}
          </span>
        ))}
      </span>
    </span>
  )
}
