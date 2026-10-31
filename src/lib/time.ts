import { useSyncExternalStore } from "react"

/**
 * Display helpers. Business rules (overdue, upcoming, DST validation) live in the API; the client only formats.
 * Dates without times are formatted in UTC so a YYYY-MM-DD value never shifts by a day.
 */

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  } catch {
    return "UTC"
  }
}

const noSubscription = () => () => {}

/** The browser's time zone on the client, and UTC during server rendering. */
export function useBrowserTimeZone(): string {
  return useSyncExternalStore(noSubscription, browserTimeZone, () => "UTC")
}

let zoneCache: string[] | null = null

export function timeZones(): string[] {
  if (!zoneCache) {
    let zones: string[] = []
    try {
      zones = Intl.supportedValuesOf("timeZone")
    } catch {
      zones = []
    }
    zoneCache = Array.from(new Set(["UTC", ...zones])).sort()
  }
  return zoneCache
}

/** Zone options for a select, always including the current value. */
export function zoneOptions(current?: string | null): string[] {
  const zones = timeZones()
  return current && !zones.includes(current) ? [current, ...zones] : zones
}

export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) {
    return ""
  }
  const [year, month, day] = isoDate.split("-").map(Number)
  return new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, day)))
}

export function formatTime(hhmm: string | null | undefined): string {
  if (!hhmm) {
    return ""
  }
  const [hours, minutes] = hhmm.split(":").map(Number)
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", timeZone: "UTC" })
    .format(new Date(Date.UTC(2000, 0, 1, hours, minutes)))
}

export function formatInstant(iso: string | null | undefined, timeZone: string): string {
  if (!iso) {
    return ""
  }
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(iso))
}

/** Today's date (YYYY-MM-DD) in a time zone. */
export function todayIn(timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone })
    .formatToParts(new Date())
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ""
  return get("year") + "-" + get("month") + "-" + get("day")
}

export function formatTaskDue(task: { dueDate: string; dueTime: string | null; timeZone: string }): string {
  const date = formatDate(task.dueDate)
  return task.dueTime ? date + " at " + formatTime(task.dueTime) : date
}

