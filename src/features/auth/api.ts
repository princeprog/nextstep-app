"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"

import { api, ensureCsrf, resetCsrf } from "@/lib/api/client"
import { keys } from "@/lib/api/keys"
import type { Me, PasswordChange, PasswordResetConfirm, RegisterRequest, RegistrationAccepted } from "@/lib/api/types"
import { useUiStore } from "@/stores/ui-store"

function fetchMe(signal?: AbortSignal) {
  return api.get<Me>("/me", { signal })
}

export function useMe(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: keys.me,
    queryFn: ({ signal }) => fetchMe(signal),
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

export function useStartDemo() {
  return useEnterWorkspace((input: { timeZone: string }) => api.post<Me>("/auth/demo", input))
}

/**
 * Starts registration. The API answers the same way whether or not the email already has an account, starts no
 * session, and sends the next step by email. The answer only carries the normalized address. Registering an address
 * that isn't confirmed yet again replaces its name, password, and time zone.
 */
export function useRegister() {
  return useMutation({
    mutationFn: async (input: RegisterRequest) => {
      await ensureCsrf(true)
      return api.post<RegistrationAccepted>("/auth/register", input)
    },
  })
}

/** Asks for a new confirmation link. The API answers the same way for every address. */
export function useResendVerification() {
  return useMutation({ mutationFn: (email: string) => api.post<unknown>("/auth/verify-email/resend", { email }) })
}

/** Confirms an email with the token from its link. It doesn't sign anyone in. */
export function useConfirmEmail() {
  return useMutation({ mutationFn: (token: string) => api.post<void>("/auth/verify-email", { token }) })
}

/** Asks for a password reset link. The API answers the same way whether or not the email has an account. */
export function useRequestPasswordReset() {
  return useMutation({ mutationFn: (email: string) => api.post<unknown>("/auth/password-reset", { email }) })
}

/**
 * Sets a new password from a reset link. The API signs the account out everywhere and ends this browser's session,
 * whoever it belonged to, so every cached record and the CSRF token are dropped.
 */
export function useResetPassword() {
  const clear = useClearPrivateState()
  return useMutation({
    mutationFn: (input: PasswordResetConfirm) => api.post<void>("/auth/password-reset/confirm", input),
    onSuccess: () => clear(),
  })
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

/**
 * Changes the password after the API re-checks the current one. Other sessions end, and this one gets a new ID and
 * CSRF token, so the next write fetches a fresh token.
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: (input: PasswordChange) => api.post<void>("/me/password", input),
    onSuccess: () => resetCsrf(),
  })
}

/** Deletes the account after the API re-checks its password. On success the caller leaves the workspace. */
export function useDeleteAccount() {
  return useMutation({ mutationFn: (password: string) => api.delete("/me", { password }) })
}
