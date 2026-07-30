"use client"

import * as React from "react"
import {
  IconAlertTriangle,
  IconCheck,
  IconClockHour4,
  IconCoin,
  IconDeviceFloppy,
  IconGauge,
  IconLanguage,
  IconRestore,
  IconShieldExclamation,
  IconTrophy,
} from "@tabler/icons-react"
import { toast } from "sonner"

import { resetSettings, updateSettings } from "@/app/(app)/settings/actions"
import { useT } from "@/components/i18n-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { DEFAULT_SETTINGS, LIMITS, type Settings } from "@/lib/settings"

type Station = { id: string; name: string }

/** Numeric input bound to a settings field. */
function NumberField({
  label,
  description,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  disabled,
}: {
  label: string
  description?: React.ReactNode
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step?: number
  suffix?: string
  disabled?: boolean
}) {
  const id = React.useId()
  return (
    <Field orientation="responsive">
      <FieldContent>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {description ? (
          <FieldDescription>{description}</FieldDescription>
        ) : null}
      </FieldContent>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="number"
          className="w-28 text-right tabular-nums"
          value={Number.isFinite(value) ? value : ""}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {suffix ? (
          <span className="w-12 text-sm text-muted-foreground">{suffix}</span>
        ) : null}
      </div>
    </Field>
  )
}

export function SettingsForm({
  initial,
  stations,
}: {
  initial: Settings
  stations: Station[]
}) {
  const t = useT()
  const [settings, setSettings] = React.useState<Settings>(initial)
  const [saved, setSaved] = React.useState<Settings>(initial)
  const [pending, startTransition] = React.useTransition()

  const dirty = JSON.stringify(settings) !== JSON.stringify(saved)

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((s) => ({ ...s, [key]: value }))

  function save() {
    startTransition(async () => {
      const result = await updateSettings(settings)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      // The server may have corrected out-of-range or contradictory values.
      for (const warning of result.warnings) toast.warning(warning)
      setSaved(settings)
      toast.success(t.settings.savedToast)
    })
  }

  function reset() {
    startTransition(async () => {
      const result = await resetSettings()
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      setSettings(DEFAULT_SETTINGS)
      setSaved(DEFAULT_SETTINGS)
      toast.success(t.settings.restoredToast)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ---------------------------------------------- scoring */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconGauge className="size-4 text-primary" />
            {t.settings.scoring}
          </CardTitle>
          <CardDescription>
            {t.settings.scoringDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <NumberField
              label={t.settings.scheduledHours}
              description={t.settings.scheduledHoursDesc}
              value={settings.scheduledHours}
              onChange={(v) => set("scheduledHours", v)}
              min={LIMITS.scheduledHours.min}
              max={LIMITS.scheduledHours.max}
              step={0.5}
              suffix={t.settings.units.hours}
            />
            <FieldSeparator />
            <NumberField
              label={t.settings.productivityTarget}
              description={t.settings.productivityTargetDesc}
              value={settings.productivityTarget}
              onChange={(v) => set("productivityTarget", v)}
              min={LIMITS.productivityTarget.min}
              max={LIMITS.productivityTarget.max}
              suffix={t.settings.units.aznPerHour}
            />
            <FieldSeparator />
            <NumberField
              label={t.settings.graceMinutes}
              description={t.settings.graceMinutesDesc}
              value={settings.graceMinutes}
              onChange={(v) => set("graceMinutes", v)}
              min={LIMITS.graceMinutes.min}
              max={LIMITS.graceMinutes.max}
              suffix={t.settings.units.min}
            />
          </FieldGroup>
        </CardContent>
      </Card>

      {/* ---------------------------------------------- risk */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconShieldExclamation className="size-4 text-primary" />
            {t.settings.riskThresholds}
          </CardTitle>
          <CardDescription>
            {t.settings.riskThresholdsDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <NumberField
              label={t.settings.riskHighSuspicious}
              description={t.settings.riskHighSuspiciousDesc}
              value={settings.riskHighSuspicious}
              onChange={(v) => set("riskHighSuspicious", v)}
              min={LIMITS.riskHighSuspicious.min}
              max={LIMITS.riskHighSuspicious.max}
              suffix={t.settings.units.sales}
            />
            <FieldSeparator />
            <NumberField
              label={t.settings.riskMediumAttendance}
              value={settings.riskMediumAttendance}
              onChange={(v) => set("riskMediumAttendance", v)}
              min={LIMITS.attendance.min}
              max={LIMITS.attendance.max}
              suffix="%"
            />
            <NumberField
              label={t.settings.riskHighAttendance}
              description={t.settings.riskHighAttendanceDesc}
              value={settings.riskHighAttendance}
              onChange={(v) => set("riskHighAttendance", v)}
              min={LIMITS.attendance.min}
              max={LIMITS.attendance.max}
              suffix="%"
            />
          </FieldGroup>
        </CardContent>
      </Card>

      {/* ---------------------------------------------- grades */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconTrophy className="size-4 text-primary" />
            {t.settings.gradeBoundaries}
          </CardTitle>
          <CardDescription>
            {t.settings.gradeBoundariesDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            {(
              [
                ["aPlus", "A+"],
                ["a", "A"],
                ["b", "B"],
                ["c", "C"],
              ] as const
            ).map(([key, label]) => (
              <NumberField
                key={key}
                label={t.settings.gradeFrom(label)}
                value={settings.gradeBounds[key]}
                onChange={(v) =>
                  set("gradeBounds", { ...settings.gradeBounds, [key]: v })
                }
                min={LIMITS.grade.min}
                max={LIMITS.grade.max}
                suffix={t.settings.units.pts}
              />
            ))}
            <FieldDescription>
              {t.settings.belowC}
            </FieldDescription>
          </FieldGroup>
        </CardContent>
      </Card>

      {/* ---------------------------------------------- targets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconCoin className="size-4 text-primary" />
            {t.settings.revenueTargets}
          </CardTitle>
          <CardDescription>
            {t.settings.revenueTargetsDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field orientation="responsive">
              <FieldContent>
                <FieldLabel htmlFor="target-mode">{t.settings.targetMode}</FieldLabel>
                <FieldDescription>
                  {t.settings.targetModeDesc}
                </FieldDescription>
              </FieldContent>
              <Select
                value={settings.targetMode}
                onValueChange={(v) =>
                  set("targetMode", v as Settings["targetMode"])
                }
                items={[
                  { value: "manual", label: t.settings.manualMode },
                  { value: "baseline", label: t.settings.baselineMode },
                ]}
              >
                <SelectTrigger id="target-mode" className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">{t.settings.manualMode}</SelectItem>
                  <SelectItem value="baseline">{t.settings.baselineMode}</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <FieldSeparator />

            {settings.targetMode === "baseline" ? (
              <NumberField
                label={t.settings.baselineUplift}
                description={t.settings.baselineUpliftDesc}
                value={settings.baselineUplift}
                onChange={(v) => set("baselineUplift", v)}
                min={LIMITS.baselineUplift.min}
                max={LIMITS.baselineUplift.max}
                step={0.01}
                suffix={t.settings.units.times}
              />
            ) : (
              <>
                <NumberField
                  label={t.settings.defaultTarget}
                  description={t.settings.defaultTargetDesc}
                  value={settings.defaultStationDailyTarget}
                  onChange={(v) => set("defaultStationDailyTarget", v)}
                  min={LIMITS.target.min}
                  max={LIMITS.target.max}
                  step={500}
                  suffix="AZN"
                />
                <FieldSeparator />
                {stations.map((station) => (
                  <NumberField
                    key={station.id}
                    label={station.name}
                    value={
                      settings.stationDailyTargets[station.id] ??
                      settings.defaultStationDailyTarget
                    }
                    onChange={(v) =>
                      set("stationDailyTargets", {
                        ...settings.stationDailyTargets,
                        [station.id]: v,
                      })
                    }
                    min={LIMITS.target.min}
                    max={LIMITS.target.max}
                    step={500}
                    suffix="AZN"
                  />
                ))}
              </>
            )}
          </FieldGroup>
        </CardContent>
      </Card>

      {/* ---------------------------------------------- language */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconLanguage className="size-4 text-primary" />
            {t.settings.language}
          </CardTitle>
          <CardDescription>
            {t.settings.languageDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Field orientation="responsive">
            <FieldContent>
              <FieldLabel htmlFor="lang">{t.settings.defaultLanguage}</FieldLabel>
              <FieldDescription>
                {t.settings.defaultLanguageDesc}
              </FieldDescription>
            </FieldContent>
            <Select
              value={settings.defaultLanguage}
              onValueChange={(v) =>
                set("defaultLanguage", v as Settings["defaultLanguage"])
              }
              items={[
                { value: "az", label: "Azərbaycanca" },
                { value: "ru", label: "Русский" },
                { value: "en", label: "English" },
              ]}
            >
              <SelectTrigger id="lang" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="az">Azərbaycanca</SelectItem>
                <SelectItem value="ru">Русский</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      {/* ---------------------------------------------- save bar */}
      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card/80 p-3 backdrop-blur-xl">
        {dirty ? (
          <Badge variant="outline" className="gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-400">
            <IconAlertTriangle className="size-3.5" />
            {t.settings.unsaved}
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <IconCheck className="size-3.5" />
            {t.settings.saved}
          </Badge>
        )}

        <span className="hidden text-sm text-muted-foreground sm:inline">
          {t.settings.appliesImmediately}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={reset}
          >
            <IconRestore data-icon="inline-start" />
            {t.settings.restoreDefaults}
          </Button>
          <Button
            className="btn-3d"
            disabled={pending || !dirty}
            onClick={save}
          >
            {pending ? <Spinner /> : <IconDeviceFloppy data-icon="inline-start" />}
            {pending ? t.settings.saving : t.settings.save}
          </Button>
        </div>
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <IconClockHour4 className="size-3.5" />
        {t.settings.auditNote}
      </p>
    </div>
  )
}
