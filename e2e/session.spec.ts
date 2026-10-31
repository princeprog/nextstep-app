import { expect, test } from "./fixtures"
import { createApplication, register, startDemo, watchDialogs } from "./helpers"

test("signing out clears private data and protects workspace pages", async ({ page }) => {
  await register(page)
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
  await register(page)
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
  await register(page)
  await expect(page.getByRole("heading", { name: "Start with your first application" })).toBeVisible()
  await context.clearCookies()
  await page.getByRole("link", { name: "Applications", exact: true }).click()
  await expect(page).toHaveURL(/\/login\?reason=expired/)
  await expect(page.getByText("Your session ended. Sign in again to continue.")).toBeVisible()
})

test("signing out from settings explains it", async ({ page }) => {
  await register(page)
  await page.goto("/settings")
  await page.getByRole("main").getByRole("button", { name: "Sign out" }).click()
  await expect(page).toHaveURL(/\/login\?reason=signed-out$/)
  await expect(page.getByText("You've signed out.")).toBeVisible()
})

test("deleting the account ends the session with an explanation", async ({ page }) => {
  watchDialogs(page)
  const { email } = await register(page)
  await page.goto("/settings")
  await page.getByRole("button", { name: "Delete account…" }).click()
  const dialog = page.getByRole("alertdialog", { name: "Delete your account permanently?" })
  await dialog.getByLabel("Email address").fill(email)
  await dialog.getByRole("button", { name: "Delete account" }).click()

  await expect(page).toHaveURL(/\/login\?reason=deleted$/)
  await expect(page.getByText("Your account and its data were deleted.")).toBeVisible()
  await page.goto("/dashboard")
  await expect(page).toHaveURL(/\/login$/)
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

