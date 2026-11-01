"use client"

import { TriangleAlertIcon } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { LiveStatus } from "@/components/live-status"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { errorMessage } from "@/lib/api/errors"

import { useResendVerification } from "./api"
import { LocalInboxNote } from "./local-inbox-note"

/**
 * Shown after registration. It reads the same whether or not the address already had an account; only the email
 * itself tells the owner which case applies. On a local run with LOCAL_INBOX_URL set, it also says where the email went.
 */
export function CheckEmail({
  email,
  headingRef,
  onChangeEmail,
  localInboxUrl,
}: {
  email: string
  headingRef: React.Ref<HTMLHeadingElement>
  onChangeEmail: () => void
  localInboxUrl: string | null
}) {
  const resend = useResendVerification()
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onResend() {
    setStatus(null)
    setError(null)
    try {
      await resend.mutateAsync(email)
      setStatus("If this address is waiting to be confirmed, a new link is on its way. Only the newest link works.")
    } catch (cause) {
      setError(errorMessage(cause))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 ref={headingRef} tabIndex={-1} className="text-lg font-semibold outline-none">
            Check your email
          </h1>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <p>
          We sent an email to <strong className="font-medium wrap-anywhere">{email}</strong>. Open the link in it to continue.
          Confirmation links expire after 24 hours.
        </p>
        <p className="text-muted-foreground">Can&apos;t find it? Check your spam folder, or send it again.</p>
        <LocalInboxNote url={localInboxUrl} />
        <LiveStatus message={status} />
        {error ? (
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
      <CardFooter className="mt-6 flex flex-col items-stretch gap-3">
        <Button variant="outline" size="lg" onClick={onResend} disabled={resend.isPending} focusableWhenDisabled>
          {resend.isPending ? <Spinner data-icon="inline-start" /> : null}
          Resend email
        </Button>
        <Button variant="ghost" size="lg" onClick={onChangeEmail}>
          Change email address
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already confirmed?{" "}
          <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/login">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
