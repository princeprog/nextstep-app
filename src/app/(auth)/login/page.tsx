import type { Metadata } from "next"

import { SignInForm } from "@/features/auth/sign-in-form"

export const metadata: Metadata = { title: "Sign in" }

// The reason is read on the server so the form is in the first HTML response instead of waiting for JavaScript.
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { reason } = await searchParams
  return <SignInForm reason={typeof reason === "string" ? reason : null} />
}

