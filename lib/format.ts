/** Display helpers shared by every page. `money` mirrors the Jinja filter. */

export const money = (value: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 0 })

export const money2 = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

export const timeOfDay = (value: Date) =>
  value.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })

export const dayAndTime = (value: Date) =>
  `${value.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}, ${timeOfDay(value)}`

export const fullTimestamp = (value: Date) =>
  `${value.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}, ${timeOfDay(value)}`

/** Health / attendance bands drive colour across meters and status lines. */
export type Band = "good" | "warn" | "crit"

export const bandFor = (value: number, good = 90, warn = 75): Band =>
  value >= good ? "good" : value >= warn ? "warn" : "crit"
