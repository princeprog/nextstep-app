import { expect, test } from "@playwright/test"

import { card, manilaDate, register, watchDialogs } from "./helpers"

test("a new user tracks an application from first save to dashboard, archive, and restore", async ({ page }) => {
  const alerts = watchDialogs(page)
  await register(page, "Ana Cruz")

  await expect(page.getByRole("heading", { name: "Start with your first application" })).toBeVisible()
  await page.getByRole("link", { name: "Add application" }).first().click()
  await page.getByLabel("Company", { exact: true }).fill("Harbor Labs E2E")
  await page.getByLabel("Job title", { exact: true }).fill("Frontend Developer")
  const notes = "<img src=x onerror=alert(1)> Prepare a portfolio walkthrough"
  await page.getByLabel("Notes", { exact: true }).fill(notes)
  await page.getByRole("button", { name: "Save application" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Harbor Labs E2E" })).toBeVisible()
  await expect(page.getByText(notes)).toBeVisible()

  // Moving to Applied asks for the real date and changes nothing until it is given.
  const status = page.getByLabel("Status for Harbor Labs E2E — Frontend Developer")
  await status.selectOption("APPLIED")
  const appliedDialog = page.getByRole("dialog", { name: "When did you apply?" })
  await expect(appliedDialog).toBeVisible()
  await appliedDialog.getByRole("button", { name: "Cancel" }).click()
  await expect(status).toHaveValue("SAVED")
  await status.selectOption("APPLIED")
  await appliedDialog.getByLabel("Applied on").fill(manilaDate(-2))
  await appliedDialog.getByRole("button", { name: "Mark as applied" }).click()
  await expect(appliedDialog).toBeHidden()
  await expect(status).toHaveValue("APPLIED")

  // A follow-up due today and an interview tomorrow.
  await card(page, "Tasks").getByRole("button", { name: "Add task" }).click()
  const taskDialog = page.getByRole("dialog", { name: "Add a task" })
  await taskDialog.getByLabel("Task", { exact: true }).fill("Send follow-up email")
  await taskDialog.getByLabel("Due date").fill(manilaDate(0))
  await taskDialog.getByRole("button", { name: "Add task" }).click()
  await expect(taskDialog).toBeHidden()
  await expect(card(page, "Tasks").getByText("Due today")).toBeVisible()

  await card(page, "Interviews").getByRole("button", { name: "Add interview" }).click()
  const interviewDialog = page.getByRole("dialog", { name: "Add an interview" })
  await interviewDialog.getByLabel("Type").selectOption("TECHNICAL")
  await interviewDialog.getByLabel("Date", { exact: true }).fill(manilaDate(1))
  await interviewDialog.getByLabel("Start time").fill("10:00")
  await interviewDialog.getByRole("button", { name: "Add interview" }).click()
  await expect(interviewDialog).toBeHidden()
  await expect(card(page, "Interviews").getByText("10:00 AM")).toBeVisible()

  await status.selectOption("INTERVIEW")
  await expect(page.getByText("Harbor Labs E2E moved to Interview")).toBeVisible()

  await page.getByRole("link", { name: "Dashboard", exact: true }).click()
  await expect(card(page, /Upcoming tasks/).getByText("Send follow-up email")).toBeVisible()
  await expect(card(page, /Upcoming interviews/).getByText("Harbor Labs E2E — Frontend Developer")).toBeVisible()
  await expect(card(page, "Pipeline").getByRole("link", { name: /Interview/ })).toContainText("1")

  await page.getByRole("checkbox", { name: "Mark complete: Send follow-up email" }).click()
  await expect(card(page, /Upcoming tasks/).getByText("No tasks due this week.")).toBeVisible()

  // Archive hides the application and its interview from the dashboard; restore brings it back unchanged.
  await page.getByRole("link", { name: "Applications", exact: true }).click()
  await page.getByRole("link", { name: "Harbor Labs E2E" }).filter({ visible: true }).first().click()
  await page.waitForURL(/\/applications\/[0-9a-f-]{36}$/)
  await page.getByRole("button", { name: "Archive" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Archive" }).click()
  await expect(page.getByText("This application is archived")).toBeVisible()
  await expect(page.getByRole("button", { name: "Add task" })).toHaveCount(0)

  await page.getByRole("link", { name: "Dashboard", exact: true }).click()
  // With its only application archived, the workspace has nothing active: counts and sections exclude it.
  await expect(page.getByRole("heading", { name: "Start with your first application" })).toBeVisible()
  await expect(page.getByText("Harbor Labs E2E")).toHaveCount(0)

  await page.goto("/applications?archive=archived")
  await page.getByRole("link", { name: "Harbor Labs E2E" }).filter({ visible: true }).first().click()
  await page.waitForURL(/\/applications\/[0-9a-f-]{36}$/)
  await page.getByRole("button", { name: "Restore" }).click()
  await expect(page.getByText("This application is archived")).toBeHidden()
  await expect(page.getByLabel("Status for Harbor Labs E2E — Frontend Developer")).toHaveValue("INTERVIEW")
  await expect(page.getByText(notes)).toBeVisible()
  await expect(card(page, "Tasks").getByText("Send follow-up email")).toBeVisible()
  await expect(card(page, "Interviews").getByText("10:00 AM")).toBeVisible()

  await page.getByRole("link", { name: "Dashboard", exact: true }).click()
  await expect(card(page, "Pipeline").getByRole("link", { name: /Interview/ })).toContainText("1")
  expect(alerts).toEqual([])
})

test("form errors appear next to fields and keep what was typed", async ({ page }) => {
  watchDialogs(page)
  await register(page)
  await page.goto("/applications/new")
  await page.getByLabel("Company", { exact: true }).fill("Salary Check Co")
  await page.getByLabel("Job title", { exact: true }).fill("Analyst")
  await page.getByLabel("Job posting link").fill("javascript:alert(1)")
  await page.getByLabel("Minimum").fill("5000")
  await page.getByRole("button", { name: "Save application" }).click()

  await expect(page.getByLabel("Job posting link")).toHaveAttribute("aria-invalid", "true")
  await expect(page.getByText("Enter a full web address starting with http:// or https://.")).toBeVisible()
  await expect(page.getByText("Choose a currency for the salary range.")).toBeVisible()
  await expect(page.getByLabel("Company", { exact: true })).toHaveValue("Salary Check Co")
  await expect(page).toHaveURL(/\/applications\/new$/)
})

