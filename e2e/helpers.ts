import { randomBytes, randomUUID } from "node:crypto"

import { expect, type Locator, type Page } from "@playwright/test"

import { latestEmail, linkIn, SUBJECTS } from "./mailpit"

export type Account = { name: string; email: string; password: string }

/**
 * A new random password for every account. The API refuses passwords found in Have I Been Pwned, so a fixed test
 * password could start failing once it leaks; a random one never appears there.
 */
export function strongPassword() {
  return "e2e-" + randomBytes(18).toString("base64url")
}

export function uniqueEmail() {
  return "e2e-" + randomUUID() + "@example.com"
}

/** YYYY-MM-DD in Asia/Manila (the browser zone configured for the tests), offset by whole days. */
export function manilaDate(offsetDays = 0) {
  const now = new Date(Date.now() + offsetDays * 86_400_000)
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(now)
}

/**
 * Fills in the registration form and waits for the "check your email" screen. The email isn't confirmed yet, so the
 * account can't sign in. Without a time zone, the form keeps the browser's (Asia/Manila in these tests).
 */
export async function register(
  page: Page,
  { name = "E2E User", email = uniqueEmail(), password = strongPassword(), timeZone }: Partial<Account> & { timeZone?: string } = {},
): Promise<Account> {
  await page.goto("/register")
  await page.getByLabel("Name", { exact: true }).fill(name)
  await page.getByLabel("Email", { exact: true }).fill(email)
  await page.getByLabel("Password", { exact: true }).fill(password)
  if (timeZone) {
    await page.getByLabel("Time zone").selectOption(timeZone)
  } else {
    await expect(page.getByLabel("Time zone")).toHaveValue("Asia/Manila")
  }
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Check your email" })).toBeVisible()
  return { name, email, password }
}

/** Opens the newest confirmation link emailed to the address. */
export async function openConfirmationLink(page: Page, email: string) {
  await page.goto(linkIn(await latestEmail(email, SUBJECTS.verify), "/verify-email"))
}

/** Confirms the address with its newest link, in a browser that isn't signed in. */
export async function confirmEmail(page: Page, email: string) {
  await openConfirmationLink(page, email)
  await page.getByRole("button", { name: "Confirm email address" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Email confirmed" })).toBeVisible()
}

export async function signIn(page: Page, { email, password }: { email: string; password: string }) {
  await page.goto("/login")
  await page.getByLabel("Email", { exact: true }).fill(email)
  await page.getByLabel("Password", { exact: true }).fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.waitForURL("**/dashboard")
}

/**
 * Tries to sign in and expects the refusal a wrong password gets, which is also what an unconfirmed account gets.
 * Returns the alert, which also holds the hint about confirming first.
 */
export async function refusedSignIn(page: Page, { email, password }: { email: string; password: string }): Promise<Locator> {
  await page.goto("/login")
  await page.getByLabel("Email", { exact: true }).fill(email)
  await page.getByLabel("Password", { exact: true }).fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
  const alert = page.getByRole("alert").filter({ hasText: "Email or password is incorrect." })
  await expect(alert).toBeVisible()
  await expect(page).toHaveURL(/\/login$/)
  return alert
}

/**
 * A ready, empty workspace: registers through the UI, confirms the email with the link from Mailpit, and signs in.
 */
export async function createAccount(page: Page, name = "E2E User"): Promise<Account> {
  const account = await register(page, { name })
  await confirmEmail(page, account.email)
  await signIn(page, account)
  return account
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

/**
 * The live region announcing an action's result. A busy button's spinner is a status element too, so the region is
 * found by its message.
 */
export function statusWith(page: Page, message: string | RegExp): Locator {
  return page.getByRole("status").filter({ hasText: message })
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
