import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render } from "@testing-library/react"
import type { ReactNode } from "react"

import { keys } from "@/lib/api/keys"

export const TEST_ME = {
  id: "user-1",
  kind: "NORMAL",
  displayName: "Ana Cruz",
  email: "ana@example.com",
  timeZone: "Asia/Manila",
  demoExpiresAt: null,
}

/**
 * Renders with a fresh query cache; retries are off so failures show immediately. Like the app shell, which waits
 * for the profile before rendering a workspace page, the signed-in profile is already cached.
 */
export function renderWithQueryClient(ui: ReactNode, { signedIn = true } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  if (signedIn) {
    client.setQueryData(keys.me, TEST_ME)
  }
  return { client, ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>) }
}
