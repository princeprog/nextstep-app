// @vitest-environment node
import { describe, expect, it } from "vitest"

import { parseLocalInboxUrl } from "./local-inbox"

describe("local test inbox address (LOCAL_INBOX_URL)", () => {
  it("accepts an http or https address", () => {
    expect(parseLocalInboxUrl("http://127.0.0.1:8025")).toBe("http://127.0.0.1:8025/")
    expect(parseLocalInboxUrl(" https://mail.nextstep.localhost/inbox ")).toBe("https://mail.nextstep.localhost/inbox")
  })

  it("is off when unset, empty, or not a plain http(s) address", () => {
    const off = [
      undefined,
      "",
      "   ",
      "127.0.0.1:8025",
      "localhost:8025",
      "javascript:alert(1)",
      "file:///C:/inbox.html",
      "ftp://127.0.0.1:8025",
      "http://user:pass@127.0.0.1:8025",
    ]
    for (const value of off) {
      expect(parseLocalInboxUrl(value), String(value)).toBeNull()
    }
  })
})
