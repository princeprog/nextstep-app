import { ButtonLink } from "@/components/button-link"

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-start justify-center gap-4 p-6">
      <p className="text-sm font-medium text-primary">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">We couldn&apos;t find that page</h1>
      <p className="text-muted-foreground">It may have moved, or the link may be incomplete.</p>
      <ButtonLink href="/dashboard">
        Go to dashboard
      </ButtonLink>
    </main>
  )
}

