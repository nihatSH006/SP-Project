/**
 * Change one business rule from the command line — a scriptable equivalent of
 * the admin settings page, used by verification runs and for quick fixes.
 *
 *   npm run set-setting -- --key productivityTarget --value 5
 *   npm run set-setting -- --show
 */
import { adminDb } from "@/lib/firebase/admin"
import { COLLECTIONS } from "@/lib/firebase/schema"
import { sanitiseSettings, withDefaults, type Settings } from "@/lib/settings"

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? undefined : process.argv[i + 1]
}

async function main() {
  const ref = adminDb().collection(COLLECTIONS.settings).doc("global")
  const current = withDefaults((await ref.get()).data() as Partial<Settings>)

  if (process.argv.includes("--show")) {
    console.log(JSON.stringify(current, null, 2))
    return
  }

  const key = arg("key") as keyof Settings | undefined
  const raw = arg("value")
  if (!key || raw === undefined) {
    throw new Error("Usage: --key <setting> --value <value>   (or --show)")
  }
  if (!(key in current)) {
    throw new Error(`Unknown setting: ${key}`)
  }

  const value: unknown =
    typeof current[key] === "number" ? Number(raw) : raw
  const { settings, warnings } = sanitiseSettings({ ...current, [key]: value })

  await ref.set({ ...settings, updatedAt: new Date(), updatedBy: "cli" }, { merge: true })
  for (const w of warnings) console.warn("warning:", w)
  console.log(`${key}: ${JSON.stringify(current[key])} -> ${JSON.stringify(settings[key])}`)
}

main().catch((error) => {
  console.error("Failed:", error instanceof Error ? error.message : error)
  process.exit(1)
})
