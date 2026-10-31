import { expect, test } from "./fixtures"
import { createApplicationsThroughApi, manilaDate, register, watchDialogs } from "./helpers"

test("the task picker finds any active application by searching, not only the first page", async ({ page }) => {
  watchDialogs(page)
  await register(page, "Picker User")
  // 105 applications sort before the one we need; the old picker only listed the first 100.
  await createApplicationsThroughApi(page, Array.from({ length: 105 }, (_, index) => ({
    company: "Bulk Co " + String(index + 1).padStart(3, "0"),
    jobTitle: "Analyst",
  })))
  await createApplicationsThroughApi(page, [{ company: "Zephyr Analytics", jobTitle: "Data Engineer" }])

  await page.goto("/tasks")
  await page.getByRole("button", { name: "Add task" }).click()
  const dialog = page.getByRole("dialog", { name: "Add a task" })
  const picker = dialog.getByRole("combobox", { name: "Application" })
  await picker.click()
  await expect(page.getByText("Showing the first 20 of 106 active applications, A–Z. Type to search.")).toBeVisible()
  await expect(page.getByRole("option", { name: /Bulk Co 001/ })).toBeVisible()

  await picker.fill("zephyr")
  const option = page.getByRole("option", { name: /Zephyr Analytics/ })
  await expect(option).toBeVisible()
  await expect(page.getByRole("option")).toHaveCount(1)
  await page.keyboard.press("ArrowDown")
  await page.keyboard.press("Enter")
  await expect(picker).toHaveValue("Zephyr Analytics — Data Engineer")

  await dialog.getByLabel("Task", { exact: true }).fill("Prepare the data case study")
  await dialog.getByLabel("Due date").fill(manilaDate(3))
  await dialog.getByRole("button", { name: "Add task" }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole("link", { name: "Zephyr Analytics — Data Engineer" })).toBeVisible()
})

test("the interview picker explains when nothing matches and keeps typed details after a failed save", async ({ page }) => {
  watchDialogs(page)
  await register(page, "Picker Empty")
  await createApplicationsThroughApi(page, [{ company: "Northwind Labs", jobTitle: "QA Engineer" }])

  await page.goto("/interviews")
  await page.getByRole("button", { name: "Add interview" }).click()
  const dialog = page.getByRole("dialog", { name: "Add an interview" })
  const picker = dialog.getByRole("combobox", { name: "Application" })
  await picker.fill("no such company")
  await expect(page.getByText("No active applications match “no such company”.")).toBeVisible()
  await expect(page.getByRole("option")).toHaveCount(0)
  // Escape closes only the list, even when it has nothing to show.
  await page.keyboard.press("Escape")
  await expect(picker).toHaveAttribute("aria-expanded", "false")
  await expect(dialog).toBeVisible()

  // Saving without a choice shows the API's message next to the picker.
  await dialog.getByLabel("Date", { exact: true }).fill(manilaDate(2))
  await dialog.getByLabel("Start time").fill("09:30")
  await dialog.getByRole("button", { name: "Add interview" }).click()
  await expect(picker).toHaveAttribute("aria-invalid", "true")
  await expect(dialog.getByLabel("Start time")).toHaveValue("09:30")

  await picker.fill("northwind")
  await page.getByRole("option", { name: /Northwind Labs/ }).click()
  await dialog.getByRole("button", { name: "Add interview" }).click()
  await expect(dialog).toBeHidden()
  await page.goto("/interviews?view=all")
  await expect(page.getByRole("link", { name: "Northwind Labs — QA Engineer" })).toBeVisible()
})
