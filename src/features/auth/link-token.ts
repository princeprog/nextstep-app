"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Email links carry a one-time token in the URL fragment (/verify-email#token=…, /reset-password#token=…). Browsers
 * never send the fragment to a server, so the token stays out of server, proxy, and analytics logs.
 */

/** The token in a fragment such as "#token=abc", or null when there is none. */
export function tokenFromHash(hash: string): string | null {
  const token = new URLSearchParams(hash.replace(/^#/, "")).get("token")?.trim()
  return token ? token : null
}

type AddressBar = {
  location: Pick<Location, "hash" | "pathname" | "search">
  history: Pick<History, "replaceState">
}

/**
 * Reads the token from the address bar and removes the fragment, so the token doesn't stay on screen, in the history
 * entry, or in a bookmark. Returns null when the address has no token.
 */
export function takeLinkToken({ location, history }: AddressBar = window): string | null {
  const token = tokenFromHash(location.hash)
  if (location.hash) {
    // Next.js keeps its router in step with replaceState calls (see its Linking and Navigating guide).
    history.replaceState(null, "", location.pathname + location.search)
  }
  return token
}

/**
 * The current page's link token: undefined until it is read after hydration, then the token, or null when the
 * address had none. Opening a newer link in the same tab changes only the fragment, which doesn't reload the page,
 * so the new token replaces the old one.
 */
export function useLinkToken(): string | null | undefined {
  const taken = useRef<string | null | undefined>(undefined)
  const [token, setToken] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    // Read once per mount. Development Strict Mode runs effects twice, and by then the fragment is gone.
    if (taken.current === undefined) {
      taken.current = takeLinkToken()
    }
    setToken(taken.current)

    function onHashChange() {
      const next = takeLinkToken()
      if (next) {
        taken.current = next
        setToken(next)
      }
    }
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [])
  return token
}
