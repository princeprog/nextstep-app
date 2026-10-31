import { ApiError } from "./errors"
import type { CsrfToken } from "./types"

/**
 * Same-origin client for the NextStep API.
 *
 * - Sends the HttpOnly session cookie automatically (same origin).
 * - Unsafe requests carry the CSRF token, kept only in memory.
 * - A CSRF failure clears the token so the next attempt fetches a fresh one. Mutations are never replayed
 *   automatically; the user retries on purpose.
 * - A 401 that means "session ended" notifies the registered listener so the app can clear private data. So does a
 *   403 for an unconfirmed email: sign-in requires a confirmed email, so only a session from before that rule can get
 *   one, and it is treated as ended.
 */

const BASE = "/api/v1"

let csrf: CsrfToken | null = null
let csrfRequest: Promise<CsrfToken> | null = null
type SessionEndedListener = (error: ApiError) => void
let sessionEndedListener: SessionEndedListener | null = null

export function onSessionEnded(listener: SessionEndedListener | null) {
  sessionEndedListener = listener
}

/**
 * Forget the CSRF token, for example after sign-in, sign-out, demo entry, a password change, or a password reset
 * rotated or ended the session on the server.
 */
export function resetCsrf() {
  csrf = null
  csrfRequest = null
}

export async function ensureCsrf(force = false): Promise<CsrfToken> {
  if (force) {
    resetCsrf()
  }
  if (csrf) {
    return csrf
  }
  if (!csrfRequest) {
    csrfRequest = request<CsrfToken>("GET", "/auth/csrf")
      .then((token) => {
        csrf = token
        return token
      })
      .finally(() => {
        csrfRequest = null
      })
  }
  return csrfRequest
}

export type RequestOptions = {
  body?: unknown
  signal?: AbortSignal
  query?: Record<string, string | number | undefined | null | string[]>
}

export function buildQuery(query?: RequestOptions["query"]): string {
  if (!query) {
    return ""
  }
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") {
      continue
    }
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item))
    } else {
      params.set(key, String(value))
    }
  }
  const text = params.toString()
  return text ? "?" + text : ""
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" }
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json"
  }
  if (method !== "GET") {
    const token = await ensureCsrf()
    headers[token.headerName] = token.token
  }
  let response: Response
  try {
    response = await fetch(BASE + path + buildQuery(options.query), {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: "same-origin",
      cache: "no-store",
      signal: options.signal,
    })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") {
      throw cause
    }
    throw new ApiError(0, "NETWORK", "We couldn't reach NextStep. Check your connection and try again.")
  }
  if (response.status === 204) {
    return undefined as T
  }
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new ApiError(
      response.status,
      data?.code ?? "UNKNOWN",
      data?.message ?? "Something went wrong. Try again.",
      data?.fieldErrors ?? {},
      data?.requestId,
    )
    if (error.isCsrf) {
      resetCsrf()
    }
    if (error.isSessionEnded || error.isEmailNotVerified) {
      resetCsrf()
      sessionEndedListener?.(error)
    }
    throw error
  }
  return data as T
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>("GET", path, options),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, { body }),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, { body }),
  delete: (path: string, body?: unknown) => request<void>("DELETE", path, { body }),
}

