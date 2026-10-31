"use client"

import Link from "next/link"

import { useResendVerification } from "./api"
import { EmailLinkForm } from "./email-link-form"

/**
 * Asks for a new confirmation link, for /resend-confirmation and for a link that no longer works. The API answers the
 * same way whether or not the address has an account waiting to be confirmed, and so does the message.
 */
export function ConfirmationLinkForm() {
  const resend = useResendVerification()
  return (
    <EmailLinkForm
      submitLabel="Send a new link"
      request={(email) => resend.mutateAsync(email)}
      sentMessage={(email) => (
        <>
          If <strong className="font-medium wrap-anywhere">{email}</strong> is waiting to be confirmed, we&apos;ve sent it a new
          link. It expires in 24 hours.
        </>
      )}
    >
      <p className="text-center text-sm text-muted-foreground">
        Already confirmed?{" "}
        <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/login">
          Sign in
        </Link>
      </p>
    </EmailLinkForm>
  )
}
