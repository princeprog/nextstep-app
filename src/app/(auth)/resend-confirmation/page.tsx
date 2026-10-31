import type { Metadata } from "next"

import { ResendConfirmation } from "@/features/auth/resend-confirmation"

export const metadata: Metadata = { title: "Get a new confirmation link" }

export default function ResendConfirmationPage() {
  return <ResendConfirmation />
}
