"use client"

import { RouteError } from "@/components/route-error"

// Errors outside the workspace pages: sign-in pages and the workspace shell itself.
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <main id="main" className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center p-6">
      <RouteError error={error} retry={retry} />
    </main>
  )
}
