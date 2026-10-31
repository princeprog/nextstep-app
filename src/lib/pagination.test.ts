import { describe, expect, it } from "vitest"

import { parsePage } from "./pagination"

describe("page numbers from the URL", () => {
  it("keeps whole page numbers", () => {
    expect(parsePage("1")).toBe(1)
    expect(parsePage("12")).toBe(12)
  })

  it("falls back to the first page for anything else", () => {
    for (const value of [null, "", "0", "-3", "2.5", "abc", "1e400", "99999999999999999999"]) {
      expect(parsePage(value), String(value)).toBe(1)
    }
  })
})
