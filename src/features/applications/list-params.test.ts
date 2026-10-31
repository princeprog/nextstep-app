import { describe, expect, it } from "vitest"

import {
  changeListParams,
  clearFilters,
  DEFAULT_PARAMS,
  hasActiveFilters,
  parseListParams,
  serializeListParams,
  SORT_OPTIONS,
  toApiQuery,
} from "./list-params"

const parse = (query: string) => parseListParams(new URLSearchParams(query))

describe("application list URL state", () => {
  it("falls back to defaults for missing or invalid values", () => {
    expect(parse("")).toEqual(DEFAULT_PARAMS)
    const parsed = parse("page=-2&pageSize=500&status=HIRED&sort=salary&archive=deleted&appliedFrom=yesterday")
    expect(parsed.page).toBe(1)
    expect(parsed.pageSize).toBe(100)
    expect(parsed.status).toBe("")
    expect(parsed.sort).toBe("updatedAt")
    expect(parsed.archive).toBe("active")
    expect(parsed.appliedFrom).toBe("")
  })

  it("uses the natural direction for each sort when none is given", () => {
    expect(parse("sort=company").direction).toBe("asc")
    expect(parse("sort=nextTaskDue").direction).toBe("asc")
    expect(parse("sort=appliedDate").direction).toBe("desc")
  })

  it("accepts only the sort choices the sort menu offers", () => {
    expect(parse("sort=appliedDate&direction=asc")).toMatchObject({ sort: "appliedDate", direction: "asc" })
    // Not offered: fall back to the natural direction instead of a choice the menu can't show.
    expect(parse("sort=company&direction=desc")).toMatchObject({ sort: "company", direction: "asc" })
    expect(parse("sort=updatedAt&direction=asc")).toMatchObject({ sort: "updatedAt", direction: "desc" })
    for (const option of SORT_OPTIONS) {
      const params = { ...DEFAULT_PARAMS, sort: option.sort, direction: option.direction }
      expect(parse(serializeListParams(params).toString()), option.value).toEqual(params)
    }
  })

  it("round-trips through the URL and omits defaults", () => {
    const params = { ...DEFAULT_PARAMS, search: "harbor", status: "APPLIED" as const, page: 3 }
    const query = serializeListParams(params)
    expect(query.toString()).toBe("page=3&search=harbor&status=APPLIED")
    expect(parse(query.toString())).toEqual(params)
    expect(serializeListParams(DEFAULT_PARAMS).toString()).toBe("")
  })

  it("returns to page 1 when search, filters, sort, or page size change", () => {
    const onPage4 = { ...DEFAULT_PARAMS, page: 4 }
    expect(changeListParams(onPage4, { search: "x" }).page).toBe(1)
    expect(changeListParams(onPage4, { status: "OFFER" }).page).toBe(1)
    expect(changeListParams(onPage4, { sort: "company", direction: "asc" }).page).toBe(1)
    expect(changeListParams(onPage4, { pageSize: 50 }).page).toBe(1)
    expect(changeListParams(onPage4, { page: 5 }).page).toBe(5)
  })

  it("clears filters but keeps the archive view and sort", () => {
    const params = { ...DEFAULT_PARAMS, search: "x", location: "Cebu", archive: "archived" as const, sort: "company" as const, direction: "asc" as const, page: 2 }
    expect(hasActiveFilters(params)).toBe(true)
    const cleared = clearFilters(params)
    expect(hasActiveFilters(cleared)).toBe(false)
    expect(cleared).toMatchObject({ archive: "archived", sort: "company", direction: "asc", page: 1 })
  })

  it("trims search text and drops empty filters for the API", () => {
    const query = toApiQuery({ ...DEFAULT_PARAMS, search: "  harbor  ", location: "  " })
    expect(query.search).toBe("harbor")
    expect(query.location).toBeUndefined()
    expect(query.status).toBeUndefined()
  })
})

