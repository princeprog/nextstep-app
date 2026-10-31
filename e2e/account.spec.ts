import { readFile } from "node:fs/promises"

import { checkScreen, expectNoAxeViolations } from "./a11y"
import { expect, test, watchPolicyProblems } from "./fixtures"
import { createAccount, createApplication, signIn, startDemo, strongPassword } from "./helpers"
import { SUBJECTS, waitForEmails } from "./mailpit"

test("changing the password keeps this browser signed in and signs out the other", async ({ page, browser }) => {
  const account = await createAccount(page)
  const otherContext = await browser.newContext()
  const otherProblems = await watchPolicyProblems(otherContext)
  const other = await otherContext.newPage()
  await signIn(other, account)

  await page.goto("/settings")
  await expect(page.getByRole("heading", { name: "Password", exact: true })).toBeVisible()
  await checkScreen(page, "settings for a normal account")
  const current = page.getByLabel("Current password")
  const next = page.getByLabel("New password")
  await expect(current).toHaveAttribute("autocomplete", "current-password")
  await expect(next).toHaveAttribute("autocomplete", "new-password")

  // A wrong current password is explained next to its field, and only that field is cleared.
  const newPassword = strongPassword()
  await current.fill("not my current password")
  await next.fill(newPassword)
  await page.getByRole("button", { name: "Change password" }).click()
  await expect(page.getByText("That isn't your current password.")).toBeVisible()
  await expect(current).toHaveAttribute("aria-invalid", "true")
  await expect(current).toHaveAttribute("aria-describedby", "currentPassword-error")
  await expect(current).toHaveValue("")
  await expect(next).toHaveValue(newPassword)
  await expectNoAxeViolations(page, "password change with an error")

  await current.fill(account.password)
  await current.press("Enter")
  await expect(page.getByText("Password changed. Other devices were signed out.")).toBeVisible()
  await expect(current).toHaveValue("")
  await expect(next).toHaveValue("")
  await waitForEmails(account.email, SUBJECTS.passwordChanged)

  // This browser stays signed in, and its next change works with the session's new CSRF token.
  await page.getByLabel("Name", { exact: true }).fill("Renamed User")
  await page.getByRole("button", { name: "Save profile" }).click()
  await expect(page.getByText("Profile saved")).toBeVisible()

  // The other browser was signed out, and only the new password signs in.
  await other.getByRole("link", { name: "Applications", exact: true }).click()
  await expect(other).toHaveURL(/\/login\?reason=expired$/)
  await signIn(other, { email: account.email, password: newPassword })

  await otherContext.close()
  expect(otherProblems).toEqual([])
})

test("downloading my data gives a JSON file with every record", async ({ page }) => {
  const account = await createAccount(page, "Export User")
  await createApplication(page, "Export Check Co")
  await page.goto("/settings")

  const link = page.getByRole("link", { name: "Download my data" })
  await expect(link).toHaveAttribute("href", "/api/v1/me/export")
  await expect(page.getByText(/every application, task, and interview, including archived ones/)).toBeVisible()
  const downloading = page.waitForEvent("download")
  await link.click()
  const download = await downloading

  expect(download.suggestedFilename()).toMatch(/^nextstep-export-\d{4}-\d{2}-\d{2}\.json$/)
  const data = JSON.parse(await readFile(await download.path(), "utf8"))
  expect(data).toMatchObject({
    format: "nextstep-export/1",
    account: { kind: "NORMAL", displayName: "Export User", email: account.email, timeZone: "Asia/Manila" },
    tasks: [],
    interviews: [],
  })
  expect(data.applications).toEqual([expect.objectContaining({ company: "Export Check Co", jobTitle: "Frontend Developer" })])
  // The download doesn't leave the page.
  await expect(page.getByRole("heading", { level: 1, name: "Settings" })).toBeVisible()
})

test("a demo workspace can download its data but has no password or account deletion", async ({ page }) => {
  await startDemo(page)
  await page.goto("/settings")
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Download my data" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Password", exact: true })).toHaveCount(0)
  await expect(page.getByRole("heading", { name: "Delete account" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Delete account…" })).toHaveCount(0)
})
