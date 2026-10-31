import AxeBuilder from "@axe-core/playwright"

import { expect, test } from "./fixtures"
import { startDemo, waitForData } from "./helpers"

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]

test("signed-out pages pass automated accessibility checks", async ({ page }) => {
  for (const path of ["/login", "/register", "/demo"]) {
    await page.goto(path)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
    expect(results.violations, path).toEqual([])
  }
})

test("workspace pages pass automated accessibility checks", async ({ page }) => {
  await startDemo(page)
  for (const path of ["/dashboard", "/applications", "/tasks", "/interviews", "/settings", "/applications/new"]) {
    await page.goto(path)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await waitForData(page)
    const results = await new AxeBuilder({ page }).withTags(TAGS).analyze()
    expect(results.violations, path).toEqual([])
  }
  await page.goto("/applications?search=Harbor")
  await page.getByRole("link", { name: "Harbor Labs" }).filter({ visible: true }).first().click()
  await expect(page.getByRole("heading", { level: 1, name: "Harbor Labs" })).toBeVisible()
  await waitForData(page)
  const detail = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  expect(detail.violations, "application detail").toEqual([])

  await page.getByRole("button", { name: "Add task" }).click()
  await expect(page.getByRole("dialog")).toBeVisible()
  const dialog = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  expect(dialog.violations, "task dialog").toEqual([])

  // The application picker, opened from the task list, with its list of options showing.
  await page.goto("/tasks")
  await page.getByRole("button", { name: "Add task" }).click()
  await page.getByRole("combobox", { name: "Application" }).click()
  await expect(page.getByRole("option").first()).toBeVisible()
  await waitForData(page)
  const picker = await new AxeBuilder({ page }).withTags(TAGS).analyze()
  expect(picker.violations, "application picker").toEqual([])
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
  await page.keyboard.press("ArrowDown")
  await expect(page.getByText("Bluepeak Health moved to Rejected")).toBeVisible()
  await expect(status).toHaveValue("REJECTED")
})

test("layouts fit a 320 px screen without sideways scrolling", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.setViewportSize({ width: 320, height: 720 })
  for (const path of ["/login", "/register", "/demo"]) {
    await page.goto(path)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), path).toBeLessThanOrEqual(0)
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

