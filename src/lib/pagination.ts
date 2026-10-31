/**
 * A 1-based page number from the URL. Anything else (missing, zero, negative, fractional, or too large) means page 1,
 * so a bad link still shows a list instead of an API validation error.
 */
export function parsePage(value: string | null): number {
  const page = Number(value)
  return Number.isSafeInteger(page) && page >= 1 ? page : 1
}
