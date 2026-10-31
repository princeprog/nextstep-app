"use client"

import { TriangleAlertIcon } from "lucide-react"
import { useRef, useState } from "react"

import { useExitWorkspace } from "@/components/exit-workspace"
import { FieldErrorText } from "@/components/field-error-text"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { useDeleteAccount } from "@/features/auth/api"
import { errorMessage, isApiError } from "@/lib/api/errors"

/**
 * Permanent account deletion, confirmed with the account's password. Errors stay in the dialog next to the field;
 * on success the browser leaves the workspace, which clears every cached record.
 */
export function DeleteAccountDialog({
  email,
  open,
  onOpenChange,
}: {
  email: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const remove = useDeleteAccount()
  const exitWorkspace = useExitWorkspace()
  const passwordInput = useRef<HTMLInputElement>(null)
  const [password, setPassword] = useState("")
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  function changeOpen(next: boolean) {
    if (remove.isPending) {
      return
    }
    if (!next) {
      setPassword("")
      setFieldError(null)
      setFormError(null)
    }
    onOpenChange(next)
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFieldError(null)
    setFormError(null)
    try {
      await remove.mutateAsync(password)
      void exitWorkspace("/login?reason=deleted")
    } catch (error) {
      setPassword("")
      if (isApiError(error) && error.fieldErrors.password) {
        setFieldError(error.fieldErrors.password)
        passwordInput.current?.focus()
      } else {
        setFormError(errorMessage(error))
      }
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={changeOpen}>
      <AlertDialogContent initialFocus={passwordInput}>
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              Your applications, tasks, and interviews are deleted, and every device is signed out. This can&apos;t be
              undone. Enter your password to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* Lets password managers match the password to this account. */}
          <input type="text" name="username" autoComplete="username" value={email} readOnly hidden />
          <Field data-invalid={fieldError ? true : undefined}>
            <FieldLabel htmlFor="delete-password">Password</FieldLabel>
            <Input id="delete-password" ref={passwordInput} type="password" autoComplete="current-password"
              value={password} onChange={(event) => setPassword(event.target.value)}
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? "delete-password-error" : undefined} />
            <FieldErrorText id="delete-password-error" message={fieldError ?? undefined} />
          </Field>
          {formError ? (
            <Alert variant="destructive">
              <TriangleAlertIcon />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <Button type="submit" variant="destructive" disabled={remove.isPending} focusableWhenDisabled>
              {remove.isPending ? <Spinner data-icon="inline-start" /> : null}
              Delete account
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
