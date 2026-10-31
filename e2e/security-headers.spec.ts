import { expect, test } from "./fixtures"
import { startDemo } from "./helpers"

/** The second production server from playwright.config.ts, started with APP_HTTPS=true. */
const HTTPS_FLAG_ORIGIN = "http://localhost:3100"

const PAGES = [
  "/login",
  "/register",
  "/demo",
  "/forgot-password",
  "/resend-confirmation",
  "/verify-email",
  "/reset-password",
  "/dashboard",
  "/applications",
  "/applications/new",
  "/tasks",
  "/no-such-page",
]

function parsePolicy(header: string | undefined) {
  const directives = new Map<string, string[]>()
  for (const part of (header ?? "").split(";")) {
    const [name, ...values] = part.trim().split(/\s+/)
    if (name) {
      directives.set(name, values)
    }
  }
  return directives
}

const nonceOf = (header: string | undefined) => /'nonce-([^']+)'/.exec(header ?? "")?.[1]

test("every page sends a strict, nonce-based CSP and the other security headers", async ({ request }) => {
  for (const path of PAGES) {
    const response = await request.get(path, { maxRedirects: 0 })
    const headers = response.headers()
    const policy = parsePolicy(headers["content-security-policy"])

    expect(policy.get("default-src"), path).toEqual(["'self'"])
    const scripts = policy.get("script-src") ?? []
    expect(scripts, path).toContain("'strict-dynamic'")
    expect(scripts.filter((value) => /^'nonce-[A-Za-z0-9+/=]{16,}'$/.test(value)), path).toHaveLength(1)
    expect(scripts, path).not.toContain("'unsafe-inline'")
    expect(scripts, path).not.toContain("'unsafe-eval'")
    expect(policy.get("connect-src"), path).toEqual(["'self'"])
    expect(policy.get("object-src"), path).toEqual(["'none'"])
    expect(policy.get("base-uri"), path).toEqual(["'self'"])
    expect(policy.get("form-action"), path).toEqual(["'self'"])
    expect(policy.get("frame-ancestors"), path).toEqual(["'none'"])
    expect(policy.has("upgrade-insecure-requests"), path).toBe(false)

    expect(headers["permissions-policy"], path).toMatch(/camera=\(\).*geolocation=\(\).*microphone=\(\)/)
    expect(headers["cross-origin-opener-policy"], path).toBe("same-origin")
    expect(headers["x-robots-tag"], path).toBe("noindex, nofollow")
    expect(headers["referrer-policy"], path).toBe("strict-origin-when-cross-origin")
    expect(headers["x-content-type-options"], path).toBe("nosniff")
    expect(headers["x-frame-options"], path).toBe("DENY")
    expect(headers["strict-transport-security"], path).toBeUndefined()
  }
})

test("each response gets a new nonce, and every script in the page carries it", async ({ request }) => {
  const first = await request.get("/login")
  const second = await request.get("/login")
  const nonce = nonceOf(first.headers()["content-security-policy"])
  expect(nonce).toBeTruthy()
  expect(nonceOf(second.headers()["content-security-policy"])).not.toBe(nonce)

  const scriptTags = (await first.text()).match(/<script\b[^>]*>/g) ?? []
  expect(scriptTags.length).toBeGreaterThan(0)
  for (const tag of scriptTags) {
    expect(tag).toContain('nonce="' + nonce + '"')
  }
})

test("HTTPS-only headers are sent only when APP_HTTPS=true", async ({ request }) => {
  const response = await request.get(HTTPS_FLAG_ORIGIN + "/login")
  expect(response.headers()["strict-transport-security"]).toBe("max-age=31536000; includeSubDomains")
  expect(parsePolicy(response.headers()["content-security-policy"]).has("upgrade-insecure-requests")).toBe(true)
})

// The policyProblems fixture fails this test if the browser reports any CSP or Permissions-Policy problem.
test("every page, dialog, menu, and toast works under the policy", async ({ page }) => {
  for (const path of ["/login", "/register", "/demo", "/forgot-password", "/resend-confirmation", "/verify-email", "/reset-password"]) {
    await page.goto(path)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  }
  await startDemo(page)
  for (const path of ["/dashboard", "/applications", "/interviews", "/settings", "/applications/new", "/no-such-page"]) {
    await page.goto(path)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  }

  await page.goto("/tasks")
  await page.getByRole("button", { name: /^Actions for task/ }).first().click()
  await expect(page.getByRole("menuitem", { name: "Edit" })).toBeVisible()
  await page.keyboard.press("Escape")
  await page.getByRole("button", { name: "Add task" }).click()
  const picker = page.getByRole("combobox", { name: "Application" })
  await picker.click()
  await expect(page.getByRole("option").first()).toBeVisible()
  await page.keyboard.press("Escape")
  await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog")).toBeHidden()

  await page.goto("/applications?search=Harbor")
  await page.getByRole("link", { name: "Harbor Labs" }).filter({ visible: true }).first().click()
  await expect(page.getByRole("heading", { level: 1, name: "Harbor Labs" })).toBeVisible()
  await page.getByLabel("Status for Harbor Labs — Frontend Developer").selectOption("OFFER")
  await expect(page.getByText("Harbor Labs moved to Offer")).toBeVisible()
  await page.getByRole("link", { name: "Edit" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Edit Harbor Labs" })).toBeVisible()

  await page.setViewportSize({ width: 320, height: 720 })
  await page.getByRole("button", { name: "Toggle navigation" }).click()
  await expect(page.getByRole("link", { name: "Interviews" })).toBeVisible()
})
