"use client"

import { LogOutIcon, TriangleAlertIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { useExitWorkspace } from "@/components/exit-workspace"
import { errorProps, FieldErrorText } from "@/components/field-error-text"
import { PageHeader } from "@/components/page-header"
import { TimeZoneSelect } from "@/components/time-zone-select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useChangePassword, useMe, useSignOut, useUpdateProfile } from "@/features/auth/api"
import { NEW_PASSWORD_HINT } from "@/features/auth/password-rules"
import { errorMessage, isApiError } from "@/lib/api/errors"
import type { Me } from "@/lib/api/types"

import { DeleteAccountDialog } from "./delete-account-dialog"
import { ExportDataLink } from "./export-data-link"

export function SettingsView() {
  const me = useMe()
  if (!me.data) {
    return null
  }
  // Demo workspaces have no password and no permanent account.
  const normal = me.data.kind === "NORMAL"
  return (
    <>
      <PageHeader title="Settings" description="Your profile and account." />
      <ProfileCard me={me.data} />
      {normal ? <PasswordCard me={me.data} /> : null}
      <DataCard me={me.data} />
      <SessionCard me={me.data} />
      {normal ? <DeleteAccountCard me={me.data} /> : null}
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
          <Button type="submit" disabled={update.isPending} focusableWhenDisabled>
            {update.isPending ? <Spinner data-icon="inline-start" /> : null}
            Save profile
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

function PasswordCard({ me }: { me: Me }) {
  const change = useChangePassword()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFieldErrors({})
    setFormError(null)
    try {
      await change.mutateAsync({ currentPassword, newPassword })
      setCurrentPassword("")
      setNewPassword("")
      toast.success("Password changed. Other devices were signed out.")
    } catch (error) {
      if (isApiError(error) && Object.keys(error.fieldErrors).length > 0) {
        setFieldErrors(error.fieldErrors)
        // Clear only what was wrong, so a refused new password doesn't mean typing the current one again.
        if (error.fieldErrors.currentPassword) {
          setCurrentPassword("")
        }
        if (error.fieldErrors.newPassword) {
          setNewPassword("")
        }
      } else {
        setFormError(errorMessage(error))
      }
    }
  }

  const current = errorProps(fieldErrors, "currentPassword")
  const next = errorProps(fieldErrors, "newPassword")
  return (
    <Card>
      <CardHeader>
        <CardTitle><h2>Password</h2></CardTitle>
        <CardDescription>Changing your password signs out your other devices. You stay signed in here.</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit} noValidate>
        <CardContent className="flex flex-col gap-4">
          {formError ? (
            <Alert variant="destructive">
              <TriangleAlertIcon />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
          {/* Lets password managers update the saved password for this account. */}
          <input type="text" name="username" autoComplete="username" value={me.email ?? ""} readOnly hidden />
          <FieldGroup>
            <Field data-invalid={current.invalid || undefined}>
              <FieldLabel htmlFor="currentPassword">Current password</FieldLabel>
              <Input id="currentPassword" type="password" autoComplete="current-password" value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)} {...current.controlProps} />
              <FieldErrorText id={current.errorId} message={current.message} />
            </Field>
            <Field data-invalid={next.invalid || undefined}>
              <FieldLabel htmlFor="newPassword">New password</FieldLabel>
              <Input id="newPassword" type="password" autoComplete="new-password" value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                aria-invalid={next.invalid || undefined}
                aria-describedby={"newPassword-hint" + (next.invalid ? " " + next.errorId : "")} />
              <FieldDescription id="newPassword-hint">{NEW_PASSWORD_HINT}</FieldDescription>
              <FieldErrorText id={next.errorId} message={next.message} />
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-6">
          <Button type="submit" disabled={change.isPending} focusableWhenDisabled>
            {change.isPending ? <Spinner data-icon="inline-start" /> : null}
            Change password
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

function DataCard({ me }: { me: Me }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle><h2>Your data</h2></CardTitle>
        <CardDescription>
          {me.kind === "DEMO"
            ? "Download this demo's fictional records as a JSON file: its profile and every application, task, and interview, including archived ones."
            : "Download everything stored for your account as a JSON file: your profile and every application, task, and interview, including archived ones."}
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <ExportDataLink />
      </CardFooter>
    </Card>
  )
}

function SessionCard({ me }: { me: Me }) {
  const signOut = useSignOut()
  const exitWorkspace = useExitWorkspace()
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
          onClick={() => void exitWorkspace("/login?reason=signed-out", () => signOut.mutateAsync())}>
          <LogOutIcon data-icon="inline-start" />
          {me.kind === "DEMO" ? "Leave demo" : "Sign out"}
        </Button>
      </CardFooter>
    </Card>
  )
}

function DeleteAccountCard({ me }: { me: Me }) {
  const [open, setOpen] = useState(false)
  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle><h2>Delete account</h2></CardTitle>
        <CardDescription>
          Permanently deletes your account, applications, tasks, and interviews, and signs you out everywhere. This can&apos;t be undone.
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          Delete account…
        </Button>
      </CardFooter>
      <DeleteAccountDialog email={me.email ?? ""} open={open} onOpenChange={setOpen} />
    </Card>
  )
}
