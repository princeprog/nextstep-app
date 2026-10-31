import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { api } from "@/lib/api/client"
import { ApiError } from "@/lib/api/errors"
import { renderWithQueryClient } from "@/test/render"

import { VerifyEmail } from "./verify-email"

vi.mock("@/lib/api/client", () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ensureCsrf: vi.fn(),
  resetCsrf: vi.fn(),
}))

const TOKEN = "Qm9vdHN0cmFwLXRva2VuLWZvci10ZXN0cy0xMjM0NTY"

beforeEach(() => {
  window.history.replaceState(null, "", "/verify-email#token=" + TOKEN)
  vi.mocked(api.post).mockResolvedValue(undefined)
})

afterEach(() => {
  window.history.replaceState(null, "", "/")
})

async function confirmButton() {
  const button = await screen.findByRole("button", { name: "Confirm email address" })
  // Busy and not-yet-ready buttons stay focusable and are marked aria-disabled instead.
  await waitFor(() => expect(button).not.toHaveAttribute("aria-disabled", "true"))
  return button
}

describe("VerifyEmail", () => {
  it("confirms only when asked, after taking the token out of the address", async () => {
    renderWithQueryClient(<VerifyEmail />, { signedIn: false })

    const button = await confirmButton()
    expect(window.location.hash).toBe("")
    expect(api.post).not.toHaveBeenCalled()

    await userEvent.setup().click(button)

    expect(api.post).toHaveBeenCalledWith("/auth/verify-email", { token: TOKEN })
    expect(await screen.findByRole("heading", { level: 1, name: "Email confirmed" })).toHaveFocus()
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login?reason=verified")
    expect(api.get).not.toHaveBeenCalled()
  })

  it("offers a new link when the link no longer works", async () => {
    vi.mocked(api.post).mockImplementation(async (path) => {
      if (path === "/auth/verify-email") {
        throw new ApiError(400, "TOKEN_INVALID", "This link is invalid, was already used, or has expired. Request a new one.")
      }
      return {}
    })
    renderWithQueryClient(<VerifyEmail />, { signedIn: false })
    const user = userEvent.setup()
    await user.click(await confirmButton())

    expect(await screen.findByRole("heading", { level: 1, name: "This link doesn't work" })).toHaveFocus()
    await user.type(screen.getByLabelText("Email"), "ana@example.com")
    await user.click(screen.getByRole("button", { name: "Send a new link" }))

    expect(api.post).toHaveBeenLastCalledWith("/auth/verify-email/resend", { email: "ana@example.com" })
    expect(await screen.findByRole("status")).toHaveTextContent(
      "If ana@example.com is waiting to be confirmed, we've sent it a new link. It expires in 24 hours.",
    )
  })

  it("explains a link that arrived without its token", async () => {
    window.history.replaceState(null, "", "/verify-email")
    renderWithQueryClient(<VerifyEmail />, { signedIn: false })

    expect(await screen.findByRole("heading", { level: 1, name: "This link is incomplete" })).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it("keeps the button for another try when confirming fails for another reason", async () => {
    vi.mocked(api.post).mockRejectedValue(new ApiError(429, "RATE_LIMITED", "Too many attempts. Wait a few minutes and try again."))
    renderWithQueryClient(<VerifyEmail />, { signedIn: false })

    await userEvent.setup().click(await confirmButton())

    expect(await screen.findByRole("alert")).toHaveTextContent("Too many attempts. Wait a few minutes and try again.")
    expect(screen.getByRole("button", { name: "Confirm email address" })).not.toHaveAttribute("aria-disabled", "true")
  })
})
