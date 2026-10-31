import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { api, onSessionEnded, resetCsrf } from "./client"
import { ApiError } from "./errors"

type Call = { url: string; init: RequestInit }

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })
}

let calls: Call[]
let responses: (() => Response | Promise<Response>)[]

beforeEach(() => {
  calls = []
  responses = []
  resetCsrf()
  onSessionEnded(null)
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init })
    const next = responses.shift()
    if (!next) {
      throw new Error("Unexpected request to " + url)
    }
    return next()
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const csrfResponse = (token: string) => () => json(200, { headerName: "X-CSRF-TOKEN", token })
const header = (call: Call, name: string) => (call.init.headers as Record<string, string>)[name]

describe("api client", () => {
  it("sends the CSRF token on unsafe requests and not on reads", async () => {
    responses.push(() => json(200, { items: [] }), csrfResponse("token-1"), () => json(201, { id: "a" }))

    await api.get("/applications")
    await api.post("/applications", { company: "Acme" })

    expect(calls.map((call) => call.url)).toEqual(["/api/v1/applications", "/api/v1/auth/csrf", "/api/v1/applications"])
    expect(header(calls[0], "X-CSRF-TOKEN")).toBeUndefined()
    expect(header(calls[2], "X-CSRF-TOKEN")).toBe("token-1")
    expect(calls[2].init.credentials).toBe("same-origin")
    expect(calls[2].init.body).toBe(JSON.stringify({ company: "Acme" }))
  })

  it("does not replay a mutation after a CSRF failure, and fetches a fresh token for the next attempt", async () => {
    responses.push(
      csrfResponse("stale"),
      () => json(403, { code: "CSRF_INVALID", message: "expired" }),
      csrfResponse("fresh"),
      () => json(200, { id: "a" }),
    )

    const failure = await api.patch("/applications/a", { notes: "x" }).catch((error) => error)
    expect(failure).toBeInstanceOf(ApiError)
    expect((failure as ApiError).isCsrf).toBe(true)
    expect(calls).toHaveLength(2)

    await api.patch("/applications/a", { notes: "x" })
    expect(calls).toHaveLength(4)
    expect(calls[2].url).toBe("/api/v1/auth/csrf")
    expect(header(calls[3], "X-CSRF-TOKEN")).toBe("fresh")
  })

  it("reports an ended session but not a failed sign-in", async () => {
    const listener = vi.fn()
    onSessionEnded(listener)
    responses.push(
      () => json(401, { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." }),
      () => json(401, { code: "UNAUTHENTICATED", message: "Sign in to continue." }),
      () => json(401, { code: "DEMO_EXPIRED", message: "This demo has expired." }),
    )

    await api.get("/auth/login").catch(() => undefined)
    expect(listener).not.toHaveBeenCalled()
    await api.get("/dashboard").catch(() => undefined)
    await api.get("/dashboard").catch(() => undefined)
    expect(listener).toHaveBeenCalledTimes(2)
    expect(listener.mock.calls[1][0].code).toBe("DEMO_EXPIRED")
  })

  it("keeps field errors from validation failures", async () => {
    responses.push(csrfResponse("t"), () => json(422, {
      code: "VALIDATION_ERROR",
      message: "Check the highlighted fields.",
      fieldErrors: { company: "Enter a company name." },
      requestId: "req-1",
    }))

    const error = (await api.post("/applications", {}).catch((cause) => cause)) as ApiError
    expect(error.status).toBe(422)
    expect(error.fieldErrors).toEqual({ company: "Enter a company name." })
    expect(error.requestId).toBe("req-1")
  })

  it("turns network failures into a retryable error", async () => {
    responses.push(() => Promise.reject(new TypeError("Failed to fetch")))
    const error = (await api.get("/dashboard").catch((cause) => cause)) as ApiError
    expect(error.isNetwork).toBe(true)
    expect(error.message).toMatch(/couldn't reach/)
  })
})

