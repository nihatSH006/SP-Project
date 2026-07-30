import { notFound } from "next/navigation"

import { PageShell } from "@/components/page-shell"
import { SettingsForm } from "@/components/settings-form"
import { getSessionUser } from "@/lib/auth"
import { adminDb } from "@/lib/firebase/admin"
import { COLLECTIONS } from "@/lib/firebase/schema"
import { getSettings } from "@/lib/settings-server"

export const metadata = { title: "Settings" }

export default async function SettingsPage() {
  const user = await getSessionUser()
  // 404 rather than 403: a non-admin has no business knowing this page exists.
  if (user?.role !== "admin") notFound()

  const [settings, stationsSnap] = await Promise.all([
    getSettings(),
    adminDb().collection(COLLECTIONS.stations).get(),
  ])

  const stations = stationsSnap.docs
    .map((doc) => ({ id: doc.id, name: (doc.data().name as string) ?? doc.id }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <PageShell
      title="Settings"
      description="The business rules behind every score, grade and risk flag. Changing them here takes effect immediately — no developer needed."
    >
      <SettingsForm initial={settings} stations={stations} />
    </PageShell>
  )
}
