import { act, fireEvent, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { api } from "@/lib/api/client"
import { useUiStore } from "@/stores/ui-store"
import { renderWithQueryClient, TEST_ME } from "@/test/render"

import { InterviewDialog } from "./interview-dialog"

vi.mock("@/lib/api/client", () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))

beforeEach(() => {
  useUiStore.getState().reset()
  vi.mocked(api.get).mockImplementation(async (path) =>
    path === "/me" ? TEST_ME : { items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 },
  )
  vi.mocked(api.post).mockResolvedValue({ id: "interview-1" })
})

describe("InterviewDialog", () => {
  it("keeps the application it was opened from and shows no picker", async () => {
    act(() => useUiStore.getState().openInterviewDialog({ applicationId: "app-1" }))
    renderWithQueryClient(<InterviewDialog />)
    const user = userEvent.setup()

    await screen.findByRole("dialog", { name: "Add an interview" })
    expect(screen.queryByRole("combobox", { name: "Application" })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-11-05" } })
    fireEvent.change(screen.getByLabelText("Start time"), { target: { value: "10:00" } })
    await waitFor(() => expect(screen.getByLabelText("Time zone")).toHaveValue("Asia/Manila"))
    await user.click(screen.getByRole("button", { name: "Add interview" }))

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/interviews", expect.objectContaining({
        applicationId: "app-1",
        localDate: "2026-11-05",
        localTime: "10:00",
        timeZone: "Asia/Manila",
      })),
    )
  })

  it("asks for an application when opened from the interview list", async () => {
    act(() => useUiStore.getState().openInterviewDialog())
    renderWithQueryClient(<InterviewDialog />)

    expect(await screen.findByRole("combobox", { name: "Application" })).toBeInTheDocument()
  })
})
