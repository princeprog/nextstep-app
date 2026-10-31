"use client"

import { TriangleAlertIcon } from "lucide-react"
import { useState } from "react"

import { errorProps, FieldErrorText } from "@/components/field-error-text"
import { LiveStatus } from "@/components/live-status"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { CardContent, CardFooter } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { errorMessage, isApiError } from "@/lib/api/errors"

/**
 * Asks for an emailed link (password reset, new confirmation link). The API answers the same way whether or not the
 * address has an account, so the form always ends with the same message, which must not claim more than that.
 */
export function EmailLinkForm({
  submitLabel,
  request,
  sentMessage,
  children,
}: {
  submitLabel: string
  request: (email: string) => Promise<unknown>
  sentMessage: (email: string) => React.ReactNode
  children?: React.ReactNode
}) {
  const [email, setEmail] = useState("")
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFieldErrors({})
    setFormError(null)
    setSentTo(null)
    setPending(true)
    try {
      await request(email)
      setSentTo(email.trim())
    } catch (error) {
      if (isApiError(error) && Object.keys(error.fieldErrors).length > 0) {
        setFieldErrors(error.fieldErrors)
      } else {
        setFormError(errorMessage(error))
      }
    } finally {
      setPending(false)
    }
  }

  const emailError = errorProps(fieldErrors, "email")
  return (
    <form onSubmit={onSubmit} noValidate>
      <CardContent className="flex flex-col gap-4">
        {formError ? (
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}
        <Field data-invalid={emailError.invalid || undefined}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" type="email" autoComplete="email" value={email}
            onChange={(event) => setEmail(event.target.value)} {...emailError.controlProps} />
          <FieldErrorText id={emailError.errorId} message={emailError.message} />
        </Field>
        <LiveStatus message={sentTo ? sentMessage(sentTo) : null} />
      </CardContent>
      <CardFooter className="mt-6 flex flex-col items-stretch gap-3">
        <Button type="submit" size="lg" disabled={pending} focusableWhenDisabled>
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {submitLabel}
        </Button>
        {children}
      </CardFooter>
    </form>
  )
}
