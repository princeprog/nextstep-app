"use client"

import Link from "next/link"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { useRequestPasswordReset } from "./api"
import { EmailLinkForm } from "./email-link-form"

export function ForgotPasswordForm() {
  const requestReset = useRequestPasswordReset()
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1 className="text-lg font-semibold">Reset your password</h1>
        </CardTitle>
        <CardDescription>
          Enter the email address you use for NextStep, and we&apos;ll send you a link to choose a new password.
        </CardDescription>
      </CardHeader>
      <EmailLinkForm
        submitLabel="Send reset link"
        request={(email) => requestReset.mutateAsync(email)}
        sentMessage={(email) => (
          <>
            If an account uses <strong className="font-medium wrap-anywhere">{email}</strong>, we&apos;ve sent a link to reset
            its password. It expires in 30 minutes.
          </>
        )}
      >
        <p className="text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/login">
            Sign in
          </Link>
        </p>
      </EmailLinkForm>
    </Card>
  )
}
