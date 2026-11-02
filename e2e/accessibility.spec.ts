import { expectNoAxeViolations, expectNoSidewaysScroll, expectVisibleFocus } from "./a11y"
import { expect, test } from "./fixtures"
import { startDemo, waitForData } from "./helpers"

// Signed-out pages and the heading each settles on. The link pages without a token explain how to get a new link.
const SIGNED_OUT_PAGES: [string, string][] = [
  ["/login", "Sign in"],
  ["/register", "Create your workspace"],
  ["/demo", "Try the demo"],
  ["/forgot-password", "Reset your password"],
  ["/resend-confirmation", "Get a new confirmation link"],
  ["/verify-email", "This link is incomplete"],
  ["/reset-password", "This link is incomplete"],
]

test("signed-out pages pass automated accessibility checks", async ({ page }) => {
  for (const [path, heading] of SIGNED_OUT_PAGES) {
    await page.goto(path)
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible()
    await expectNoAxeViolations(page, path)
  }

  for (const reason of ["verified", "password-reset", "deleted", "confirm-email"]) {
    await page.goto("/login?reason=" + reason)
    await expect(page.getByRole("status")).toBeVisible()
    await expectNoAxeViolations(page, "/login?reason=" + reason)
  }
})

test("workspace pages pass automated accessibility checks", async ({ page }) => {
  await startDemo(page)
  for (const path of ["/dashboard", "/applications", "/tasks", "/interviews", "/settings", "/applications/new"]) {
    await page.goto(path)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await waitForData(page)
    await expectNoAxeViolations(page, path)
  }
  await page.goto("/applications?search=Harbor")
  await page.getByRole("link", { name: "Harbor Labs" }).filter({ visible: true }).first().click()
  await expect(page.getByRole("heading", { level: 1, name: "Harbor Labs" })).toBeVisible()
  await waitForData(page)
  await expectNoAxeViolations(page, "application detail")

  await page.getByRole("button", { name: "Add task" }).click()
  await expect(page.getByRole("dialog")).toBeVisible()
  await expectNoAxeViolations(page, "task dialog")

  // The application picker, opened from the task list, with its list of options showing.
  await page.goto("/tasks")
  await page.getByRole("button", { name: "Add task" }).click()
  await page.getByRole("combobox", { name: "Application" }).click()
  await expect(page.getByRole("option").first()).toBeVisible()
  await waitForData(page)
  await expectNoAxeViolations(page, "application picker")
})

test("keyboard users reach the password reset link from the sign-in form", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel("Password", { exact: true }).focus()
  await page.keyboard.press("Tab")
  await expectVisibleFocus(page.getByRole("link", { name: "Forgot password?" }))
  await page.keyboard.press("Enter")
  await expect(page).toHaveURL(/\/forgot-password$/)
  await expect(page.getByRole("heading", { level: 1, name: "Reset your password" })).toBeVisible()
})

test("keyboard users can skip navigation, use dialogs, and change status", async ({ page }) => {
  await startDemo(page)
  await page.goto("/tasks")
  await expect(page.getByRole("heading", { level: 1, name: "Tasks" })).toBeVisible()

  await page.keyboard.press("Tab")
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(page.locator("#main-content")).toBeFocused()

  const addTask = page.getByRole("button", { name: "Add task" })
  await addTask.focus()
  await page.keyboard.press("Enter")
  const dialog = page.getByRole("dialog", { name: "Add a task" })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator(":focus")).toHaveCount(1)
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
  await expect(addTask).toBeFocused()

  await page.goto("/applications?search=Bluepeak")
  const status = page.getByLabel("Status for Bluepeak Health — UX Researcher").filter({ visible: true })
  await status.focus()
  await page.keyboard.press("Enter")
  await expect(page.getByRole("listbox")).toBeVisible()
  await page.keyboard.press("End")
  await page.keyboard.press("ArrowUp")
  await page.keyboard.press("Enter")
  await expect(page.getByText("Bluepeak Health moved to Rejected")).toBeVisible()
  await expect(status).toContainText("Rejected")
})

test("layouts fit a 320 px screen without sideways scrolling", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.setViewportSize({ width: 320, height: 720 })
  for (const [path, heading] of SIGNED_OUT_PAGES) {
    await page.goto(path)
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible()
    await expectNoSidewaysScroll(page, path)
  }
  await startDemo(page)
  for (const path of ["/dashboard", "/applications", "/tasks", "/interviews", "/settings", "/applications/new"]) {
    await page.goto(path)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await waitForData(page)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), path).toBeLessThanOrEqual(0)
  }

  // The task dialog with the application picker's list open.
  await page.goto("/tasks")
  await page.getByRole("button", { name: "Add task" }).click()
  await page.getByRole("combobox", { name: "Application" }).click()
  const firstOption = page.getByRole("option").first()
  await expect(firstOption).toBeVisible()
  const box = await firstOption.boundingBox()
  expect(box && box.x >= 0 && box.x + box.width <= 320, "picker options fit the screen").toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), "picker").toBeLessThanOrEqual(0)
  await page.keyboard.press("Escape")
  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog")).toBeHidden()

  await page.getByRole("button", { name: "Toggle navigation" }).click()
  await expect(page.getByRole("link", { name: "Interviews" })).toBeVisible()
})

