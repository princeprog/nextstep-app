import { describe, expect, it } from "vitest"

import { formatDate, formatTaskDue, formatTime, todayIn } from "./time"

describe("date display", () => {
  it("formats calendar dates without shifting them by the viewer's time zone", () => {
    expect(formatDate("2026-03-01")).toBe("Sun, Mar 1, 2026")
    expect(formatDate("2026-12-31")).toBe("Thu, Dec 31, 2026")
  })

  it("formats local times and task due text", () => {
    expect(formatTime("18:05")).toBe("6:05 PM")
    expect(formatTaskDue({ dueDate: "2026-03-10", dueTime: "09:00", timeZone: "Asia/Manila" })).toBe("Tue, Mar 10, 2026 at 9:00 AM")
    expect(formatTaskDue({ dueDate: "2026-03-10", dueTime: null, timeZone: "Asia/Manila" })).toBe("Tue, Mar 10, 2026")
  })

  it("computes today in a specific zone", () => {
    expect(todayIn("Asia/Manila")).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

