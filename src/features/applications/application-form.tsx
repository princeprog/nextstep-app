"use client"

import { InfoIcon, TriangleAlertIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { errorProps, FieldErrorText } from "@/components/field-error-text"
import { DISCARD_MESSAGE, useUnsavedChanges } from "@/components/use-unsaved-changes"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { useMe } from "@/features/auth/api"
import { useCreateApplication, useDuplicateCount, useUpdateApplication } from "@/features/workspace/api"
import { errorMessage, isApiError } from "@/lib/api/errors"
import type { Application, ApplicationStatus } from "@/lib/api/types"
import { ARRANGEMENT_LABELS, EMPLOYMENT_LABELS, PERIOD_LABELS, STATUS_LABELS, STATUS_ORDER } from "@/lib/labels"
import { todayIn } from "@/lib/time"

const NOTES_LIMIT = 10_000

type Values = {
  company: string
  jobTitle: string
  status: ApplicationStatus
  jobUrl: string
  location: string
  workArrangement: string
  employmentType: string
  salaryMin: string
  salaryMax: string
  salaryCurrency: string
  salaryPeriod: string
  appliedDate: string
  contactName: string
  contactEmail: string
  notes: string
}

function toValues(application?: Application): Values {
  return {
    company: application?.company ?? "",
    jobTitle: application?.jobTitle ?? "",
    status: application?.status ?? "SAVED",
    jobUrl: application?.jobUrl ?? "",
    location: application?.location ?? "",
    workArrangement: application?.workArrangement ?? "",
    employmentType: application?.employmentType ?? "",
    salaryMin: application?.salaryMin ?? "",
    salaryMax: application?.salaryMax ?? "",
    salaryCurrency: application?.salaryCurrency ?? "",
    salaryPeriod: application?.salaryPeriod ?? "",
    appliedDate: application?.appliedDate ?? "",
    contactName: application?.contactName ?? "",
    contactEmail: application?.contactEmail ?? "",
    notes: application?.notes ?? "",
  }
}

/** Optional text sent as null when empty, so clearing a field clears it on the server. */
function optional(value: string) {
  return value.trim() === "" ? null : value
}

function toPayload(values: Values) {
  return {
    company: values.company,
    jobTitle: values.jobTitle,
    jobUrl: optional(values.jobUrl),
    location: optional(values.location),
    workArrangement: (optional(values.workArrangement) as Application["workArrangement"]) ?? null,
    employmentType: (optional(values.employmentType) as Application["employmentType"]) ?? null,
    salaryMin: optional(values.salaryMin),
    salaryMax: optional(values.salaryMax),
    salaryCurrency: optional(values.salaryCurrency.toUpperCase()),
    salaryPeriod: (optional(values.salaryPeriod) as Application["salaryPeriod"]) ?? null,
    appliedDate: optional(values.appliedDate),
    contactName: optional(values.contactName),
    contactEmail: optional(values.contactEmail),
    notes: optional(values.notes),
  }
}

function useDebounced<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export function ApplicationForm({ application }: { application?: Application }) {
  const router = useRouter()
  const me = useMe()
  const create = useCreateApplication()
  const update = useUpdateApplication(application?.id ?? "")
  const initial = useMemo(() => toValues(application), [application])
  const [values, setValues] = useState(initial)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const pending = create.isPending || update.isPending
  const dirty = !saved && JSON.stringify(values) !== JSON.stringify(initial)
  useUnsavedChanges(dirty)

  const debouncedCompany = useDebounced(values.company, 400)
  const debouncedTitle = useDebounced(values.jobTitle, 400)
  const duplicates = useDuplicateCount(debouncedCompany, debouncedTitle, application?.id)

  const set = (field: keyof Values) => (value: string) => setValues((current) => ({ ...current, [field]: value }))

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) {
      return
    }
    setFieldErrors({})
    setFormError(null)
    try {
      let id: string
      if (application) {
        // Send only what changed; omitted fields stay as they are on the server.
        const next = toPayload(values)
        const before = toPayload(initial)
        const patch = Object.fromEntries(
          Object.entries(next).filter(([key, value]) => value !== before[key as keyof typeof before]),
        )
        const result = await update.mutateAsync(patch)
        id = result.id
      } else {
        const result = await create.mutateAsync({ ...toPayload(values), status: values.status })
        id = result.id
      }
      setSaved(true)
      toast.success(application ? "Changes saved" : "Application added")
      router.push("/applications/" + id)
    } catch (error) {
      if (isApiError(error) && Object.keys(error.fieldErrors).length) {
        setFieldErrors(error.fieldErrors)
      }
      setFormError(errorMessage(error))
      window.scrollTo({ top: 0 })
    }
  }

  function cancel() {
    if (dirty && !window.confirm(DISCARD_MESSAGE)) {
      return
    }
    setSaved(true)
    router.push(application ? "/applications/" + application.id : "/applications")
  }

  const f = (field: keyof Values) => errorProps(fieldErrors, field)
  const company = f("company")
  const jobTitle = f("jobTitle")
  const status = f("status")
  const jobUrl = f("jobUrl")
  const location = f("location")
  const arrangement = f("workArrangement")
  const employment = f("employmentType")
  const salaryMin = f("salaryMin")
  const salaryMax = f("salaryMax")
  const currency = f("salaryCurrency")
  const period = f("salaryPeriod")
  const appliedDate = f("appliedDate")
  const contactName = f("contactName")
  const contactEmail = f("contactEmail")
  const notes = f("notes")
  const needsAppliedDate = values.status === "APPLIED"
  const duplicateCount = duplicates.data?.count ?? 0

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      {formError ? (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertDescription>{formError} Your entries are still here.</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle><h2>Role</h2></CardTitle>
          <CardDescription>Company and job title are required.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-4 md:grid-cols-2">
              <Field data-invalid={company.invalid || undefined}>
                <FieldLabel htmlFor="company">Company</FieldLabel>
                <Input id="company" maxLength={160} value={values.company} onChange={(e) => set("company")(e.target.value)}
                  {...company.controlProps} />
                <FieldErrorText id={company.errorId} message={company.message} />
              </Field>
              <Field data-invalid={jobTitle.invalid || undefined}>
                <FieldLabel htmlFor="jobTitle">Job title</FieldLabel>
                <Input id="jobTitle" maxLength={160} value={values.jobTitle} onChange={(e) => set("jobTitle")(e.target.value)}
                  {...jobTitle.controlProps} />
                <FieldErrorText id={jobTitle.errorId} message={jobTitle.message} />
              </Field>
            </div>
            {duplicateCount > 0 ? (
              <Alert role="status">
                <InfoIcon />
                <AlertDescription>
                  You already have {duplicateCount === 1 ? "an application" : duplicateCount + " applications"} for this
                  company and role. You can still save this one, for example if you&apos;re reapplying.
                </AlertDescription>
              </Alert>
            ) : null}
            <Field data-invalid={jobUrl.invalid || undefined}>
              <FieldLabel htmlFor="jobUrl">Job posting link</FieldLabel>
              <Input id="jobUrl" type="url" inputMode="url" placeholder="https://" maxLength={2048} value={values.jobUrl}
                onChange={(e) => set("jobUrl")(e.target.value)} {...jobUrl.controlProps} />
              <FieldErrorText id={jobUrl.errorId} message={jobUrl.message} />
            </Field>
            <div className="grid gap-4 md:grid-cols-3">
              <Field data-invalid={location.invalid || undefined}>
                <FieldLabel htmlFor="location">Location</FieldLabel>
                <Input id="location" maxLength={160} value={values.location} onChange={(e) => set("location")(e.target.value)}
                  {...location.controlProps} />
                <FieldErrorText id={location.errorId} message={location.message} />
              </Field>
              <Field data-invalid={arrangement.invalid || undefined}>
                <FieldLabel htmlFor="workArrangement">Work arrangement</FieldLabel>
                <NativeSelect id="workArrangement" className="w-full" value={values.workArrangement}
                  onChange={(e) => set("workArrangement")(e.target.value)} {...arrangement.controlProps}>
                  <NativeSelectOption value="">Not specified</NativeSelectOption>
                  {Object.entries(ARRANGEMENT_LABELS).map(([value, label]) => (
                    <NativeSelectOption key={value} value={value}>{label}</NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldErrorText id={arrangement.errorId} message={arrangement.message} />
              </Field>
              <Field data-invalid={employment.invalid || undefined}>
                <FieldLabel htmlFor="employmentType">Employment type</FieldLabel>
                <NativeSelect id="employmentType" className="w-full" value={values.employmentType}
                  onChange={(e) => set("employmentType")(e.target.value)} {...employment.controlProps}>
                  <NativeSelectOption value="">Not specified</NativeSelectOption>
                  {Object.entries(EMPLOYMENT_LABELS).map(([value, label]) => (
                    <NativeSelectOption key={value} value={value}>{label}</NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldErrorText id={employment.errorId} message={employment.message} />
              </Field>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle><h2>Status and dates</h2></CardTitle>
          <CardDescription>
            {application ? "Change the status from the application page." : "New applications start as Saved unless you choose otherwise."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-4 md:grid-cols-2">
              {application ? null : (
                <Field data-invalid={status.invalid || undefined}>
                  <FieldLabel htmlFor="status">Status</FieldLabel>
                  <NativeSelect id="status" className="w-full" value={values.status}
                    onChange={(e) => {
                      const next = e.target.value as ApplicationStatus
                      setValues((current) => ({
                        ...current,
                        status: next,
                        appliedDate: next === "APPLIED" && !current.appliedDate ? todayIn(me.data?.timeZone ?? "UTC") : current.appliedDate,
                      }))
                    }} {...status.controlProps}>
                    {STATUS_ORDER.map((value) => (
                      <NativeSelectOption key={value} value={value}>{STATUS_LABELS[value]}</NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldErrorText id={status.errorId} message={status.message} />
                </Field>
              )}
              <Field data-invalid={appliedDate.invalid || undefined}>
                <FieldLabel htmlFor="appliedDate">Date applied{needsAppliedDate ? "" : " (optional)"}</FieldLabel>
                <Input id="appliedDate" type="date" value={values.appliedDate}
                  onChange={(e) => set("appliedDate")(e.target.value)}
                  aria-invalid={appliedDate.invalid || undefined}
                  aria-describedby={"appliedDate-hint" + (appliedDate.invalid ? " " + appliedDate.errorId : "")} />
                <FieldDescription id="appliedDate-hint">
                  {needsAppliedDate ? "Required for Applied. Use the real date you applied." : "Add it once you've applied."}
                </FieldDescription>
                <FieldErrorText id={appliedDate.errorId} message={appliedDate.message} />
              </Field>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle><h2>Compensation</h2></CardTitle>
          <CardDescription>Optional. If you add an amount, include its currency and period.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field data-invalid={salaryMin.invalid || undefined}>
              <FieldLabel htmlFor="salaryMin">Minimum</FieldLabel>
              <Input id="salaryMin" inputMode="decimal" value={values.salaryMin} onChange={(e) => set("salaryMin")(e.target.value)}
                {...salaryMin.controlProps} />
              <FieldErrorText id={salaryMin.errorId} message={salaryMin.message} />
            </Field>
            <Field data-invalid={salaryMax.invalid || undefined}>
              <FieldLabel htmlFor="salaryMax">Maximum</FieldLabel>
              <Input id="salaryMax" inputMode="decimal" value={values.salaryMax} onChange={(e) => set("salaryMax")(e.target.value)}
                {...salaryMax.controlProps} />
              <FieldErrorText id={salaryMax.errorId} message={salaryMax.message} />
            </Field>
            <Field data-invalid={currency.invalid || undefined}>
              <FieldLabel htmlFor="salaryCurrency">Currency code</FieldLabel>
              <Input id="salaryCurrency" maxLength={3} placeholder="PHP" autoCapitalize="characters" value={values.salaryCurrency}
                onChange={(e) => set("salaryCurrency")(e.target.value.toUpperCase())} {...currency.controlProps} />
              <FieldErrorText id={currency.errorId} message={currency.message} />
            </Field>
            <Field data-invalid={period.invalid || undefined}>
              <FieldLabel htmlFor="salaryPeriod">Period</FieldLabel>
              <NativeSelect id="salaryPeriod" className="w-full" value={values.salaryPeriod}
                onChange={(e) => set("salaryPeriod")(e.target.value)} {...period.controlProps}>
                <NativeSelectOption value="">Not specified</NativeSelectOption>
                {Object.entries(PERIOD_LABELS).map(([value, label]) => (
                  <NativeSelectOption key={value} value={value}>{label}</NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldErrorText id={period.errorId} message={period.message} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle><h2>Contact and notes</h2></CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-4 md:grid-cols-2">
              <Field data-invalid={contactName.invalid || undefined}>
                <FieldLabel htmlFor="contactName">Contact name</FieldLabel>
                <Input id="contactName" maxLength={160} value={values.contactName}
                  onChange={(e) => set("contactName")(e.target.value)} {...contactName.controlProps} />
                <FieldErrorText id={contactName.errorId} message={contactName.message} />
              </Field>
              <Field data-invalid={contactEmail.invalid || undefined}>
                <FieldLabel htmlFor="contactEmail">Contact email</FieldLabel>
                <Input id="contactEmail" type="email" maxLength={254} value={values.contactEmail}
                  onChange={(e) => set("contactEmail")(e.target.value)} {...contactEmail.controlProps} />
                <FieldErrorText id={contactEmail.errorId} message={contactEmail.message} />
              </Field>
            </div>
            <Field data-invalid={notes.invalid || undefined}>
              <FieldLabel htmlFor="notes">Notes</FieldLabel>
              <Textarea id="notes" rows={6} maxLength={NOTES_LIMIT} value={values.notes}
                onChange={(e) => set("notes")(e.target.value)}
                aria-invalid={notes.invalid || undefined}
                aria-describedby={"notes-hint" + (notes.invalid ? " " + notes.errorId : "")} />
              <FieldDescription id="notes-hint">
                Plain text.{" "}
                {values.notes.length > NOTES_LIMIT * 0.9
                  ? (NOTES_LIMIT - values.notes.length) + " characters left."
                  : "Up to 10,000 characters."}
              </FieldDescription>
              <FieldErrorText id={notes.errorId} message={notes.message} />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={cancel} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {application ? "Save changes" : "Save application"}
        </Button>
      </div>
    </form>
  )
}

