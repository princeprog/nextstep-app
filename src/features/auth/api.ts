"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"

import { api, ensureCsrf, resetCsrf } from "@/lib/api/client"
import { keys } from "@/lib/api/keys"
import type { Me } from "@/lib/api/types"
import { useUiStore } from "@/stores/ui-store"

export function useMe(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: keys.me,
    queryFn: ({ signal }) => api.get<Me>("/me", { signal }),
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  })
}

/** Removes every cached private record and transient UI state before another workspace can be shown. */
export function useClearPrivateState() {
  const queryClient = useQueryClient()
  const resetUi = useUiStore((state) => state.reset)
  return useCallback(() => {
    queryClient.cancelQueries()
    queryClient.clear()
    resetCsrf()
    resetUi()
  }, [queryClient, resetUi])
}

type SignInInput = { email: string; password: string }
type RegisterInput = { displayName: string; email: string; password: string; timeZone: string }

function useEnterWorkspace<TInput>(request: (input: TInput) => Promise<Me>) {
  const queryClient = useQueryClient()
  const clear = useClearPrivateState()
  return useMutation({
    mutationFn: async (input: TInput) => {
      await ensureCsrf(true)
      const me = await request(input)
      // The server rotated the session and CSRF token; fetch a fresh token before the next write.
      resetCsrf()
      return me
    },
    onSuccess: (me) => {
      clear()
      queryClient.setQueryData(keys.me, me)
    },
  })
}

export function useSignIn() {
  return useEnterWorkspace((input: SignInInput) => api.post<Me>("/auth/login", input))
}

export function useRegister() {
  return useEnterWorkspace((input: RegisterInput) => api.post<Me>("/auth/register", input))
}

export function useStartDemo() {
  return useEnterWorkspace((input: { timeZone: string }) => api.post<Me>("/auth/demo", input))
}

/**
 * Ends the server session. It never fails: if the session already ended, the caller still clears private state
 * (inside the workspace through useExitWorkspace, elsewhere with useClearPrivateState).
 */
export function useSignOut() {
  return useMutation({
    mutationFn: async () => {
      try {
        await api.post<void>("/auth/logout")
      } catch {
        // The session may already have ended; leaving continues either way.
      }
    },
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { displayName?: string; timeZone?: string }) => api.patch<Me>("/me", input),
    onSuccess: (me) => queryClient.setQueryData(keys.me, me),
  })
}

/** Deletes the account. On success the caller leaves the workspace, which clears private state. */
export function useDeleteAccount() {
  return useMutation({ mutationFn: () => api.delete("/me") })
}

