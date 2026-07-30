"use client"

import { useActionState } from "react"

import { updateCase, type CaseActionResult } from "@/app/(app)/cases/actions"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { CASE_STATUSES, type CaseStatus } from "@/lib/case-status"
import { useT } from "@/components/i18n-provider"

/**
 * The only control that changes a case.
 *
 * `canConclude` hides the closing statuses from a station manager, but the
 * server re-checks the same rule — this is a courtesy, not the boundary.
 */
export function CaseTriageForm({
  employeeId,
  station,
  status,
  note,
  canConclude,
  closedStatuses,
}: {
  employeeId: number
  station: string
  status: CaseStatus
  note: string
  canConclude: boolean
  closedStatuses: CaseStatus[]
}) {
  const t = useT()
  const [state, formAction, pending] = useActionState<
    CaseActionResult | null,
    FormData
  >(updateCase, null)

  const statusLabel: Record<CaseStatus, string> = {
    open: t.cases.statusOpen,
    investigating: t.cases.statusInvestigating,
    confirmed: t.cases.statusConfirmed,
    explained: t.cases.statusExplained,
    dismissed: t.cases.statusDismissed,
  }

  const available = canConclude
    ? CASE_STATUSES
    : CASE_STATUSES.filter((s) => !closedStatuses.includes(s))

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="employeeId" value={employeeId} />
      <input type="hidden" name="station" value={station} />

      <Field>
        <FieldLabel htmlFor="case-status">{t.cases.statusLabel}</FieldLabel>
        <NativeSelect id="case-status" name="status" defaultValue={status}>
          {available.map((value) => (
            <option key={value} value={value}>
              {statusLabel[value]}
            </option>
          ))}
        </NativeSelect>
        {!canConclude ? (
          <FieldDescription>{t.cases.needsSupervisorHint}</FieldDescription>
        ) : null}
      </Field>

      <Field>
        <FieldLabel htmlFor="case-note">{t.cases.noteLabel}</FieldLabel>
        <Textarea
          id="case-note"
          name="note"
          rows={4}
          maxLength={2000}
          defaultValue={note}
          placeholder={t.cases.notePlaceholder}
        />
        <FieldDescription>{t.cases.noteRequiredHint}</FieldDescription>
      </Field>

      <div className="flex items-center gap-2">
        <Checkbox id="case-assign" name="assignToMe" />
        <Label htmlFor="case-assign" className="font-normal">
          {t.cases.assignToMe}
        </Label>
      </div>

      {state && !state.ok ? (
        <p className="text-sm text-red-400">
          {t.cases.errors[state.error as keyof typeof t.cases.errors] ??
            state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="text-sm text-emerald-400">{t.cases.saved}</p>
      ) : null}

      <Button type="submit" disabled={pending} className="btn-3d self-start">
        {t.cases.save}
      </Button>
    </form>
  )
}
