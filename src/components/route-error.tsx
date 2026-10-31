"use client"

import { RotateCcwIcon, TriangleAlertIcon } from "lucide-react"
import { useEffect } from "react"

import { ButtonLink } from "@/components/button-link"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

/**
 * Fallback for error.tsx boundaries when a page fails to render. The error itself goes to the console only; its
 * message may be technical, and server errors arrive without details in production anyway.
 */
export function RouteError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Something went wrong</h1>
      <Alert variant="destructive">
        <TriangleAlertIcon />
        <AlertTitle>This page couldn&apos;t be shown</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-3">
          <span>Try again. If it keeps happening, go to the dashboard and come back later.</span>
          <span className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => retry()}>
              <RotateCcwIcon data-icon="inline-start" />
              Try again
            </Button>
            <ButtonLink variant="ghost" size="sm" href="/dashboard">
              Go to dashboard
            </ButtonLink>
          </span>
        </AlertDescription>
      </Alert>
    </div>
  )
}
