import type { Metadata } from "next"

import { RegisterForm } from "@/features/auth/register-form"
import { readLocalInboxUrl } from "@/lib/local-inbox"

export const metadata: Metadata = { title: "Create account" }

export default async function RegisterPage() {
  return <RegisterForm localInboxUrl={await readLocalInboxUrl()} />
}

