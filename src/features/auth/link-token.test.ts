import { renderHook, waitFor } from "@testing-library/react"
import { StrictMode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { takeLinkToken, tokenFromHash, useLinkToken } from "./link-token"

const TOKEN = "Qm9vdHN0cmFwLXRva2VuLWZvci10ZXN0cy0xMjM0NTY"

afterEach(() => {
  window.history.replaceState(null, "", "/")
})

describe("link tokens", () => {
  it("reads the token from a fragment", () => {
    expect(tokenFromHash("#token=" + TOKEN)).toBe(TOKEN)
    expect(tokenFromHash("token=" + TOKEN + "&utm_source=mail")).toBe(TOKEN)
    expect(tokenFromHash("")).toBeNull()
    expect(tokenFromHash("#")).toBeNull()
    expect(tokenFromHash("#token=")).toBeNull()
    expect(tokenFromHash("#other=1")).toBeNull()
  })

  it("removes the fragment from the address bar without adding a history entry", () => {
    window.history.replaceState(null, "", "/verify-email?from=mail#token=" + TOKEN)
    const entries = window.history.length

    expect(takeLinkToken()).toBe(TOKEN)
    expect(window.location.hash).toBe("")
    expect(window.location.pathname + window.location.search).toBe("/verify-email?from=mail")
    expect(window.history.length).toBe(entries)
  })

  it("leaves an address without a fragment alone", () => {
    window.history.replaceState(null, "", "/reset-password")
    const history = { replaceState: vi.fn() }

    expect(takeLinkToken({ location: window.location, history })).toBeNull()
    expect(history.replaceState).not.toHaveBeenCalled()
  })

  it("keeps the token when Strict Mode runs the effect twice", async () => {
    window.history.replaceState(null, "", "/verify-email#token=" + TOKEN)

    const { result } = renderHook(() => useLinkToken(), { wrapper: StrictMode })

    await waitFor(() => expect(result.current).toBe(TOKEN))
    expect(window.location.hash).toBe("")
  })

  it("reports a missing token as null once the address has been read", async () => {
    window.history.replaceState(null, "", "/verify-email")

    const { result } = renderHook(() => useLinkToken())

    await waitFor(() => expect(result.current).toBeNull())
  })

  it("takes a newer link opened in the same tab, which changes only the fragment", async () => {
    window.history.replaceState(null, "", "/verify-email#token=" + TOKEN)
    const { result } = renderHook(() => useLinkToken())
    await waitFor(() => expect(result.current).toBe(TOKEN))

    window.location.hash = "#token=newer-" + TOKEN

    await waitFor(() => expect(result.current).toBe("newer-" + TOKEN))
    expect(window.location.hash).toBe("")
  })
})
