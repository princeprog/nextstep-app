import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { api, ensureCsrf } from "@/lib/api/client"
import { ApiError } from "@/lib/api/errors"
import { renderWithQueryClient } from "@/test/render"

import { SignInForm } from "./sign-in-form"

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }))
vi.mock("@/lib/api/client", () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ensureCsrf: vi.fn(),
  resetCsrf: vi.fn(),
}))

const HINT = "Just created your account? Confirm your email first; the link is in your inbox."

beforeEach(() => {
  vi.mocked(ensureCsrf).mockResolvedValue({ headerName: "X-CSRF-TOKEN", token: "t" })
  vi.mocked(api.get).mockRejectedValue(new ApiError(401, "UNAUTHENTICATED", "Sign in to continue."))
})

async function submit() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText("Email"), "ana@example.com")
  await user.type(screen.getByLabelText("Password"), "a long and random passphrase")
  await user.click(screen.getByRole("button", { name: "Sign in" }))
}

describe("SignInForm", () => {
  it("adds the confirm-first hint and a way to get a new link to every refused sign-in", async () => {
    // The API gives an unconfirmed account the same answer as a wrong password.
    vi.mocked(api.post).mockRejectedValue(new ApiError(401, "INVALID_CREDENTIALS", "Email or password is incorrect."))
    renderWithQueryClient(<SignInForm reason={null} />, { signedIn: false })

    await submit()

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Email or password is incorrect.")
    expect(alert).toHaveTextContent(HINT)
    expect(within(alert).getByRole("link", { name: "Get a new confirmation link" })).toHaveAttribute("href", "/resend-confirmation")
    expect(screen.getByLabelText("Email")).toHaveValue("ana@example.com")
    expect(screen.getByLabelText("Password")).toHaveValue("")
    expect(replace).not.toHaveBeenCalled()
  })

  it("keeps other failures to their own message", async () => {
    vi.mocked(api.post).mockRejectedValue(new ApiError(429, "RATE_LIMITED", "Too many attempts. Wait a few minutes and try again."))
    renderWithQueryClient(<SignInForm reason={null} />, { signedIn: false })

    await submit()

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Too many attempts. Wait a few minutes and try again.")
    expect(alert).not.toHaveTextContent(HINT)
    expect(screen.queryByRole("link", { name: "Get a new confirmation link" })).not.toBeInTheDocument()
  })

  it("explains a session that was ended because its email isn't confirmed", () => {
    renderWithQueryClient(<SignInForm reason="confirm-email" />, { signedIn: false })

    const notice = screen.getByRole("status")
    expect(notice).toHaveTextContent("Confirm your email address first, then sign in. The link is in your inbox.")
    expect(within(notice).getByRole("link", { name: "Get a new confirmation link" })).toHaveAttribute("href", "/resend-confirmation")
  })
})
