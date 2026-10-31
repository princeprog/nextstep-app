"use client"

import { TriangleAlertIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { ApplicationPicker } from "@/components/application-picker"
import { errorProps, FieldErrorText } from "@/components/field-error-text"
import { LoadingRegion } from "@/components/loading-region"
import { TimeZoneSelect } from "@/components/time-zone-select"
import { DISCARD_MESSAGE } from "@/components/use-unsaved-changes"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { useMe } from "@/features/auth/api"
import { useCreateInterview, useInterview, useUpdateInterview } from "@/features/workspace/api"
import { errorMessage, isApiError } from "@/lib/api/errors"
import type { Interview, InterviewType } from "@/lib/api/types"
import { INTERVIEW_TYPE_LABELS } from "@/lib/labels"
import { useUiStore } from "@/stores/ui-store"

type Values = {
  applicationId: string
  type: InterviewType
  localDate: string
  localTime: string
  timeZone: string
  durationMinutes: string
  location: string
  meetingUrl: string
  interviewerName: string
  notes: string
}

function initial(interview: Interview | undefined, applicationId: string | null, zone: string): Values {
  return {
    applicationId: interview?.applicationId ?? applicationId ?? "",
    type: interview?.type ?? "PHONE_SCREEN",
    localDate: interview?.localDate ?? "",
    localTime: interview?.localTime ?? "",
    timeZone: interview?.timeZone ?? zone,
    durationMinutes: interview?.durationMinutes ? String(interview.durationMinutes) : "",
    location: interview?.location ?? "",
    meetingUrl: interview?.meetingUrl ?? "",
    interviewerName: interview?.interviewerName ?? "",
    notes: interview?.notes ?? "",
  }
}

export function InterviewDialog() {
  const { open, interviewId, applicationId } = useUiStore((state) => state.interviewDialog)
  const close = useUiStore((state) => state.closeInterviewDialog)
  const me = useMe()
  const interview = useInterview(open ? interviewId : null)
  const [dirty, setDirty] = useState(false)

  function requestClose() {
    if (dirty && !window.confirm(DISCARD_MESSAGE)) {
      return
    }
    setDirty(false)
    close()
  }

  const editing = Boolean(interviewId)
  const ready = !editing || interview.data
  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : requestClose())}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit interview" : "Add an interview"}</DialogTitle>
          <DialogDescription>
            Enter the start time as given in the invitation, with its time zone.
          </DialogDescription>
        </DialogHeader>
        {editing && interview.isError ? (
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertDescription>{errorMessage(interview.error)}</AlertDescription>
          </Alert>
        ) : !ready ? (
          <LoadingRegion label="Loading interview" className="gap-3">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
            <Skeleton className="h-16" />
          </LoadingRegion>
        ) : (
          <InterviewForm
            key={(interviewId ?? "new") + ":" + (applicationId ?? "")}
            interview={interview.data}
            presetApplicationId={applicationId}
            defaultZone={me.data?.timeZone ?? "UTC"}
            onDirtyChange={setDirty}
            onCancel={requestClose}
            onSaved={() => {
              setDirty(false)
              close()
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function InterviewForm({
  interview,
  presetApplicationId,
  defaultZone,
  onDirtyChange,
  onCancel,
  onSaved,
}: {
  interview?: Interview
  presetApplicationId: string | null
  defaultZone: string
  onDirtyChange: (dirty: boolean) => void
  onCancel: () => void
  onSaved: () => void
}) {
  const create = useCreateInterview()
  const update = useUpdateInterview()
  const [values, setValues] = useState(() => initial(interview, presetApplicationId, defaultZone))
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const pending = create.isPending || update.isPending

  const set = (field: keyof Values) => (value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    onDirtyChange(true)
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) {
      return
    }
    setFieldErrors({})
    setFormError(null)
    const duration = values.durationMinutes.trim()
    if (duration && !/^\d+$/.test(duration)) {
      setFieldErrors({ durationMinutes: "Enter a whole number of minutes." })
      return
    }
    const payload = {
      type: values.type,
      localDate: values.localDate,
      localTime: values.localTime,
      timeZone: values.timeZone,
      durationMinutes: duration ? Number(duration) : null,
      location: values.location.trim() || null,
      meetingUrl: values.meetingUrl.trim() || null,
      interviewerName: values.interviewerName.trim() || null,
      notes: values.notes.trim() ? values.notes : null,
    }
    try {
      if (interview) {
        await update.mutateAsync({ id: interview.id, patch: payload })
        toast.success("Interview saved")
      } else {
        await create.mutateAsync({ ...payload, applicationId: values.applicationId })
        toast.success("Interview added")
      }
      onSaved()
    } catch (error) {
      if (isApiError(error) && Object.keys(error.fieldErrors).length) {
        setFieldErrors(error.fieldErrors)
      }
      setFormError(errorMessage(error))
    }
  }

  const e = (field: string) => errorProps(fieldErrors, field, "interview-")
  const application = e("applicationId")
  const type = e("type")
  const date = e("localDate")
  const time = e("localTime")
  const zone = e("timeZone")
  const duration = e("durationMinutes")
  const location = e("location")
  const link = e("meetingUrl")
  const interviewer = e("interviewerName")
  const notes = e("notes")
  const showPicker = !interview && !presetApplicationId

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {formError ? (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}
      <FieldGroup>
        {showPicker ? (
          <Field data-invalid={application.invalid || undefined}>
            <FieldLabel htmlFor="interview-application">Application</FieldLabel>
            <ApplicationPicker id="interview-application" value={values.applicationId} onChange={set("applicationId")}
              invalid={application.invalid} describedBy={application.invalid ? application.errorId : undefined} />
            <FieldErrorText id={application.errorId} message={application.message} />
          </Field>
        ) : null}
        <Field data-invalid={type.invalid || undefined}>
          <FieldLabel htmlFor="interview-type">Type</FieldLabel>
          <NativeSelect id="interview-type" className="w-full" value={values.type}
            onChange={(event) => set("type")(event.target.value)} {...type.controlProps}>
            {(Object.keys(INTERVIEW_TYPE_LABELS) as InterviewType[]).map((value) => (
              <NativeSelectOption key={value} value={value}>{INTERVIEW_TYPE_LABELS[value]}</NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldErrorText id={type.errorId} message={type.message} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={date.invalid || undefined}>
            <FieldLabel htmlFor="interview-localDate">Date</FieldLabel>
            <Input id="interview-localDate" type="date" value={values.localDate}
              onChange={(event) => set("localDate")(event.target.value)} {...date.controlProps} />
            <FieldErrorText id={date.errorId} message={date.message} />
          </Field>
          <Field data-invalid={time.invalid || undefined}>
            <FieldLabel htmlFor="interview-localTime">Start time</FieldLabel>
            <Input id="interview-localTime" type="time" value={values.localTime}
              onChange={(event) => set("localTime")(event.target.value)} {...time.controlProps} />
            <FieldErrorText id={time.errorId} message={time.message} />
          </Field>
        </div>
        <Field data-invalid={zone.invalid || undefined}>
          <FieldLabel htmlFor="interview-timeZone">Time zone</FieldLabel>
          <TimeZoneSelect id="interview-timeZone" value={values.timeZone} onChange={set("timeZone")}
            invalid={zone.invalid} describedBy={zone.invalid ? zone.errorId : undefined} />
          <FieldErrorText id={zone.errorId} message={zone.message} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={duration.invalid || undefined}>
            <FieldLabel htmlFor="interview-durationMinutes">Duration in minutes (optional)</FieldLabel>
            <Input id="interview-durationMinutes" inputMode="numeric" value={values.durationMinutes}
              onChange={(event) => set("durationMinutes")(event.target.value)} {...duration.controlProps} />
            <FieldErrorText id={duration.errorId} message={duration.message} />
          </Field>
          <Field data-invalid={interviewer.invalid || undefined}>
            <FieldLabel htmlFor="interview-interviewerName">Interviewer (optional)</FieldLabel>
            <Input id="interview-interviewerName" maxLength={160} value={values.interviewerName}
              onChange={(event) => set("interviewerName")(event.target.value)} {...interviewer.controlProps} />
            <FieldErrorText id={interviewer.errorId} message={interviewer.message} />
          </Field>
        </div>
        <Field data-invalid={location.invalid || undefined}>
          <FieldLabel htmlFor="interview-location">Location (optional)</FieldLabel>
          <Input id="interview-location" maxLength={160} value={values.location}
            onChange={(event) => set("location")(event.target.value)} {...location.controlProps} />
          <FieldErrorText id={location.errorId} message={location.message} />
        </Field>
        <Field data-invalid={link.invalid || undefined}>
          <FieldLabel htmlFor="interview-meetingUrl">Meeting link (optional)</FieldLabel>
          <Input id="interview-meetingUrl" type="url" inputMode="url" placeholder="https://" value={values.meetingUrl}
            onChange={(event) => set("meetingUrl")(event.target.value)} {...link.controlProps} />
          <FieldErrorText id={link.errorId} message={link.message} />
        </Field>
        <Field data-invalid={notes.invalid || undefined}>
          <FieldLabel htmlFor="interview-notes">Notes (optional)</FieldLabel>
          <Textarea id="interview-notes" rows={3} maxLength={10000} value={values.notes}
            onChange={(event) => set("notes")(event.target.value)} {...notes.controlProps} />
          <FieldErrorText id={notes.errorId} message={notes.message} />
        </Field>
      </FieldGroup>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {interview ? "Save interview" : "Add interview"}
        </Button>
      </DialogFooter>
    </form>
  )
}

