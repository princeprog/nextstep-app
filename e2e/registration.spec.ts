import { checkScreen, expectNoAxeViolations, expectVisibleFocus } from "./a11y"
import { expect, test } from "./fixtures"
import { confirmEmail, createAccount, refusedSignIn, register, signIn, statusWith, strongPassword, uniqueEmail } from "./helpers"
import { emailsTo, linkIn, SUBJECTS, waitForEmails } from "./mailpit"

// The public site the build links to (NEXT_PUBLIC_SITE_URL, read by pnpm build). Run the tests with the same value.
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3001").replace(/\/+$/, "")

const newLinkSent = (email: string) =>
  "If " + email + " is waiting to be confirmed, we've sent it a new link. It expires in 24 hours."

test("the registration form links the site's terms and privacy policy, opening them in the same tab", async ({ page }) => {
  // The static site isn't part of this suite; answer for it.
  await page.route(SITE_URL + "/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html><title>NextStep</title><h1>Public site</h1>" }))
  await page.goto("/register")
  const terms = page.getByRole("link", { name: "Terms of use" })
  const privacy = page.getByRole("link", { name: "Privacy policy" })
  await expect(terms).toHaveAttribute("href", SITE_URL + "/terms/")
  await expect(privacy).toHaveAttribute("href", SITE_URL + "/privacy/")

  await terms.click()
  await expect(page).toHaveURL(SITE_URL + "/terms/")
  expect(page.context().pages()).toHaveLength(1)
  await page.goBack()
  await page.getByRole("link", { name: "Privacy policy" }).click()
  await expect(page).toHaveURL(SITE_URL + "/privacy/")
  expect(page.context().pages()).toHaveLength(1)
})

test("registration ends on the same check-your-email screen whether or not the address has an account", async ({ page }) => {
  const account = await register(page, { name: "First Owner" })
  const main = page.getByRole("main")
  await expect(page.getByRole("heading", { level: 1, name: "Check your email" })).toBeFocused()
  await expect(main).toContainText("We sent an email to " + account.email + ".")
  const newAddressScreen = await main.innerText()
  await checkScreen(page, "check your email")

  // Once the address belongs to a confirmed account, registering it again looks exactly the same. Only the inbox
  // learns that the account exists, and the account keeps its password.
  await confirmEmail(page, account.email)
  await register(page, { name: "Someone Else", email: account.email })
  expect(await main.innerText()).toBe(newAddressScreen)
  await waitForEmails(account.email, SUBJECTS.accountExists)
  await signIn(page, account)
})

test("keyboard users can resend the email and correct the address", async ({ page }) => {
  const account = await register(page)
  await expect(page.getByRole("heading", { level: 1, name: "Check your email" })).toBeFocused()

  await page.keyboard.press("Tab")
  const resend = page.getByRole("button", { name: "Resend email" })
  await expectVisibleFocus(resend)
  await page.keyboard.press("Enter")
  const resent = "If this address is waiting to be confirmed, a new link is on its way. Only the newest link works."
  await expect(statusWith(page, "a new link is on its way")).toHaveText(resent)
  await expect(resend).toBeFocused()

  await page.keyboard.press("Tab")
  await expectVisibleFocus(page.getByRole("button", { name: "Change email address" }))
  await page.keyboard.press("Enter")
  const email = page.getByLabel("Email", { exact: true })
  await expect(email).toBeFocused()
  await expect(email).toHaveValue(account.email)
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("E2E User")
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("")
})

test("signing in before confirming is refused exactly like a wrong password, and only the newest link confirms", async ({ page }) => {
  const account = await register(page)
  await page.getByRole("button", { name: "Resend email" }).click()
  await expect(statusWith(page, "a new link is on its way")).toBeVisible()
  const [newest, older] = await waitForEmails(account.email, SUBJECTS.verify, 2)

  // The right password for an unconfirmed account gets the same answer, hint included, as a wrong one.
  const unconfirmed = await refusedSignIn(page, account)
  const refusal = await unconfirmed.innerText()
  await expect(unconfirmed.getByRole("link", { name: "Get a new confirmation link" })).toHaveAttribute("href", "/resend-confirmation")
  await checkScreen(page, "sign-in refused")
  const wrongPassword = await refusedSignIn(page, { email: account.email, password: strongPassword() })
  expect(await wrongPassword.innerText()).toBe(refusal)

  // The older link opens the page; the newer link, opened in the same tab, changes only the fragment and starts the
  // page over with its token. Confirming waits for the button, here pressed with the keyboard.
  await page.goto(linkIn(older, "/verify-email"))
  await expect(page).toHaveURL(/\/verify-email$/)
  const confirm = page.getByRole("button", { name: "Confirm email address" })
  await expect(confirm).not.toHaveAttribute("aria-disabled", "true")
  await page.goto(linkIn(newest, "/verify-email"))
  await expect(page).toHaveURL(/\/verify-email$/)
  await expect(confirm).not.toHaveAttribute("aria-disabled", "true")
  await checkScreen(page, "verify email: ready")
  await confirm.focus()
  await expectVisibleFocus(confirm)
  await page.keyboard.press("Enter")
  await expect(page.getByRole("heading", { level: 1, name: "Email confirmed" })).toBeFocused()
  await checkScreen(page, "verify email: confirmed")
  await page.getByRole("link", { name: "Sign in" }).click()
  await expect(page).toHaveURL(/\/login\?reason=verified$/)
  await expect(page.getByText("Your email address is confirmed. Sign in to start using NextStep.")).toBeVisible()

  // Sending the newer link retired the older one.
  await page.goto(linkIn(older, "/verify-email"))
  await page.getByRole("button", { name: "Confirm email address" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "This link doesn't work" })).toBeFocused()
  await checkScreen(page, "verify email: retired link")

  await signIn(page, account)
  await expect(page.getByRole("heading", { level: 1, name: "What needs attention" })).toBeVisible()
})

test("registering again before confirming keeps only the newest name, password, and time zone", async ({ page }) => {
  const first = await register(page, { name: "First Try" })
  const second = await register(page, { name: "Second Try", email: first.email, timeZone: "Europe/Berlin" })
  const [newest, older] = await waitForEmails(first.email, SUBJECTS.verify, 2)

  await page.goto(linkIn(newest, "/verify-email"))
  await page.getByRole("button", { name: "Confirm email address" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Email confirmed" })).toBeVisible()
  // The first registration's link was retired when the second one was sent.
  await page.goto(linkIn(older, "/verify-email"))
  await page.getByRole("button", { name: "Confirm email address" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "This link doesn't work" })).toBeVisible()

  await refusedSignIn(page, first)
  await signIn(page, second)
  await page.goto("/settings")
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Second Try")
  await expect(page.getByLabel("Time zone")).toHaveValue("Europe/Berlin")
})

test("the sign-in hint leads to a new confirmation link, with the same answer for any address", async ({ page }) => {
  const account = await register(page)
  const refused = await refusedSignIn(page, account)
  await refused.getByRole("link", { name: "Get a new confirmation link" }).click()
  await expect(page).toHaveURL(/\/resend-confirmation$/)
  await expect(page.getByRole("heading", { level: 1, name: "Get a new confirmation link" })).toBeVisible()
  await checkScreen(page, "new confirmation link")

  // With the keyboard, from the heading (clicking it sets where Tab starts). An address without an account gets the
  // same answer.
  const email = page.getByLabel("Email", { exact: true })
  await page.getByRole("heading", { level: 1, name: "Get a new confirmation link" }).click()
  await page.keyboard.press("Tab")
  await expectVisibleFocus(email)
  const unknown = uniqueEmail()
  await page.keyboard.type(unknown)
  await page.keyboard.press("Enter")
  await expect(statusWith(page, unknown)).toHaveText(newLinkSent(unknown))
  await email.fill(account.email)
  await email.press("Enter")
  await expect(statusWith(page, account.email)).toHaveText(newLinkSent(account.email))
  await checkScreen(page, "new confirmation link: sent")

  const [newest] = await waitForEmails(account.email, SUBJECTS.verify, 2)
  expect(await emailsTo(unknown)).toEqual([])
  await page.goto(linkIn(newest, "/verify-email"))
  await page.getByRole("button", { name: "Confirm email address" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Email confirmed" })).toBeVisible()
  await signIn(page, account)
})

test("a request refused for an unconfirmed email ends the session and asks to confirm first", async ({ page }) => {
  await createAccount(page)
  // Sign-in now requires a confirmed email, so only a session from before that rule can get this answer. The API's
  // refusal is simulated for the dashboard; signing out is real.
  await page.route("**/api/v1/dashboard", (route) => route.fulfill({
    status: 403,
    json: { code: "EMAIL_NOT_VERIFIED", message: "Confirm your email address to use your workspace. Check your inbox for the link." },
  }))
  const signedOut = page.waitForResponse((response) => response.url().endsWith("/api/v1/auth/logout") && response.status() === 204)
  await page.reload()
  await signedOut
  await expect(page).toHaveURL(/\/login\?reason=confirm-email$/)
  const notice = page.getByRole("status").filter({ hasText: "Confirm your email address first, then sign in." })
  await expect(notice).toBeVisible()
  await expect(notice.getByRole("link", { name: "Get a new confirmation link" })).toHaveAttribute("href", "/resend-confirmation")
  await expectNoAxeViolations(page, "sign-in after an unconfirmed session")

  // The session really ended, so the sign-in page stays, and the workspace asks to sign in again.
  await page.unroute("**/api/v1/dashboard")
  await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible()
  await page.goto("/dashboard")
  await expect(page).toHaveURL(/\/login$/)
})
