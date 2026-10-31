import AxeBuilder from "@axe-core/playwright"
import { expect, type Locator, type Page } from "@playwright/test"

export const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]

export async function expectNoAxeViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
  expect(results.violations, label).toEqual([])
}

/** Nothing on the page scrolls sideways. */
export async function expectNoSidewaysScroll(page: Page, label: string) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow, label).toBeLessThanOrEqual(0)
}

/** The screen as it is now, at 320 CSS px wide. The previous size is restored afterwards. */
export async function expectFitsNarrowScreen(page: Page, label: string) {
  const previous = page.viewportSize()
  await page.setViewportSize({ width: 320, height: 720 })
  // Let layout and any media-query-driven rendering settle.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await expectNoSidewaysScroll(page, label + " at 320 px")
  if (previous) {
    await page.setViewportSize(previous)
  }
}

/** An automated accessibility scan and the 320 px check, for a screen reached in the middle of a flow. */
export async function checkScreen(page: Page, label: string) {
  await expectNoAxeViolations(page, label)
  await expectFitsNarrowScreen(page, label)
}

/** The element has keyboard focus and shows it: an outline, or the focus ring the app's controls draw. */
export async function expectVisibleFocus(locator: Locator) {
  await expect(locator).toBeFocused()
  const shown = await locator.evaluate((element) => {
    const style = getComputedStyle(element)
    const outline = style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0
    return outline || style.boxShadow !== "none"
  })
  expect(shown, "visible focus indicator").toBe(true)
}
