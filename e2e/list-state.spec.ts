import { expect, test } from "./fixtures"
import { startDemo } from "./helpers"

test("search, filters, and sort live in the URL and survive back and forward", async ({ page }) => {
  await startDemo(page)
  await page.goto("/applications")
  await expect(page.getByText(/ of 8 applications$/)).toBeVisible()

  await page.getByLabel("Search", { exact: true }).fill("HARBOR")
  await expect(page).toHaveURL(/search=HARBOR/)
  await expect(page.getByText(/ of 1 application$/)).toBeVisible()

  await page.getByLabel("Status", { exact: true }).click()
  await page.getByRole("option", { name: "Offer", exact: true }).click()
  await expect(page).toHaveURL(/status=OFFER/)
  await expect(page.getByRole("heading", { name: "No applications match these filters" })).toBeVisible()

  await page.getByRole("button", { name: "Clear filters" }).first().click()
  await expect(page).toHaveURL(/\/applications$/)
  await expect(page.getByText(/ of 8 applications$/)).toBeVisible()

  await page.goBack()
  await expect(page).toHaveURL(/status=OFFER/)
  await expect(page.getByLabel("Status", { exact: true })).toContainText("Offer")
  await expect(page.getByLabel("Search", { exact: true })).toHaveValue("HARBOR")

  await page.goto("/applications?sort=company&direction=asc")
  const firstRow = page.locator("table tbody tr").first()
  await expect(firstRow).toContainText("Bluepeak Health")

  await page.getByRole("link", { name: "Bluepeak Health" }).filter({ visible: true }).first().click()
  await page.waitForURL(/\/applications\/[0-9a-f-]{36}$/)
  await page.getByRole("link", { name: "Back to applications" }).click()
  await expect(page).toHaveURL(/sort=company/)
})

test("a filter chosen while a search is still being typed is kept", async ({ page }) => {
  await startDemo(page)
  await page.goto("/applications")
  await expect(page.getByText(/ of 8 applications$/)).toBeVisible()

  // The status changes before the 300 ms search debounce fires; both must end up in the URL.
  await page.getByLabel("Search", { exact: true }).fill("a")
  await page.getByLabel("Status", { exact: true }).click()
  await page.getByRole("option", { name: "Applied", exact: true }).click()
  await expect(page).toHaveURL(/search=a/)
  await expect(page).toHaveURL(/search=a&status=APPLIED/)
  await expect(page.getByLabel("Status", { exact: true })).toContainText("Applied")
  await expect(page.getByLabel("Search", { exact: true })).toHaveValue("a")
})


