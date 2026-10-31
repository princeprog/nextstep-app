import type { ApplicationStatus, EmploymentType, WorkArrangement } from "@/lib/api/types"
import { parsePage } from "@/lib/pagination"

export type SortField = "updatedAt" | "company" | "appliedDate" | "nextTaskDue"
export type SortDirection = "asc" | "desc"

export type ListParams = {
  page: number
  pageSize: number
  search: string
  status: ApplicationStatus | ""
  workArrangement: WorkArrangement | ""
  employmentType: EmploymentType | ""
  location: string
  appliedFrom: string
  appliedTo: string
  archive: "active" | "archived"
  sort: SortField
  direction: SortDirection
}

export const DEFAULT_PARAMS: ListParams = {
  page: 1,
  pageSize: 20,
  search: "",
  status: "",
  workArrangement: "",
  employmentType: "",
  location: "",
  appliedFrom: "",
  appliedTo: "",
  archive: "active",
  sort: "updatedAt",
  direction: "desc",
}

/** Combined sort options shown to the user, mapped to the API's sort and direction. */
export const SORT_OPTIONS: { value: string; label: string; sort: SortField; direction: SortDirection }[] = [
  { value: "updatedAt:desc", label: "Last updated", sort: "updatedAt", direction: "desc" },
  { value: "company:asc", label: "Company A–Z", sort: "company", direction: "asc" },
  { value: "appliedDate:desc", label: "Date applied, newest", sort: "appliedDate", direction: "desc" },
  { value: "appliedDate:asc", label: "Date applied, oldest", sort: "appliedDate", direction: "asc" },
  { value: "nextTaskDue:asc", label: "Next task due soonest", sort: "nextTaskDue", direction: "asc" },
]

const STATUSES = ["SAVED", "APPLIED", "INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN"]
const ARRANGEMENTS = ["REMOTE", "HYBRID", "ONSITE"]
const EMPLOYMENT = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "OTHER"]
const SORTS = ["updatedAt", "company", "appliedDate", "nextTaskDue"]
const DATE = /^\d{4}-\d{2}-\d{2}$/

function positiveInt(value: string | null, fallback: number, max?: number) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback
  }
  return max ? Math.min(parsed, max) : parsed
}

function oneOf<T extends string>(value: string | null, allowed: string[], fallback: T): T {
  return value && allowed.includes(value) ? (value as T) : fallback
}

/** Reads list state from the URL, ignoring anything invalid so a bad link still shows a usable list. */
export function parseListParams(search: URLSearchParams): ListParams {
  const sort = oneOf<SortField>(search.get("sort"), SORTS, DEFAULT_PARAMS.sort)
  const naturalDirection: SortDirection = sort === "company" || sort === "nextTaskDue" ? "asc" : "desc"
  const requested = oneOf<SortDirection>(search.get("direction"), ["asc", "desc"], naturalDirection)
  // Only the sort choices offered in the UI are accepted, so the sort menu always shows what the list uses.
  const offered = SORT_OPTIONS.some((option) => option.sort === sort && option.direction === requested)
  return {
    page: parsePage(search.get("page")),
    pageSize: positiveInt(search.get("pageSize"), 20, 100),
    search: search.get("search") ?? "",
    status: oneOf(search.get("status"), STATUSES, ""),
    workArrangement: oneOf(search.get("workArrangement"), ARRANGEMENTS, ""),
    employmentType: oneOf(search.get("employmentType"), EMPLOYMENT, ""),
    location: search.get("location") ?? "",
    appliedFrom: DATE.test(search.get("appliedFrom") ?? "") ? search.get("appliedFrom")! : "",
    appliedTo: DATE.test(search.get("appliedTo") ?? "") ? search.get("appliedTo")! : "",
    archive: search.get("archive") === "archived" ? "archived" : "active",
    sort,
    direction: offered ? requested : naturalDirection,
  }
}

/** Writes only non-default values so URLs stay short and shareable. */
export function serializeListParams(params: ListParams): URLSearchParams {
  const out = new URLSearchParams()
  for (const key of Object.keys(DEFAULT_PARAMS) as (keyof ListParams)[]) {
    const value = params[key]
    if (value !== DEFAULT_PARAMS[key] && value !== "") {
      out.set(key, String(value))
    }
  }
  return out
}

/** Applies a change. Any change to search, filters, sort, or page size returns to page 1. */
export function changeListParams(current: ListParams, change: Partial<ListParams>): ListParams {
  const next = { ...current, ...change }
  if (!("page" in change)) {
    next.page = 1
  }
  return next
}

export function hasActiveFilters(params: ListParams): boolean {
  return Boolean(
    params.search || params.status || params.workArrangement || params.employmentType || params.location ||
      params.appliedFrom || params.appliedTo,
  )
}

export function clearFilters(current: ListParams): ListParams {
  return { ...DEFAULT_PARAMS, archive: current.archive, sort: current.sort, direction: current.direction, pageSize: current.pageSize }
}

/** Parameters sent to the API (the API owns validation; these are already sanitized). */
export function toApiQuery(params: ListParams) {
  return {
    page: params.page,
    pageSize: params.pageSize,
    search: params.search.trim() || undefined,
    status: params.status || undefined,
    workArrangement: params.workArrangement || undefined,
    employmentType: params.employmentType || undefined,
    location: params.location.trim() || undefined,
    appliedFrom: params.appliedFrom || undefined,
    appliedTo: params.appliedTo || undefined,
    archive: params.archive,
    sort: params.sort,
    direction: params.direction,
  }
}

