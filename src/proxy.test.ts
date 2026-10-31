// @vitest-environment node
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server"
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

import { config, proxy } from "./proxy"

const page = (path: string) => new NextRequest(new URL(path, "http://localhost:3000"))

describe("proxy", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("sends a CSP with a new nonce on every response and passes it on for rendering", () => {
    const first = proxy(page("/login"))
    const second = proxy(page("/login"))
    const policy = first.headers.get("content-security-policy") ?? ""

    expect(policy).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]{16,}' 'strict-dynamic'/)
    expect(second.headers.get("content-security-policy")).not.toBe(policy)
    // Next.js reads the nonce from the request's CSP header, which the proxy forwards.
    expect(first.headers.get("x-middleware-request-content-security-policy")).toBe(policy)
    expect(first.headers.get("strict-transport-security")).toBeNull()
  })

  it("adds HSTS and upgrade-insecure-requests when APP_HTTPS=true at request time", () => {
    vi.stubEnv("APP_HTTPS", "true")
    const response = proxy(page("/dashboard"))
    expect(response.headers.get("strict-transport-security")).toBe("max-age=31536000; includeSubDomains")
    expect(response.headers.get("content-security-policy")).toContain("upgrade-insecure-requests")
  })

  it("runs for pages, not for API calls, build assets, metadata files, or router prefetches", () => {
    const runsFor = (url: string, headers?: Record<string, string>) => unstable_doesMiddlewareMatch({ config, url, headers })
    expect(runsFor("/")).toBe(true)
    expect(runsFor("/login")).toBe(true)
    expect(runsFor("/applications/0b6c3f0e-1111-4c2b-9d7e-123456789abc/edit")).toBe(true)
    expect(runsFor("/api/v1/me")).toBe(false)
    expect(runsFor("/_next/static/chunks/main.js")).toBe(false)
    expect(runsFor("/icon.svg")).toBe(false)
    expect(runsFor("/robots.txt")).toBe(false)
    expect(runsFor("/dashboard", { "next-router-prefetch": "1" })).toBe(false)
  })
})
