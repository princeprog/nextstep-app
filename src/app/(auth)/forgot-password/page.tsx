import type { Metadata } from "next"

import { ForgotPasswordForm } from "@/features/auth/forgot-password-form"
import { readLocalInboxUrl } from "@/lib/local-inbox"

export const metadata: Metadata = { title: "Reset your password" }

export default async function ForgotPasswordPage() {
  return <ForgotPasswordForm localInboxUrl={await readLocalInboxUrl()} />
}
