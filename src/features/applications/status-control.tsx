"use client"

import { useState } from "react"
import { toast } from "sonner"

import { errorProps, FieldErrorText } from "@/components/field-error-text"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Spinner } from "@/components/ui/spinner"
import { useMe } from "@/features/auth/api"
import { useChangeStatus } from "@/features/workspace/api"
import { errorMessage, isApiError } from "@/lib/api/errors"
import type { Application, ApplicationStatus } from "@/lib/api/types"
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/labels"
import { todayIn } from "@/lib/time"

/**
 * Keyboard-accessible status selector shared by the list and detail views. Moving to Applied without a stored
 * applied date asks for the real date first and makes no change until it is supplied.
 */
export function StatusControl({ application, id }: { application: Application; id: string }) {
  const me = useMe()
  const change = useChangeStatus()
  const [askDate, setAskDate] = useState(false)
  const [appliedDate, setAppliedDate] = useState("")
  const [dateError, setDateError] = useState<Record<string, string>>({})

  async function submit(status: ApplicationStatus, date?: string) {
    try {
      await change.mutateAsync({ id: application.id, status, appliedDate: date })
      toast.success(application.company + " moved to " + STATUS_LABELS[status])
      setAskDate(false)
    } catch (error) {
      if (isApiError(error) && error.fieldErrors.appliedDate) {
        setDateError({ appliedDate: error.fieldErrors.appliedDate })
        setAskDate(true)
        return
      }
      toast.error(errorMessage(error))
    }
  }

  function onSelect(next: ApplicationStatus) {
    if (next === application.status) {
      return
    }
    if (next === "APPLIED" && !application.appliedDate) {
      setAppliedDate(todayIn(me.data?.timeZone ?? "UTC"))
      setDateError({})
      setAskDate(true)
      return
    }
    void submit(next)
  }

  const dateField = errorProps(dateError, "appliedDate", id + "-")

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="sr-only">
        Status for {application.company} — {application.jobTitle}
      </label>
      <NativeSelect
        id={id}
        size="sm"
        value={application.status}
        disabled={change.isPending || application.archived}
        onChange={(event) => onSelect(event.target.value as ApplicationStatus)}
      >
        {STATUS_ORDER.map((status) => (
          <NativeSelectOption key={status} value={status}>
            {STATUS_LABELS[status]}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {change.isPending ? <Spinner aria-label="Saving status" /> : null}
      <Dialog open={askDate} onOpenChange={(open) => !change.isPending && setAskDate(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>When did you apply?</DialogTitle>
            <DialogDescription>
              Applied needs the actual date you applied to {application.company}. Nothing changes until you save.
            </DialogDescription>
          </DialogHeader>
          <form
            noValidate
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (!appliedDate) {
                setDateError({ appliedDate: "Enter the date you applied." })
                return
              }
              void submit("APPLIED", appliedDate)
            }}
          >
            <Field data-invalid={dateField.invalid || undefined}>
              <FieldLabel htmlFor={id + "-applied-date"}>Applied on</FieldLabel>
              <Input id={id + "-applied-date"} type="date" value={appliedDate}
                onChange={(event) => setAppliedDate(event.target.value)} {...dateField.controlProps} />
              <FieldErrorText id={dateField.errorId} message={dateField.message} />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAskDate(false)} disabled={change.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={change.isPending}>
                {change.isPending ? <Spinner data-icon="inline-start" /> : null}
                Mark as applied
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

