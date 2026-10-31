import type { Metadata } from "next"

import { VerifyEmail } from "@/features/auth/verify-email"

export const metadata: Metadata = { title: "Confirm your email" }

// The link's token is in the URL fragment, which only the browser sees; the page reads it on the client.
export default function VerifyEmailPage() {
  return <VerifyEmail />
}
