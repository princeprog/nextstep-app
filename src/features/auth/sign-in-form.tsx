"use client"

import { InfoIcon, TriangleAlertIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { errorProps, FieldErrorText } from "@/components/field-error-text"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { isApiError } from "@/lib/api/errors"

import { useMe, useSignIn } from "./api"
import { LocalInboxNote } from "./local-inbox-note"

const REASONS: Record<string, string> = {
  expired: "Your session ended. Sign in again to continue.",
  "demo-expired": "That demo has expired. Start a new demo or sign in.",
  "signed-out": "You've signed out.",
  deleted: "Your account and its data were deleted.",
  verified: "Your email address is confirmed. Sign in to start using NextStep.",
  "password-reset": "Your password was changed and every device was signed out. Sign in with your new password.",
  "confirm-email": "Confirm your email address first, then sign in. The link is in your inbox.",
}

const RESEND_CONFIRMATION = "/resend-confirmation"

/**
 * `reason` comes from the ?reason= query parameter set when another page sends the user here. `localInboxUrl` is
 * LOCAL_INBOX_URL, set only on local runs.
 */
export function SignInForm({ reason, localInboxUrl }: { reason: string | null; localInboxUrl: string | null }) {
  const router = useRouter()
  const me = useMe()
  const signIn = useSignIn()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  // An unconfirmed account is refused exactly like a wrong password, so the hint about confirming first is shown for
  // every refusal and says nothing about any account.
  const [refused, setRefused] = useState(false)
  const notice = reason && Object.hasOwn(REASONS, reason) ? REASONS[reason] : null
  // Both the confirm-email notice and the hint under a refusal say the link is in the inbox. On a local run, the
  // note says which inbox; like the hint, it shows under every refusal.
  const mentionsInbox = refused || reason === "confirm-email"

  useEffect(() => {
    if (me.data) {
      router.replace("/dashboard")
    }
  }, [me.data, router])

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFieldErrors({})
    setFormError(null)
    setRefused(false)
    try {
      await signIn.mutateAsync({ email, password })
      router.replace("/dashboard")
    } catch (error) {
      setPassword("")
      if (isApiError(error) && error.code === "ALREADY_SIGNED_IN") {
        router.replace("/dashboard")
        return
      }
      if (isApiError(error) && error.code === "VALIDATION_ERROR") {
        setFieldErrors(error.fieldErrors)
      } else {
        setRefused(isApiError(error) && error.code === "INVALID_CREDENTIALS")
        setFormError(isApiError(error) ? error.message : "Something went wrong. Try again.")
      }
    }
  }

  const emailError = errorProps(fieldErrors, "email")
  const passwordError = errorProps(fieldErrors, "password")

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-lg font-semibold">Sign in</h1>
        </CardTitle>
        <CardDescription>Pick up your job search where you left off.</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit} noValidate>
        <CardContent className="flex flex-col gap-4">
          {notice ? (
            <Alert role="status">
              <InfoIcon />
              <AlertDescription>
                {notice}
                {reason === "confirm-email" ? (
                  <>
                    {" "}
                    <Link href={RESEND_CONFIRMATION}>Get a new confirmation link</Link>
                  </>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}
          {formError ? (
            <Alert variant="destructive">
              <TriangleAlertIcon />
              <AlertTitle>{formError}</AlertTitle>
              {refused ? (
                <AlertDescription>
                  Just created your account? Confirm your email first; the link is in your inbox.{" "}
                  <Link href={RESEND_CONFIRMATION}>Get a new confirmation link</Link>
                </AlertDescription>
              ) : null}
            </Alert>
          ) : null}
          {mentionsInbox ? <LocalInboxNote url={localInboxUrl} /> : null}
          <FieldGroup>
            <Field data-invalid={emailError.invalid || undefined}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" type="email" autoComplete="email" required value={email}
                onChange={(event) => setEmail(event.target.value)} {...emailError.controlProps} />
              <FieldErrorText id={emailError.errorId} message={emailError.message} />
            </Field>
            <Field data-invalid={passwordError.invalid || undefined}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input id="password" type="password" autoComplete="current-password" required value={password}
                onChange={(event) => setPassword(event.target.value)} {...passwordError.controlProps} />
              <FieldErrorText id={passwordError.errorId} message={passwordError.message} />
              <p className="text-sm">
                <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/forgot-password">
                  Forgot password?
                </Link>
              </p>
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-6 flex flex-col items-stretch gap-3">
          <Button type="submit" size="lg" disabled={signIn.isPending} focusableWhenDisabled>
            {signIn.isPending ? <Spinner data-icon="inline-start" /> : null}
            Sign in
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/register">
              Create an account
            </Link>{" "}
            or{" "}
            <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/demo">
              try the demo
            </Link>
            .
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}

