import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { api, ensureCsrf } from "@/lib/api/client"
import { ApiError } from "@/lib/api/errors"
import { renderWithQueryClient } from "@/test/render"

import { RegisterForm } from "./register-form"

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }))
vi.mock("@/lib/api/client", () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ensureCsrf: vi.fn(),
  resetCsrf: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(ensureCsrf).mockResolvedValue({ headerName: "X-CSRF-TOKEN", token: "t" })
  vi.mocked(api.get).mockRejectedValue(new ApiError(401, "UNAUTHENTICATED", "Sign in to continue."))
})

async function fillAndSubmit(email: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText("Name"), "Ana Cruz")
  await user.type(screen.getByLabelText("Email"), email)
  await user.type(screen.getByLabelText("Password"), "a long and random passphrase")
  await user.click(screen.getByRole("button", { name: "Create account" }))
  return user
}

describe("RegisterForm", () => {
  it("links the Terms of use and the Privacy policy on the public site, opening in the same tab", () => {
    renderWithQueryClient(<RegisterForm localInboxUrl={null} />, { signedIn: false })

    const terms = screen.getByRole("link", { name: "Terms of use" })
    const privacy = screen.getByRole("link", { name: "Privacy policy" })
    expect(terms).toHaveAttribute("href", "http://localhost:3001/terms/")
    expect(privacy).toHaveAttribute("href", "http://localhost:3001/privacy/")
    expect(terms).not.toHaveAttribute("target")
    expect(privacy).not.toHaveAttribute("target")
    expect(terms.closest("p")).toHaveTextContent(
      "By creating an account, you agree to the Terms of use. Read how your data is handled in the Privacy policy.",
    )
  })

  it("ends on a check-your-email screen with the address the API used, and resends to it", async () => {
    vi.mocked(api.post).mockImplementation(async (path) => (path === "/auth/register" ? { email: "ana@example.com" } : {}))
    renderWithQueryClient(<RegisterForm localInboxUrl={null} />, { signedIn: false })

    const user = await fillAndSubmit("Ana@Example.com")

    const heading = await screen.findByRole("heading", { level: 1, name: "Check your email" })
    expect(heading).toHaveFocus()
    expect(screen.getByText("ana@example.com")).toBeInTheDocument()
    expect(ensureCsrf).toHaveBeenCalledWith(true)
    expect(api.post).toHaveBeenCalledWith("/auth/register", expect.objectContaining({ displayName: "Ana Cruz", email: "Ana@Example.com" }))
    expect(replace).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Resend email" }))
    expect(api.post).toHaveBeenLastCalledWith("/auth/verify-email/resend", { email: "ana@example.com" })
    expect(await screen.findByRole("status")).toHaveTextContent(
      "If this address is waiting to be confirmed, a new link is on its way. Only the newest link works.",
    )
  })

  it("explains a refused resend and lets a mistyped address be corrected", async () => {
    vi.mocked(api.post).mockImplementation(async (path) => {
      if (path === "/auth/register") {
        return { email: "ana@exmaple.com" }
      }
      throw new ApiError(429, "RATE_LIMITED", "Too many attempts. Wait a few minutes and try again.")
    })
    renderWithQueryClient(<RegisterForm localInboxUrl={null} />, { signedIn: false })
    const user = await fillAndSubmit("ana@exmaple.com")
    await screen.findByRole("heading", { level: 1, name: "Check your email" })

    await user.click(screen.getByRole("button", { name: "Resend email" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many attempts. Wait a few minutes and try again.")

    await user.click(screen.getByRole("button", { name: "Change email address" }))
    const email = screen.getByLabelText("Email")
    expect(email).toHaveFocus()
    expect(email).toHaveValue("ana@exmaple.com")
    expect(screen.getByLabelText("Name")).toHaveValue("Ana Cruz")
    expect(screen.getByLabelText("Password")).toHaveValue("")
  })

  it("shows a refused password next to the field with the rules", async () => {
    vi.mocked(api.post).mockRejectedValue(new ApiError(422, "VALIDATION_ERROR", "Check the highlighted fields.", {
      password: "This password has appeared in a data breach. Choose a different one.",
    }))
    renderWithQueryClient(<RegisterForm localInboxUrl={null} />, { signedIn: false })

    await fillAndSubmit("ana@example.com")

    const password = screen.getByLabelText("Password")
    expect(await screen.findByText("This password has appeared in a data breach. Choose a different one.")).toHaveAttribute("id", "password-error")
    expect(password).toHaveAttribute("aria-invalid", "true")
    expect(password).toHaveAttribute("aria-describedby", "password-hint password-error")
    expect(screen.getByText(/Passwords found in data breaches aren't accepted/)).toHaveAttribute("id", "password-hint")
    expect(password).toHaveValue("")
    expect(screen.getByLabelText("Email")).toHaveValue("ana@example.com")
  })
})
