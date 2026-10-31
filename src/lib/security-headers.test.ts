import { describe, expect, it } from "vitest"

import { contentSecurityPolicy, servedOverHttps } from "./security-headers"

const directives = (policy: string) => new Map(policy.split("; ").map((part) => {
  const [name, ...values] = part.split(" ")
  return [name, values] as const
}))

describe("content security policy", () => {
  it("lets only scripts with this response's nonce run in production", () => {
    expect(contentSecurityPolicy({ nonce: "abc123", development: false, https: false })).toBe(
      "default-src 'self'; script-src 'self' 'nonce-abc123' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; " +
        "form-action 'self'; frame-ancestors 'none'",
    )
  })

  it("relaxes only eval for next dev", () => {
    const production = directives(contentSecurityPolicy({ nonce: "n", development: false, https: false }))
    const development = directives(contentSecurityPolicy({ nonce: "n", development: true, https: false }))
    expect(development.get("script-src")).toEqual([...production.get("script-src")!, "'unsafe-eval'"])
    development.delete("script-src")
    production.delete("script-src")
    expect(development).toEqual(production)
  })

  it("upgrades insecure requests only behind HTTPS", () => {
    expect(contentSecurityPolicy({ nonce: "n", development: false, https: true })).toMatch(/; upgrade-insecure-requests$/)
    expect(contentSecurityPolicy({ nonce: "n", development: false, https: false })).not.toContain("upgrade-insecure-requests")
  })

  it("treats only APP_HTTPS=true as HTTPS", () => {
    expect(servedOverHttps({ APP_HTTPS: "true" })).toBe(true)
    for (const value of [undefined, "", "1", "TRUE", "yes", "false"]) {
      expect(servedOverHttps({ APP_HTTPS: value }), String(value)).toBe(false)
    }
  })
})
