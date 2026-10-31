import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { api, type RequestOptions } from "@/lib/api/client"
import { ApiError } from "@/lib/api/errors"
import type { ApplicationPage } from "@/lib/api/types"

import { ApplicationPicker } from "./application-picker"

vi.mock("@/lib/api/client", () => ({ api: { get: vi.fn() } }))

type Row = { id: string; company: string; jobTitle: string }

const HARBOR: Row = { id: "app-harbor", company: "Harbor Labs", jobTitle: "Frontend Developer" }
const BLUEPEAK: Row = { id: "app-bluepeak", company: "Bluepeak Health", jobTitle: "UX Researcher" }

function page(items: Row[], total = items.length): ApplicationPage {
  return { items: items as ApplicationPage["items"], page: 1, pageSize: 20, total, totalPages: total ? 1 : 0 }
}

const get = vi.mocked(api.get)
const searches = () => get.mock.calls.map(([, options]) => (options as RequestOptions).query?.search)

/** Answers each search with the given function; the default lists HARBOR and BLUEPEAK and filters by company. */
function respond(answer: (search: string | undefined, signal?: AbortSignal) => Promise<unknown>) {
  get.mockImplementation((_path, options) => answer(options?.query?.search as string | undefined, options?.signal))
}

function renderPicker(props: { invalid?: boolean; describedBy?: string } = {}) {
  const onChange = vi.fn()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function Harness() {
    const [value, setValue] = useState("")
    return (
      <>
        <label htmlFor="picker">Application</label>
        <ApplicationPicker id="picker" value={value} {...props}
          onChange={(id) => {
            setValue(id)
            onChange(id)
          }} />
      </>
    )
  }
  render(
    <QueryClientProvider client={client}>
      <Harness />
    </QueryClientProvider>,
  )
  return { onChange, input: screen.getByRole("combobox", { name: "Application" }), user: userEvent.setup() }
}

beforeEach(() => {
  get.mockReset()
  respond(async (search) =>
    page([BLUEPEAK, HARBOR].filter((row) => !search || row.company.toLowerCase().includes(search.toLowerCase()))),
  )
})

describe("ApplicationPicker", () => {
  it("lists active applications A–Z from the API when opened", async () => {
    const { input, user } = renderPicker()
    await user.click(input)

    expect(await screen.findByRole("option", { name: /Bluepeak Health/ })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: /Harbor Labs/ })).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith("/applications", expect.objectContaining({
      query: { search: undefined, archive: "active", pageSize: 20, sort: "company", direction: "asc" },
    }))
  })

  it("searches the API once typing pauses, not on every keystroke", async () => {
    const { input, user } = renderPicker()
    await user.type(input, "harbor")

    expect(await screen.findByRole("option", { name: /Harbor Labs/ })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: /Bluepeak/ })).not.toBeInTheDocument()
    expect(searches()).toEqual([undefined, "harbor"])
  })

  it("cancels the request for a search that was replaced", async () => {
    let outdated: AbortSignal | undefined
    respond((search, signal) => {
      if (search === "harb") {
        outdated = signal
        return new Promise(() => {})
      }
      return Promise.resolve(page(search ? [HARBOR] : [BLUEPEAK, HARBOR]))
    })
    const { input, user } = renderPicker()
    await user.type(input, "harb")
    await waitFor(() => expect(searches()).toContain("harb"))

    await user.type(input, "or")
    await waitFor(() => expect(searches()).toContain("harbor"))
    expect(outdated?.aborted).toBe(true)
    expect(await screen.findByRole("option", { name: /Harbor Labs/ })).toBeInTheDocument()
  })

  it("selects an application with the keyboard and reports its id", async () => {
    const { input, onChange, user } = renderPicker()
    await user.type(input, "harbor")
    await screen.findByRole("option", { name: /Harbor Labs/ })

    await user.keyboard("{ArrowDown}{Enter}")
    expect(onChange).toHaveBeenLastCalledWith("app-harbor")
    expect(input).toHaveValue("Harbor Labs — Frontend Developer")
  })

  it("offers nothing to pick until results for the typed text arrive", async () => {
    const { input, onChange, user } = renderPicker()
    await user.click(input)
    await screen.findByRole("option", { name: /Bluepeak Health/ })

    // Older results disappear as soon as the text changes, so a quick Enter can't pick a stale match.
    await user.type(input, "harbor")
    expect(screen.queryByRole("option")).not.toBeInTheDocument()
    expect(screen.getByText("Searching…")).toBeInTheDocument()
    await user.keyboard("{ArrowDown}{Enter}")
    expect(onChange).not.toHaveBeenCalled()
  })

  it("says how many more matches there are", async () => {
    respond(async () => page([HARBOR], 35))
    const { input, user } = renderPicker()
    await user.type(input, "a")

    expect(await screen.findByText("Showing 1 of 35 matches. Keep typing to narrow the list.")).toBeInTheDocument()
  })

  it("explains when nothing matches", async () => {
    const { input, user } = renderPicker()
    await user.type(input, "zzz")

    expect(await screen.findByText("No active applications match “zzz”.")).toBeInTheDocument()
    expect(screen.queryByRole("option")).not.toBeInTheDocument()
  })

  it("shows a loading status until the first results arrive", async () => {
    respond(() => new Promise(() => {}))
    const { input, user } = renderPicker()
    await user.click(input)

    expect(await screen.findByText("Loading applications…")).toBeInTheDocument()
  })

  it("reports a failed search and retries when the list is reopened", async () => {
    respond(() => Promise.reject(new ApiError(0, "NETWORK", "We couldn't reach NextStep. Check your connection and try again.")))
    const { input, user } = renderPicker()
    await user.click(input)
    expect(await screen.findByText(/We couldn't reach NextStep\..*reopen the list to try again\./)).toBeInTheDocument()

    respond(async () => page([HARBOR]))
    await user.keyboard("{Escape}")
    await user.click(input)
    expect(await screen.findByRole("option", { name: /Harbor Labs/ })).toBeInTheDocument()
  })

  it("passes the field's invalid state and error message to the input", () => {
    const { input } = renderPicker({ invalid: true, describedBy: "picker-error" })
    expect(input).toHaveAttribute("aria-invalid", "true")
    expect(input).toHaveAttribute("aria-describedby", "picker-error")
    expect(screen.getByRole("button", { name: "Show applications" })).toBeInTheDocument()
  })
})
