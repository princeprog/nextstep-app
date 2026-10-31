"use client"

import { TriangleAlertIcon } from "lucide-react"
import { useRef, useState } from "react"
import { flushSync } from "react-dom"

import { ButtonLink } from "@/components/button-link"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { errorMessage, isApiError } from "@/lib/api/errors"

import { useConfirmEmail } from "./api"
import { ConfirmationLinkForm } from "./confirmation-link-form"
import { useLinkToken } from "./link-token"

/**
 * The page a confirmation email links to. Nothing happens until the person presses the button: link scanners and
 * previews load pages, and they must not use up the link. Confirming doesn't sign anyone in.
 */
export function VerifyEmail() {
  const token = useLinkToken()
  // A newer link opened in the same tab starts over.
  return <ConfirmEmail key={token ?? "no-token"} token={token} />
}

function ConfirmEmail({ token }: { token: string | null | undefined }) {
  const confirm = useConfirmEmail()
  const [outcome, setOutcome] = useState<"confirmed" | "invalid" | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)

  function show(next: "confirmed" | "invalid") {
    flushSync(() => setOutcome(next))
    heading.current?.focus()
  }

  async function onConfirm() {
    if (!token) {
      return
    }
    try {
      await confirm.mutateAsync(token)
      show("confirmed")
    } catch (error) {
      if (isApiError(error) && error.isTokenInvalid) {
        show("invalid")
      }
      // Anything else (too many attempts, no connection) is shown under the button, which stays available.
    }
  }

  if (outcome === "confirmed") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 ref={heading} tabIndex={-1} className="text-lg font-semibold outline-none">Email confirmed</h1>
          </CardTitle>
          <CardDescription>Your email address is confirmed. Sign in to start using NextStep.</CardDescription>
        </CardHeader>
        <CardFooter className="mt-2 flex flex-col items-stretch">
          <ButtonLink size="lg" href="/login?reason=verified">Sign in</ButtonLink>
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
              ? "The confirmation code is missing from this link. Open the link from the email again, or get a new one."
              : "Confirmation links work once, expire after 24 hours, and stop working when a newer one is sent."}{" "}
            Enter your email address and we&apos;ll send a new link.
          </CardDescription>
        </CardHeader>
        <ConfirmationLinkForm />
      </Card>
    )
  }

  const failed = confirm.isError && !(isApiError(confirm.error) && confirm.error.isTokenInvalid)
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-lg font-semibold">Confirm your email address</h1>
        </CardTitle>
        <CardDescription>Confirm that this address is yours to finish setting up your NextStep account.</CardDescription>
      </CardHeader>
      {failed ? (
        <CardContent>
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertDescription>{errorMessage(confirm.error)}</AlertDescription>
          </Alert>
        </CardContent>
      ) : null}
      <CardFooter className="mt-2 flex flex-col items-stretch">
        <Button size="lg" onClick={onConfirm} disabled={!token || confirm.isPending} focusableWhenDisabled>
          {confirm.isPending ? <Spinner data-icon="inline-start" /> : null}
          Confirm email address
        </Button>
      </CardFooter>
    </Card>
  )
}
