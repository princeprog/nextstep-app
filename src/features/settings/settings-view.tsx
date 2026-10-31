"use client"

import { LogOutIcon, TriangleAlertIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { errorProps, FieldErrorText } from "@/components/field-error-text"
import { PageHeader } from "@/components/page-header"
import { TimeZoneSelect } from "@/components/time-zone-select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useDeleteAccount, useMe, useSignOut, useUpdateProfile } from "@/features/auth/api"
import { errorMessage, isApiError } from "@/lib/api/errors"
import type { Me } from "@/lib/api/types"

export function SettingsView() {
  const me = useMe()
  if (!me.data) {
    return null
  }
  return (
    <>
      <PageHeader title="Settings" description="Your profile and account." />
      <ProfileCard me={me.data} />
      <SessionCard me={me.data} />
      {me.data.kind === "NORMAL" ? <DeleteAccountCard me={me.data} /> : null}
    </>
  )
}

function ProfileCard({ me }: { me: Me }) {
  const update = useUpdateProfile()
  const [displayName, setDisplayName] = useState(me.displayName)
  const [timeZone, setTimeZone] = useState(me.timeZone)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFieldErrors({})
    try {
      await update.mutateAsync({ displayName, timeZone })
      toast.success("Profile saved")
    } catch (error) {
      if (isApiError(error) && Object.keys(error.fieldErrors).length) {
        setFieldErrors(error.fieldErrors)
      } else {
        toast.error(errorMessage(error))
      }
    }
  }

  const name = errorProps(fieldErrors, "displayName")
  const zone = errorProps(fieldErrors, "timeZone")
  return (
    <Card>
      <CardHeader>
        <CardTitle><h2>Profile</h2></CardTitle>
        <CardDescription>
          Your time zone is the default for new tasks and interviews. Existing ones keep the zone they were saved with.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit} noValidate>
        <CardContent>
          <FieldGroup>
            <Field data-invalid={name.invalid || undefined}>
              <FieldLabel htmlFor="displayName">Name</FieldLabel>
              <Input id="displayName" maxLength={80} value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                {...name.controlProps} />
              <FieldErrorText id={name.errorId} message={name.message} />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" value={me.email ?? "Not used in demo workspaces"} readOnly aria-describedby="email-hint" />
              <FieldDescription id="email-hint">Email can&apos;t be changed yet.</FieldDescription>
            </Field>
            <Field data-invalid={zone.invalid || undefined}>
              <FieldLabel htmlFor="timeZone">Time zone</FieldLabel>
              <TimeZoneSelect id="timeZone" value={timeZone} onChange={setTimeZone} invalid={zone.invalid}
                describedBy={zone.invalid ? zone.errorId : undefined} />
              <FieldErrorText id={zone.errorId} message={zone.message} />
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-6">
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? <Spinner data-icon="inline-start" /> : null}
            Save profile
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

function SessionCard({ me }: { me: Me }) {
  const router = useRouter()
  const signOut = useSignOut()
  return (
    <Card>
      <CardHeader>
        <CardTitle><h2>{me.kind === "DEMO" ? "Demo workspace" : "Session"}</h2></CardTitle>
        <CardDescription>
          {me.kind === "DEMO"
            ? "Leaving ends this demo session. Its fictional data is removed when the demo expires."
            : "Sign out on this device. Your data stays in your account."}
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button variant="outline" disabled={signOut.isPending}
          onClick={async () => {
            await signOut.mutateAsync()
            router.replace("/login?reason=signed-out")
          }}>
          <LogOutIcon data-icon="inline-start" />
          {me.kind === "DEMO" ? "Leave demo" : "Sign out"}
        </Button>
      </CardFooter>
    </Card>
  )
}

function DeleteAccountCard({ me }: { me: Me }) {
  const router = useRouter()
  const remove = useDeleteAccount()
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState("")
  const [error, setError] = useState<string | null>(null)
  const matches = confirmation.trim().toLowerCase() === (me.email ?? "").toLowerCase()

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle><h2>Delete account</h2></CardTitle>
        <CardDescription>
          Permanently deletes your account, applications, tasks, and interviews, and signs you out everywhere. This can&apos;t be undone.
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button variant="destructive" onClick={() => { setConfirmation(""); setError(null); setOpen(true) }}>
          Delete account…
        </Button>
      </CardFooter>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete your account permanently?"
        description="All of your job-search data will be deleted. Type your email address to confirm."
        confirmLabel="Delete account"
        destructive
        confirmDisabled={!matches}
        onConfirm={async () => {
          setError(null)
          try {
            await remove.mutateAsync()
            router.replace("/login?reason=deleted")
          } catch (cause) {
            setError(errorMessage(cause))
            throw cause
          }
        }}
      >
        <Field>
          <FieldLabel htmlFor="delete-confirmation">Email address</FieldLabel>
          <Input id="delete-confirmation" autoComplete="off" value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)} />
        </Field>
        {error ? (
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </ConfirmDialog>
    </Card>
  )
}

