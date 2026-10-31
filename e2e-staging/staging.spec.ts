import { readFile } from "node:fs/promises"

import type { Page } from "@playwright/test"

import { expect, test } from "../e2e/fixtures"
import { confirmEmail, createApplication, register, signIn, statusWith, strongPassword, uniqueEmail } from "../e2e/helpers"
import { latestEmail, linkIn, SUBJECTS, waitForEmails } from "../e2e/mailpit"

/*
 * Checks the production-like staging copy started by scripts/staging.ps1: Caddy terminates HTTPS in front of the app,
 * and the app forwards /api/v1 to the API running its production profile. Requests to the staging hosts are made from
 * the page, because *.localhost names resolve only inside the browser on Windows.
 */
const SITE_URL = (process.env.STAGING_SITE_URL ?? "https://nextstep.localhost:8443").replace(/\/+$/, "")
const API_READINESS_URL = process.env.STAGING_API_READINESS_URL ?? "http://127.0.0.1:8081/actuator/health/readiness"

test.describe.configure({ mode: "serial" })

type Fetched = { status: number; headers: Record<string, string>; body: string }
type FetchOptions = { method?: string; headers?: Record<string, string>; body?: string }

/** A same-origin request from the page, so it passes through Caddy and the app like the app's own requests. */
function fetchFromPage(page: Page, path: string, options: FetchOptions = {}): Promise<Fetched> {
  return page.evaluate(async ({ path, options }) => {
    const response = await fetch(path, { ...options, credentials: "same-origin", redirect: "manual" })
    const headers: Record<string, string> = {}
    response.headers.forEach((value, name) => {
      headers[name] = value
    })
    return { status: response.status, headers, body: await response.text() }
  }, { path, options })
}

test("pages and API responses carry the production security settings", async ({ page, request }) => {
  const response = await page.goto("/login")
  const headers = response!.headers()
  expect(headers["strict-transport-security"]).toMatch(/max-age=\d+/)
  expect(headers["content-security-policy"]).toMatch(/script-src[^;]*'nonce-/)
  expect(headers["x-frame-options"]).toBe("DENY")
  expect(headers["x-content-type-options"]).toBe("nosniff")

  // The API sees HTTPS through both proxies, so Spring Security adds its own HSTS header.
  const health = await fetchFromPage(page, "/api/v1/health")
  expect(health.status).toBe(200)
  expect(health.headers["strict-transport-security"]).toMatch(/max-age=\d+/)

  // Actuator endpoints are for the host's health checks, on the API's own port, and not part of the public origin.
  const actuator = await fetchFromPage(page, "/actuator/health")
  expect(actuator.body).not.toContain('"status"')
  expect((await request.get(API_READINESS_URL)).status()).toBe(200)
})

test("a new user signs up, confirms, works, resets the password, downloads the data, and deletes the account", async ({ page, baseURL }) => {
  const account = await register(page, { name: "Staging User" })
  expect((await latestEmail(account.email, SUBJECTS.verify)).Text).toContain(baseURL + "/verify-email#token=")
  await confirmEmail(page, account.email)
  await signIn(page, account)

  // The production session cookie: HTTPS only, for this host only, and unreadable by page scripts.
  const cookies = await page.context().cookies()
  expect(cookies.map((cookie) => cookie.name)).not.toContain("NEXTSTEP_SESSION")
  expect(cookies.find((cookie) => cookie.name === "__Host-NEXTSTEP_SESSION")).toMatchObject({
    domain: new URL(baseURL!).hostname,
    path: "/",
    secure: true,
    httpOnly: true,
    sameSite: "Lax",
  })

  await createApplication(page, "Staging Check Co")
  await page.goto("/settings")
  const downloading = page.waitForEvent("download")
  await page.getByRole("link", { name: "Download my data" }).click()
  const data = JSON.parse(await readFile((await (await downloading).path())!, "utf8"))
  expect(data).toMatchObject({ format: "nextstep-export/1", account: { email: account.email } })
  expect(data.applications).toEqual([expect.objectContaining({ company: "Staging Check Co" })])

  // A forgotten password, from a browser that is signed out.
  await page.context().clearCookies()
  await page.goto("/forgot-password")
  await page.getByLabel("Email", { exact: true }).fill(account.email)
  await page.getByRole("button", { name: "Send reset link" }).click()
  await expect(statusWith(page, account.email)).toBeVisible()
  const reset = await latestEmail(account.email, SUBJECTS.reset)
  expect(reset.Text).toContain(baseURL + "/reset-password#token=")
  await page.goto(linkIn(reset, "/reset-password"))
  const newPassword = strongPassword()
  await page.getByLabel("New password").fill(newPassword)
  await page.getByRole("button", { name: "Change password" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Password changed" })).toBeVisible()
  await signIn(page, { email: account.email, password: newPassword })

  await page.goto("/settings")
  await page.getByRole("button", { name: "Delete account…" }).click()
  const dialog = page.getByRole("alertdialog", { name: "Delete your account permanently?" })
  await dialog.getByLabel("Password", { exact: true }).fill(newPassword)
  await dialog.getByRole("button", { name: "Delete account" }).click()
  await expect(page).toHaveURL(/\/login\?reason=deleted$/)
  await waitForEmails(account.email, SUBJECTS.deleted)
})

test("the website links to the app, and the app links to the website's policies", async ({ page, baseURL }) => {
  await page.goto(SITE_URL + "/")
  await expect(page.getByRole("main").getByRole("link", { name: "Create your workspace" }).first()).toHaveAttribute(
    "href",
    baseURL + "/register",
  )
  await page.goto("/register")
  await page.getByRole("link", { name: "Privacy policy" }).click()
  await expect(page).toHaveURL(SITE_URL + "/privacy/")
  await expect(page.getByRole("heading", { level: 1, name: "Privacy policy" })).toBeVisible()
  await page.goBack()
  await page.getByRole("link", { name: "Terms of use" }).click()
  await expect(page).toHaveURL(SITE_URL + "/terms/")
  await expect(page.getByRole("heading", { level: 1, name: "Terms of use" })).toBeVisible()
})

// Runs last: it uses up the rest of this address's sign-in allowance for the next 15 minutes.
test("per-address limits use the address the proxy saw, not an X-Forwarded-For header from the client", async ({ page }) => {
  await page.goto("/login")
  const csrf = JSON.parse((await fetchFromPage(page, "/api/v1/auth/csrf")).body) as { headerName: string; token: string }
  // Production allows 10 sign-in attempts per address per 15 minutes, and the earlier tests used some. Every attempt
  // claims a different address, so if the API trusted the header, none of them would be limited.
  const statuses: number[] = []
  for (let attempt = 1; attempt <= 11 && !statuses.includes(429); attempt++) {
    const response = await fetchFromPage(page, "/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", [csrf.headerName]: csrf.token, "X-Forwarded-For": "203.0.113." + attempt },
      body: JSON.stringify({ email: uniqueEmail(), password: "not the password" }),
    })
    statuses.push(response.status)
  }
  expect(statuses.at(-1)).toBe(429)
})
