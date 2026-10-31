import { act, fireEvent, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { api } from "@/lib/api/client"
import { useUiStore } from "@/stores/ui-store"
import { renderWithQueryClient, TEST_ME } from "@/test/render"

import { TaskDialog } from "./task-dialog"

vi.mock("@/lib/api/client", () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))

beforeEach(() => {
  useUiStore.getState().reset()
  vi.mocked(api.get).mockImplementation(async (path) =>
    path === "/me" ? TEST_ME : { items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 },
  )
  vi.mocked(api.post).mockResolvedValue({ id: "task-1" })
})

describe("TaskDialog", () => {
  it("keeps the application it was opened from and shows no picker", async () => {
    act(() => useUiStore.getState().openTaskDialog({ applicationId: "app-1" }))
    renderWithQueryClient(<TaskDialog />)
    const user = userEvent.setup()

    await screen.findByRole("dialog", { name: "Add a task" })
    expect(screen.queryByRole("combobox", { name: "Application" })).not.toBeInTheDocument()
    await user.type(screen.getByLabelText("Task"), "Send a follow-up")
    fireEvent.change(screen.getByLabelText("Due date"), { target: { value: "2026-11-05" } })
    await waitFor(() => expect(screen.getByLabelText("Time zone")).toHaveValue("Asia/Manila"))
    await user.click(screen.getByRole("button", { name: "Add task" }))

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith("/tasks", expect.objectContaining({
        applicationId: "app-1",
        title: "Send a follow-up",
        dueDate: "2026-11-05",
        timeZone: "Asia/Manila",
      })),
    )
    await waitFor(() => expect(useUiStore.getState().taskDialog.open).toBe(false))
  })

  it("asks for an application when opened from the task list", async () => {
    act(() => useUiStore.getState().openTaskDialog())
    renderWithQueryClient(<TaskDialog />)

    expect(await screen.findByRole("combobox", { name: "Application" })).toBeInTheDocument()
  })
})
