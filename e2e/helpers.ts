import { randomUUID } from "node:crypto"

import { expect, type Locator, type Page } from "@playwright/test"

export const PASSWORD = "a-strong-passphrase"

/** YYYY-MM-DD in Asia/Manila (the browser zone configured for the tests), offset by whole days. */
export function manilaDate(offsetDays = 0) {
  const now = new Date(Date.now() + offsetDays * 86_400_000)
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(now)
}

export async function register(page: Page, name = "E2E User") {
  const email = "e2e-" + randomUUID() + "@example.com"
  await page.goto("/register")
  await page.getByLabel("Name", { exact: true }).fill(name)
  await page.getByLabel("Email", { exact: true }).fill(email)
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD)
  await expect(page.getByLabel("Time zone")).toHaveValue("Asia/Manila")
  await page.getByRole("button", { name: "Create account" }).click()
  await page.waitForURL("**/dashboard")
  return { email }
}

export async function startDemo(page: Page) {
  await page.goto("/demo")
  await page.getByRole("button", { name: "Start demo" }).click()
  await page.waitForURL("**/dashboard")
  await expect(page.getByRole("heading", { name: /Overdue tasks/ })).toBeVisible()
}

export async function createApplication(page: Page, company: string, jobTitle = "Frontend Developer") {
  await page.goto("/applications/new")
  await page.getByLabel("Company", { exact: true }).fill(company)
  await page.getByLabel("Job title", { exact: true }).fill(jobTitle)
  await page.getByRole("button", { name: "Save application" }).click()
  await page.waitForURL(/\/applications\/[0-9a-f-]{36}$/)
  await expect(page.getByRole("heading", { level: 1, name: company })).toBeVisible()
  return page.url().split("/").pop()!
}

export function card(page: Page, heading: string | RegExp): Locator {
  return page.locator("[data-slot=card]", { has: page.getByRole("heading", { name: heading }) })
}

/** Accepts confirm() prompts and records any alert(), which would indicate script injection. */
export function watchDialogs(page: Page) {
  const alerts: string[] = []
  page.on("dialog", async (dialog) => {
    if (dialog.type() === "alert") {
      alerts.push(dialog.message())
    }
    await dialog.accept()
  })
  return alerts
}

