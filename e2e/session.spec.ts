import { expect, test } from "@playwright/test"

import { createApplication, register, startDemo } from "./helpers"

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

test("an ended session sends the user to sign in with an explanation", async ({ page, context }) => {
  await register(page)
  await expect(page.getByRole("heading", { name: "Start with your first application" })).toBeVisible()
  await context.clearCookies()
  await page.getByRole("link", { name: "Applications", exact: true }).click()
  await expect(page).toHaveURL(/\/login\?reason=expired/)
  await expect(page.getByText("Your session ended. Sign in again to continue.")).toBeVisible()
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

