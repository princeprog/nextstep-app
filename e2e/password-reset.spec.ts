import { checkScreen, expectNoAxeViolations, expectVisibleFocus } from "./a11y"
import { expect, test, watchPolicyProblems } from "./fixtures"
import { createAccount, signIn, statusWith, strongPassword, uniqueEmail } from "./helpers"
import { emailsTo, latestEmail, linkIn, SUBJECTS, waitForEmails } from "./mailpit"

const sentMessage = (email: string) =>
  "If an account uses " + email + ", we've sent a link to reset its password. It expires in 30 minutes."

test("forgot password answers the same whether or not the address has an account", async ({ page, browser }) => {
  const ownerContext = await browser.newContext()
  const ownerProblems = await watchPolicyProblems(ownerContext)
  const account = await createAccount(await ownerContext.newPage())
  await ownerContext.close()

  await page.goto("/login")
  await page.getByRole("link", { name: "Forgot password?" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Reset your password" })).toBeVisible()
  await checkScreen(page, "forgot password")

  const email = page.getByLabel("Email", { exact: true })
  const unknown = uniqueEmail()
  await email.fill(unknown)
  await page.getByRole("button", { name: "Send reset link" }).click()
  await expect(statusWith(page, unknown)).toHaveText(sentMessage(unknown))

  // The same answer for a real account, submitted with the keyboard.
  await email.fill(account.email)
  await email.press("Enter")
  await expect(statusWith(page, account.email)).toHaveText(sentMessage(account.email))
  await expectVisibleFocus(email)
  await checkScreen(page, "forgot password: sent")

  // Only the real account's inbox gets a link.
  await waitForEmails(account.email, SUBJECTS.reset)
  expect(await emailsTo(unknown)).toEqual([])
  expect(ownerProblems).toEqual([])
})

test("a reset link sets a new password once and signs out every other browser", async ({ page, browser }) => {
  const account = await createAccount(page)

  const otherContext = await browser.newContext()
  const otherProblems = await watchPolicyProblems(otherContext)
  const other = await otherContext.newPage()
  await other.goto("/forgot-password")
  await other.getByLabel("Email", { exact: true }).fill(account.email)
  await other.getByRole("button", { name: "Send reset link" }).click()
  await expect(statusWith(other, account.email)).toHaveText(sentMessage(account.email))
  const link = linkIn(await latestEmail(account.email, SUBJECTS.reset), "/reset-password")

  await other.goto(link)
  await expect(other).toHaveURL(/\/reset-password$/)
  await expect(other.getByRole("heading", { level: 1, name: "Choose a new password" })).toBeVisible()
  await checkScreen(other, "reset password")

  // With the keyboard (the site name in the header comes first): a password the API refuses is explained next to
  // the field, which keeps focus.
  const field = other.getByLabel("New password")
  await other.keyboard.press("Tab")
  await expect(other.getByRole("link", { name: "NextStep" })).toBeFocused()
  await other.keyboard.press("Tab")
  await expectVisibleFocus(field)
  await other.keyboard.type("too short")
  await other.keyboard.press("Enter")
  await expect(other.getByText("Use between 12 and 128 characters.")).toBeVisible()
  await expect(field).toHaveAttribute("aria-invalid", "true")
  await expect(field).toHaveAttribute("aria-describedby", "password-hint password-error")
  await expect(field).toBeFocused()
  await expectNoAxeViolations(other, "reset password with an error")

  const newPassword = strongPassword()
  await field.fill(newPassword)
  await field.press("Enter")
  await expect(other.getByRole("heading", { level: 1, name: "Password changed" })).toBeFocused()
  await expect(other.getByText("You're signed out on every device. Sign in with your new password.")).toBeVisible()
  await checkScreen(other, "password changed")

  // The browser that was signed in loses its session on its next request.
  await page.getByRole("link", { name: "Applications", exact: true }).click()
  await expect(page).toHaveURL(/\/login\?reason=expired$/)

  await other.getByRole("link", { name: "Sign in" }).click()
  await expect(other).toHaveURL(/\/login\?reason=password-reset$/)
  await expect(other.getByText("Your password was changed and every device was signed out.")).toBeVisible()
  await other.getByLabel("Email", { exact: true }).fill(account.email)
  await other.getByLabel("Password", { exact: true }).fill(account.password)
  await other.getByRole("button", { name: "Sign in" }).click()
  await expect(other.getByText("Email or password is incorrect.")).toBeVisible()
  await signIn(other, { email: account.email, password: newPassword })

  // The link worked once.
  await other.goto(link)
  await other.getByLabel("New password").fill(strongPassword())
  await other.getByRole("button", { name: "Change password" }).click()
  await expect(other.getByRole("heading", { level: 1, name: "This link doesn't work" })).toBeFocused()
  await checkScreen(other, "reset password: used link")
  await other.getByRole("link", { name: "Request a new link" }).click()
  await expect(other).toHaveURL(/\/forgot-password$/)

  await otherContext.close()
  expect(otherProblems).toEqual([])
})
