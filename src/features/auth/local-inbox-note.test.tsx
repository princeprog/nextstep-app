import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { api, ensureCsrf } from "@/lib/api/client"
import { ApiError } from "@/lib/api/errors"
import { renderWithQueryClient } from "@/test/render"

import { ForgotPasswordForm } from "./forgot-password-form"
import { RegisterForm } from "./register-form"
import { ResendConfirmation } from "./resend-confirmation"
import { SignInForm } from "./sign-in-form"

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }))
vi.mock("@/lib/api/client", () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ensureCsrf: vi.fn(),
  resetCsrf: vi.fn(),
}))

const INBOX = "http://127.0.0.1:8025/"

beforeEach(() => {
  vi.mocked(ensureCsrf).mockResolvedValue({ headerName: "X-CSRF-TOKEN", token: "t" })
  vi.mocked(api.get).mockRejectedValue(new ApiError(401, "UNAUTHENTICATED", "Sign in to continue."))
})

async function requestLink(submitLabel: string) {
  vi.mocked(api.post).mockResolvedValue({})
  const user = userEvent.setup()
  await user.type(screen.getByLabelText("Email"), "ana@example.com")
  await user.click(screen.getByRole("button", { name: submitLabel }))
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("we've sent"))
}

async function signIn() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText("Email"), "ana@example.com")
  await user.type(screen.getByLabelText("Password"), "a long and random passphrase")
  await user.click(screen.getByRole("button", { name: "Sign in" }))
}

// Every screen that says an email was sent, or that the link is in the inbox, and how to get it to say so.
const screens = [
  {
    name: "Check your email, after registering",
    show: (localInboxUrl: string | null) => <RegisterForm localInboxUrl={localInboxUrl} />,
    async reachMessage() {
      vi.mocked(api.post).mockResolvedValue({ email: "ana@example.com" })
      const user = userEvent.setup()
      await user.type(screen.getByLabelText("Name"), "Ana Cruz")
      await user.type(screen.getByLabelText("Email"), "ana@example.com")
      await user.type(screen.getByLabelText("Password"), "a long and random passphrase")
      await user.click(screen.getByRole("button", { name: "Create account" }))
      await screen.findByRole("heading", { level: 1, name: "Check your email" })
    },
  },
  {
    name: "Forgot password",
    show: (localInboxUrl: string | null) => <ForgotPasswordForm localInboxUrl={localInboxUrl} />,
    reachMessage: () => requestLink("Send reset link"),
  },
  {
    name: "Get a new confirmation link",
    show: (localInboxUrl: string | null) => <ResendConfirmation localInboxUrl={localInboxUrl} />,
    reachMessage: () => requestLink("Send a new link"),
  },
  {
    name: "Sign-in refusal",
    show: (localInboxUrl: string | null) => <SignInForm reason={null} localInboxUrl={localInboxUrl} />,
    async reachMessage() {
      vi.mocked(api.post).mockRejectedValue(new ApiError(401, "INVALID_CREDENTIALS", "Email or password is incorrect."))
      await signIn()
      await screen.findByRole("alert")
    },
  },
]

describe.each(screens)("$name", ({ show, reachMessage }) => {
  it("points a local run to the test inbox, which opens in a new tab", async () => {
    renderWithQueryClient(show(INBOX), { signedIn: false })
    expect(screen.queryByRole("note")).not.toBeInTheDocument()

    await reachMessage()

    const note = screen.getByRole("note")
    expect(note).toHaveTextContent("This is a local run, so emails go to the local test inbox instead of the real inbox.")
    const link = within(note).getByRole("link", { name: "Open the test inbox (opens in a new tab)" })
    expect(link).toHaveAttribute("href", INBOX)
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noreferrer")
    // Status messages announce exactly what they announce in production.
    for (const status of screen.queryAllByRole("status")) {
      expect(status).not.toContainElement(note)
    }
  })

  it("adds nothing when LOCAL_INBOX_URL is unset or invalid", async () => {
    renderWithQueryClient(show(null), { signedIn: false })

    await reachMessage()

    expect(screen.queryByRole("note")).not.toBeInTheDocument()
  })
})

describe("sign-in", () => {
  it("adds the note to the notice that asks to confirm the email first", () => {
    renderWithQueryClient(<SignInForm reason="confirm-email" localInboxUrl={INBOX} />, { signedIn: false })

    expect(within(screen.getByRole("note")).getByRole("link", { name: /^Open the test inbox/ })).toHaveAttribute("href", INBOX)
  })

  it("leaves out the note when a refusal doesn't mention the inbox", async () => {
    vi.mocked(api.post).mockRejectedValue(new ApiError(429, "RATE_LIMITED", "Too many attempts. Wait a few minutes and try again."))
    renderWithQueryClient(<SignInForm reason={null} localInboxUrl={INBOX} />, { signedIn: false })

    await signIn()

    expect(await screen.findByRole("alert")).toHaveTextContent("Too many attempts.")
    expect(screen.queryByRole("note")).not.toBeInTheDocument()
  })
})
