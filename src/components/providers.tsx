"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { isApiError } from "@/lib/api/errors"

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        // Retry once for network or server failures; client errors (401, 404, 422...) are final.
        retry: (count, error) => {
          if (isApiError(error) && error.status >= 400 && error.status < 500) {
            return false
          }
          return count < 1
        },
      },
      mutations: { retry: false },
    },
  })
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(makeQueryClient)
  return (
    <QueryClientProvider client={client}>
      <TooltipProvider>{children}</TooltipProvider>
      <Toaster position="bottom-right" theme="light" />
    </QueryClientProvider>
  )
}

