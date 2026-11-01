import type { Metadata } from "next"

import { ResendConfirmation } from "@/features/auth/resend-confirmation"
import { readLocalInboxUrl } from "@/lib/local-inbox"

export const metadata: Metadata = { title: "Get a new confirmation link" }

export default async function ResendConfirmationPage() {
  return <ResendConfirmation localInboxUrl={await readLocalInboxUrl()} />
}
