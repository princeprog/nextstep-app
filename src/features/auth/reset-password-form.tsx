"use client"

import { TriangleAlertIcon } from "lucide-react"
import Link from "next/link"
import { useRef, useState } from "react"
import { flushSync } from "react-dom"

import { ButtonLink } from "@/components/button-link"
import { FieldErrorText } from "@/components/field-error-text"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { errorMessage, isApiError } from "@/lib/api/errors"

import { useResetPassword } from "./api"
import { useLinkToken } from "./link-token"
import { NEW_PASSWORD_HINT } from "./password-rules"

const linkClass = "font-medium text-primary underline-offset-4 hover:underline"

/** The page a password reset email links to. */
export function ResetPasswordForm() {
  const token = useLinkToken()
  // A newer link opened in the same tab starts over.
  return <ResetPassword key={token ?? "no-token"} token={token} />
}

function ResetPassword({ token }: { token: string | null | undefined }) {
  const reset = useResetPassword()
  const [password, setPassword] = useState("")
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<"changed" | "invalid" | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const passwordInput = useRef<HTMLInputElement>(null)

  function show(next: "changed" | "invalid") {
    flushSync(() => setOutcome(next))
    heading.current?.focus()
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) {
      return
    }
    setFieldError(null)
    setFormError(null)
    try {
      await reset.mutateAsync({ token, password })
      setPassword("")
      show("changed")
    } catch (error) {
      setPassword("")
      if (isApiError(error) && error.isTokenInvalid) {
        show("invalid")
      } else if (isApiError(error) && error.fieldErrors.password) {
        setFieldError(error.fieldErrors.password)
        passwordInput.current?.focus()
      } else {
        setFormError(errorMessage(error))
      }
    }
  }

  if (outcome === "changed") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 ref={heading} tabIndex={-1} className="text-lg font-semibold outline-none">Password changed</h1>
          </CardTitle>
          <CardDescription>You&apos;re signed out on every device. Sign in with your new password.</CardDescription>
        </CardHeader>
        <CardFooter className="mt-2 flex flex-col items-stretch">
          <ButtonLink size="lg" href="/login?reason=password-reset">Sign in</ButtonLink>
        </CardFooter>
      </Card>
    )
  }

  if (token === null || outcome === "invalid") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 ref={heading} tabIndex={-1} className="text-lg font-semibold outline-none">
              {token === null ? "This link is incomplete" : "This link doesn't work"}
            </h1>
          </CardTitle>
          <CardDescription>
            {token === null
              ? "The reset code is missing from this link. Open the link from the email again, or request a new one."
              : "Reset links work once, expire after 30 minutes, and stop working when a newer one is sent. Request a new link to choose a password."}
          </CardDescription>
        </CardHeader>
        <CardFooter className="mt-2 flex flex-col items-stretch gap-3">
          <ButtonLink size="lg" href="/forgot-password">Request a new link</ButtonLink>
          <p className="text-center text-sm text-muted-foreground">
            Remembered it?{" "}
            <Link className={linkClass} href="/login">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-lg font-semibold">Choose a new password</h1>
        </CardTitle>
        <CardDescription>Changing your password signs you out on every device.</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit} noValidate>
        <CardContent className="flex flex-col gap-4">
          {formError ? (
            <Alert variant="destructive">
              <TriangleAlertIcon />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
          <Field data-invalid={fieldError ? true : undefined}>
            <FieldLabel htmlFor="password">New password</FieldLabel>
            <Input id="password" ref={passwordInput} type="password" autoComplete="new-password" value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={"password-hint" + (fieldError ? " password-error" : "")} />
            <FieldDescription id="password-hint">{NEW_PASSWORD_HINT}</FieldDescription>
            <FieldErrorText id="password-error" message={fieldError ?? undefined} />
          </Field>
        </CardContent>
        <CardFooter className="mt-6 flex flex-col items-stretch">
          <Button type="submit" size="lg" disabled={!token || reset.isPending} focusableWhenDisabled>
            {reset.isPending ? <Spinner data-icon="inline-start" /> : null}
            Change password
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
