"use client"

import { RouteError } from "@/components/route-error"

// Errors in a workspace page render inside the app shell, so navigation stays available.
export default function WorkspaceError({ error, retry }: { error: unknown; retry: () => void }) {
  return <RouteError error={error} retry={retry} />
}
