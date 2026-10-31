"use client"

import { TriangleAlertIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { flushSync } from "react-dom"

import { errorProps, FieldErrorText } from "@/components/field-error-text"
import { TimeZoneSelect } from "@/components/time-zone-select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { errorMessage, isApiError } from "@/lib/api/errors"
import { PRIVACY_URL, TERMS_URL } from "@/lib/site"
import { useBrowserTimeZone } from "@/lib/time"

import { useMe, useRegister } from "./api"
import { CheckEmail } from "./check-email"
import { NEW_PASSWORD_HINT } from "./password-rules"

// Links inside a sentence are underlined, so they don't depend on color.
const inlineLink = "font-medium text-primary underline underline-offset-4"

export function RegisterForm() {
  const router = useRouter()
  const me = useMe()
  const register = useRegister()
  const detectedZone = useBrowserTimeZone()
  const [values, setForm] = useState({ displayName: "", email: "", password: "", timeZone: "" })
  const form = { ...values, timeZone: values.timeZone || detectedZone }
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  // The normalized address the API emailed, once registration is accepted.
  const [sentTo, setSentTo] = useState<string | null>(null)
  const emailInput = useRef<HTMLInputElement>(null)
  const checkEmailHeading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (me.data) {
      router.replace("/dashboard")
    }
  }, [me.data, router])

  const set = (field: keyof typeof form) => (value: string) => setForm((current) => ({ ...current, [field]: value }))

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFieldErrors({})
    setFormError(null)
    try {
      const accepted = await register.mutateAsync(form)
      // No session starts. Everything but the password is kept in case the address needs fixing.
      flushSync(() => {
        setForm((current) => ({ ...current, password: "" }))
        setSentTo(accepted.email)
      })
      checkEmailHeading.current?.focus()
    } catch (error) {
      setForm((current) => ({ ...current, password: "" }))
      if (isApiError(error) && error.code === "ALREADY_SIGNED_IN") {
        router.replace("/dashboard")
      } else if (isApiError(error) && Object.keys(error.fieldErrors).length > 0) {
        setFieldErrors(error.fieldErrors)
      } else {
        setFormError(errorMessage(error))
      }
    }
  }

  function changeEmail() {
    flushSync(() => setSentTo(null))
    emailInput.current?.focus()
  }

  if (sentTo) {
    return <CheckEmail email={sentTo} headingRef={checkEmailHeading} onChangeEmail={changeEmail} />
  }

  const name = errorProps(fieldErrors, "displayName")
  const email = errorProps(fieldErrors, "email")
  const password = errorProps(fieldErrors, "password")
  const zone = errorProps(fieldErrors, "timeZone")

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-lg font-semibold">Create your workspace</h1>
        </CardTitle>
        <CardDescription>Your applications, tasks, and interviews stay private to your account.</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit} noValidate>
        <CardContent className="flex flex-col gap-4">
          {formError ? (
            <Alert variant="destructive">
              <TriangleAlertIcon />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
          <FieldGroup>
            <Field data-invalid={name.invalid || undefined}>
              <FieldLabel htmlFor="displayName">Name</FieldLabel>
              <Input id="displayName" autoComplete="name" maxLength={80} value={form.displayName}
                onChange={(event) => set("displayName")(event.target.value)} {...name.controlProps} />
              <FieldErrorText id={name.errorId} message={name.message} />
            </Field>
            <Field data-invalid={email.invalid || undefined}>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" ref={emailInput} type="email" autoComplete="email" value={form.email}
                onChange={(event) => set("email")(event.target.value)} {...email.controlProps} />
              <FieldErrorText id={email.errorId} message={email.message} />
            </Field>
            <Field data-invalid={password.invalid || undefined}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input id="password" type="password" autoComplete="new-password" value={form.password}
                onChange={(event) => set("password")(event.target.value)}
                aria-invalid={password.invalid || undefined}
                aria-describedby={"password-hint" + (password.invalid ? " " + password.errorId : "")} />
              <FieldDescription id="password-hint">{NEW_PASSWORD_HINT}</FieldDescription>
              <FieldErrorText id={password.errorId} message={password.message} />
            </Field>
            <Field data-invalid={zone.invalid || undefined}>
              <FieldLabel htmlFor="timeZone">Time zone</FieldLabel>
              <TimeZoneSelect id="timeZone" value={form.timeZone} onChange={set("timeZone")} invalid={zone.invalid}
                describedBy={"timeZone-hint" + (zone.invalid ? " " + zone.errorId : "")} />
              <FieldDescription id="timeZone-hint">Detected from your browser. New tasks and interviews use it by default.</FieldDescription>
              <FieldErrorText id={zone.errorId} message={zone.message} />
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-6 flex flex-col items-stretch gap-3">
          <Button type="submit" size="lg" disabled={register.isPending} focusableWhenDisabled>
            {register.isPending ? <Spinner data-icon="inline-start" /> : null}
            Create account
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            By creating an account, you agree to the{" "}
            <a className={inlineLink} href={TERMS_URL}>Terms of use</a>. Read how your data is handled in the{" "}
            <a className={inlineLink} href={PRIVACY_URL}>Privacy policy</a>.
          </p>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/login">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
