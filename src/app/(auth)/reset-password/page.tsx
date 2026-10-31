import type { Metadata } from "next"

import { ResetPasswordForm } from "@/features/auth/reset-password-form"

export const metadata: Metadata = { title: "Choose a new password" }

// The link's token is in the URL fragment, which only the browser sees; the page reads it on the client.
export default function ResetPasswordPage() {
  return <ResetPasswordForm />
}
