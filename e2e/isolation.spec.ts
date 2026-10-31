import { expect, test, watchPolicyProblems } from "./fixtures"
import { createApplication, register, startDemo } from "./helpers"

test("one account cannot see another account's application", async ({ browser }) => {
  const ownerContext = await browser.newContext()
  const ownerProblems = await watchPolicyProblems(ownerContext)
  const owner = await ownerContext.newPage()
  await register(owner, "Owner")
  const id = await createApplication(owner, "Private Owner Co")

  const otherContext = await browser.newContext()
  const otherProblems = await watchPolicyProblems(otherContext)
  const other = await otherContext.newPage()
  await register(other, "Someone Else")
  await other.goto("/applications/" + id)
  await expect(other.getByRole("heading", { name: "Application not found" })).toBeVisible()
  await expect(other.getByText("Private Owner Co")).toHaveCount(0)
  await other.goto("/applications?search=Private%20Owner")
  await expect(other.getByRole("heading", { name: "No applications match these filters" })).toBeVisible()

  await ownerContext.close()
  await otherContext.close()
  expect([...ownerProblems, ...otherProblems]).toEqual([])
})

test("two demo visitors get separate workspaces", async ({ browser }) => {
  const firstContext = await browser.newContext()
  const firstProblems = await watchPolicyProblems(firstContext)
  const first = await firstContext.newPage()
  await startDemo(first)
  await expect(first.getByRole("note")).toContainText("temporary demo with fictional data")
  await first.goto("/applications?search=Harbor")
  await first.getByRole("link", { name: "Harbor Labs" }).filter({ visible: true }).first().click()
  await first.waitForURL(/\/applications\/[0-9a-f-]{36}$/)
  const harborId = first.url().split("/").pop()!
  await first.getByLabel("Status for Harbor Labs — Frontend Developer").selectOption("OFFER")
  await expect(first.getByText("Harbor Labs moved to Offer")).toBeVisible()

  const secondContext = await browser.newContext()
  const secondProblems = await watchPolicyProblems(secondContext)
  const second = await secondContext.newPage()
  await startDemo(second)
  await second.goto("/applications/" + harborId)
  await expect(second.getByRole("heading", { name: "Application not found" })).toBeVisible()
  await second.goto("/applications?search=Harbor")
  await second.getByRole("link", { name: "Harbor Labs" }).filter({ visible: true }).first().click()
  await second.waitForURL(/\/applications\/[0-9a-f-]{36}$/)
  await expect(second.getByLabel("Status for Harbor Labs — Frontend Developer")).toHaveValue("INTERVIEW")

  await firstContext.close()
  await secondContext.close()
  expect([...firstProblems, ...secondProblems]).toEqual([])
})

