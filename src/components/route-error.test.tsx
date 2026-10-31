import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { RouteError } from "./route-error"

describe("RouteError", () => {
  it("offers a retry and a way out without showing the error's message", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const retry = vi.fn()
    render(<RouteError error={new Error("Cannot read properties of undefined (reading 'items')")} retry={retry} />)

    expect(screen.getByRole("heading", { level: 1, name: "Something went wrong" })).toBeInTheDocument()
    expect(screen.queryByText(/Cannot read properties/)).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Go to dashboard" })).toHaveAttribute("href", "/dashboard")
    await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }))
    expect(retry).toHaveBeenCalledOnce()
    expect(consoleError).toHaveBeenCalled()
  })
})
