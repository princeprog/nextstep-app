/** A failed API call, normalized so screens can show field messages and the right recovery action. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors: Record<string, string>
  readonly requestId?: string

  constructor(status: number, code: string, message: string, fieldErrors: Record<string, string> = {}, requestId?: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
    this.requestId = requestId
  }

  get isNetwork() {
    return this.status === 0
  }

  /** The session ended (signed out elsewhere, timed out, or demo expired). */
  get isSessionEnded() {
    return this.status === 401 && (this.code === "UNAUTHENTICATED" || this.code === "DEMO_EXPIRED")
  }

  get isCsrf() {
    return this.status === 403 && this.code === "CSRF_INVALID"
  }

  /**
   * The account's email isn't confirmed, so the API refuses workspace requests. Sign-in requires a confirmed email, so
   * only a session started before that rule can get this answer.
   */
  get isEmailNotVerified() {
    return this.status === 403 && this.code === "EMAIL_NOT_VERIFIED"
  }

  /** An email link that is unknown, already used, replaced by a newer one, or expired. */
  get isTokenInvalid() {
    return this.status === 400 && this.code === "TOKEN_INVALID"
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError
}

/** A short message for toasts and alerts. Field-level details are shown next to their inputs instead. */
export function errorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.isCsrf) {
      return "Your security token was refreshed. Please try that again."
    }
    if (error.code === "VALIDATION_ERROR") {
      return "Check the highlighted fields."
    }
    return error.message
  }
  return "Something went wrong. Try again."
}

