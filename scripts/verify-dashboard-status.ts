/**
 * Prove the overview's headline says the right thing.
 *
 *   npm run verify:status
 *
 * This line is the first thing an executive reads, and on most days it is the
 * only thing they read. The failure that matters is not a wrong colour — it is
 * the headline saying "on track" on a day when someone needed to act.
 */
import {
  deriveStatus,
  ATTENDANCE_CRIT,
  HEALTH_CRIT,
  type StatusInput,
} from "@/lib/dashboard-status"

let pass = 0
let fail = 0
const check = (label: string, ok: boolean, extra = "") => {
  console.log(`  ${ok ? "✓" : "✗"} ${label}${extra ? ` — ${extra}` : ""}`)
  if (ok) pass += 1
  else fail += 1
}

/** A completely healthy day. */
const clean: StatusInput = {
  alerts: 0,
  highRisk: 0,
  attendance: 99,
  health: 100,
  hasTarget: true,
  targetPct: 104,
}
const on = (over: Partial<StatusInput>) => deriveStatus({ ...clean, ...over })

console.log("\nA good day says so, and says nothing else")
{
  const s = on({})
  check("verdict is on-track", s.verdict === "on-track")
  check(
    "no attention items at all",
    s.items.length === 0,
    "healthy metrics are not enumerated"
  )
}

console.log("\nAnything needing a decision is surfaced")
check("flagged transactions raise a warning", on({ alerts: 5 }).verdict === "watch")
check("a high-risk operator demands action", on({ highRisk: 1 }).verdict === "action")
check(
  "attendance below the critical line demands action",
  on({ attendance: ATTENDANCE_CRIT - 1 }).verdict === "action",
  `${ATTENDANCE_CRIT - 1}%`
)
check(
  "degraded health demands action",
  on({ health: HEALTH_CRIT - 1 }).verdict === "action",
  `${HEALTH_CRIT - 1}%`
)
check(
  "slightly soft attendance is only a watch",
  on({ attendance: 90 }).verdict === "watch",
  "90%"
)

console.log("\nSeverity ordering — the first line is the one people read")
{
  const s = on({ alerts: 3, highRisk: 2, attendance: 80 })
  check("critical items come first", s.items[0].severity === "crit")
  check(
    "a named person at risk outranks operational numbers",
    s.items[0].kind === "high-risk",
    s.items.map((i) => i.kind).join(" > ")
  )
}

console.log("\nNo target means no invented verdict")
{
  const s = on({ hasTarget: false, targetPct: 0 })
  check(
    "a missing target is not reported as a miss",
    !s.items.some((i) => i.kind === "target"),
    "silent rather than wrong"
  )
  check("and it does not drag the verdict down", s.verdict === "on-track")

  const withTarget = on({ hasTarget: true, targetPct: 40 })
  check(
    "a real target below the line IS reported",
    withTarget.items.some((i) => i.kind === "target"),
    "40% of target"
  )
}

console.log("\nThe headline can never contradict the tiles")
{
  // Every threshold is shared with the tile colouring, so a tile showing red
  // while the headline says "on track" is unrepresentable.
  const s = on({ attendance: ATTENDANCE_CRIT - 0.1 })
  check(
    "a red attendance tile forces a non-green headline",
    s.verdict !== "on-track",
    `attendance ${ATTENDANCE_CRIT - 0.1}%`
  )
}

console.log(`\n${pass} passed, ${fail} failed\n`)
process.exit(fail ? 1 : 0)
