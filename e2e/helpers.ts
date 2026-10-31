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

/** Waits until no loading placeholder is left (every loading region in the app is marked aria-busy). */
export async function waitForData(page: Page) {
  await expect(page.locator("[aria-busy=true]")).toHaveCount(0)
}

/**
 * Creates applications directly through the API with the signed-in session of `page` (CSRF token first, as the app
 * does). Much faster than the form when a test needs many records.
 */
export async function createApplicationsThroughApi(page: Page, applications: { company: string; jobTitle: string }[]) {
  const csrf = await (await page.request.get("/api/v1/auth/csrf")).json()
  for (let start = 0; start < applications.length; start += 10) {
    const responses = await Promise.all(applications.slice(start, start + 10).map((data) =>
      page.request.post("/api/v1/applications", { headers: { [csrf.headerName]: csrf.token }, data })))
    for (const response of responses) {
      expect(response.status(), await response.text()).toBe(201)
    }
  }
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

