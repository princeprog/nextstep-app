"use client"

import { InfoIcon, TriangleAlertIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { errorProps, FieldErrorText } from "@/components/field-error-text"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { isApiError } from "@/lib/api/errors"

import { useMe, useSignIn } from "./api"

const REASONS: Record<string, string> = {
  expired: "Your session ended. Sign in again to continue.",
  "demo-expired": "That demo has expired. Start a new demo or sign in.",
  "signed-out": "You've signed out.",
  deleted: "Your account and its data were deleted.",
}

/** `reason` comes from the ?reason= query parameter set when another page sends the user here. */
export function SignInForm({ reason }: { reason: string | null }) {
  const router = useRouter()
  const me = useMe()
  const signIn = useSignIn()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const notice = reason && Object.hasOwn(REASONS, reason) ? REASONS[reason] : null

  useEffect(() => {
    if (me.data) {
      router.replace("/dashboard")
    }
  }, [me.data, router])

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFieldErrors({})
    setFormError(null)
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
              <AlertDescription>{notice}</AlertDescription>
            </Alert>
          ) : null}
          {formError ? (
            <Alert variant="destructive">
              <TriangleAlertIcon />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
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
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-6 flex flex-col items-stretch gap-3">
          <Button type="submit" size="lg" disabled={signIn.isPending}>
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

