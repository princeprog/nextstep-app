import { expectNoAxeViolations } from "./a11y"
import { expect, test } from "./fixtures"
import { createAccount, createApplication, startDemo, watchDialogs } from "./helpers"
import { SUBJECTS, waitForEmails } from "./mailpit"

test("signing out clears private data and protects workspace pages", async ({ page }) => {
  await createAccount(page)
  await createApplication(page, "Cache Check Co")
  await page.getByRole("link", { name: "Applications", exact: true }).click()
  await expect(page.getByRole("link", { name: "Cache Check Co" }).first()).toBeVisible()

  await page.getByRole("button", { name: "Sign out" }).click()
  await expect(page).toHaveURL(/\/login\?reason=signed-out/)
  await expect(page.getByText("You've signed out.")).toBeVisible()

  await page.goBack()
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByText("Cache Check Co")).toHaveCount(0)
  await page.goto("/dashboard")
  await expect(page).toHaveURL(/\/login$/)
})

test("signing out after using a dialog still explains it, and the workspace sends nothing more", async ({ page }) => {
  await createAccount(page)
  await page.goto("/tasks")
  await page.getByRole("button", { name: "Add task" }).click()
  await expect(page.getByRole("dialog", { name: "Add a task" })).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog")).toBeHidden()

  const sessionChecks: string[] = []
  page.on("request", (request) => {
    if (request.url().endsWith("/api/v1/me")) {
      sessionChecks.push(new URL(page.url()).pathname)
    }
  })
  await page.getByRole("button", { name: "Sign out" }).click()
  await expect(page.getByText("You've signed out.")).toBeVisible()
  await expect(page).toHaveURL(/\/login\?reason=signed-out$/)
  // The first session check after leaving comes from the sign-in page, not from workspace views still mounted.
  await expect.poll(() => sessionChecks.length).toBeGreaterThan(0)
  expect(sessionChecks[0]).toBe("/login")
})

test("an ended session sends the user to sign in with an explanation", async ({ page, context }) => {
  await createAccount(page)
  await expect(page.getByRole("heading", { name: "Start with your first application" })).toBeVisible()
  await context.clearCookies()
  await page.getByRole("link", { name: "Applications", exact: true }).click()
  await expect(page).toHaveURL(/\/login\?reason=expired/)
  await expect(page.getByText("Your session ended. Sign in again to continue.")).toBeVisible()
})

test("signing out from settings explains it", async ({ page }) => {
  await createAccount(page)
  await page.goto("/settings")
  await page.getByRole("main").getByRole("button", { name: "Sign out" }).click()
  await expect(page).toHaveURL(/\/login\?reason=signed-out$/)
  await expect(page.getByText("You've signed out.")).toBeVisible()
})

test("deleting the account needs its password, then ends the session with an explanation", async ({ page }) => {
  watchDialogs(page)
  const account = await createAccount(page)
  await page.goto("/settings")
  const trigger = page.getByRole("button", { name: "Delete account…" })
  await trigger.click()
  const dialog = page.getByRole("alertdialog", { name: "Delete your account permanently?" })
  const password = dialog.getByLabel("Password", { exact: true })
  await expect(password).toBeFocused()

  // A wrong password is explained next to the field, and nothing is deleted.
  await password.fill("not the right password")
  await dialog.getByRole("button", { name: "Delete account" }).click()
  await expect(dialog.getByText("That password isn't correct.")).toBeVisible()
  await expect(password).toHaveAttribute("aria-invalid", "true")
  await expect(password).toHaveAttribute("aria-describedby", "delete-password-error")
  await expect(password).toBeFocused()
  await expectNoAxeViolations(page, "delete dialog with a wrong password")

  // Escape closes it and returns focus to the button that opened it.
  await page.keyboard.press("Escape")
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()

  await trigger.click()
  await expect(password).toHaveValue("")
  await password.fill(account.password)
  await password.press("Enter")
  await expect(page).toHaveURL(/\/login\?reason=deleted$/)
  await expect(page.getByText("Your account and its data were deleted.")).toBeVisible()
  await page.goto("/dashboard")
  await expect(page).toHaveURL(/\/login$/)

  // The account is gone, so its password no longer signs in, and the owner was told by email.
  await page.getByLabel("Email", { exact: true }).fill(account.email)
  await page.getByLabel("Password", { exact: true }).fill(account.password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page.getByText("Email or password is incorrect.")).toBeVisible()
  await waitForEmails(account.email, SUBJECTS.deleted)
})

test("a signed-in visitor must leave before starting a separate demo", async ({ page }) => {
  await startDemo(page)
  await page.goto("/demo")
  await expect(page.getByText("Sign out first to start a separate demo.")).toBeVisible()
  await expect(page.getByRole("button", { name: "Start demo" })).toHaveCount(0)
  await page.goto("/dashboard")
  await page.getByRole("button", { name: "Leave demo" }).click()
  await expect(page).toHaveURL(/\/login\?reason=signed-out/)
})

