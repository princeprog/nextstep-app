import { describe, expect, it } from "vitest"

import { DEFAULT_SITE_URL, parseSiteUrl, PRIVACY_URL, TERMS_URL } from "./site"

describe("public site address", () => {
  it("uses the local static site when NEXT_PUBLIC_SITE_URL is unset or empty", () => {
    expect(parseSiteUrl(undefined)).toBe("http://localhost:3001")
    expect(parseSiteUrl("")).toBe(DEFAULT_SITE_URL)
    expect(parseSiteUrl("   ")).toBe(DEFAULT_SITE_URL)
  })

  it("drops trailing slashes and keeps a folder", () => {
    expect(parseSiteUrl("https://nextstep.example/")).toBe("https://nextstep.example")
    expect(parseSiteUrl(" https://example.com/nextstep// ")).toBe("https://example.com/nextstep")
  })

  it("refuses addresses that aren't plain http(s) URLs", () => {
    const refused = [
      "nextstep.example",
      "javascript:alert(1)",
      "ftp://nextstep.example",
      "https://user:pass@nextstep.example",
      "https://nextstep.example/?utm=1",
      "https://nextstep.example/#top",
    ]
    for (const value of refused) {
      expect(() => parseSiteUrl(value), value).toThrow(/NEXT_PUBLIC_SITE_URL/)
    }
  })

  it("builds the terms and privacy links from the configured site", () => {
    expect(TERMS_URL).toBe("http://localhost:3001/terms/")
    expect(PRIVACY_URL).toBe("http://localhost:3001/privacy/")
  })
})
