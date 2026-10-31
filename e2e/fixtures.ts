import { expect, test as base, type BrowserContext } from "@playwright/test"

/** Browser messages that mean a page broke the Content-Security-Policy or sent an invalid Permissions-Policy. */
const POLICY_PROBLEM = /Content[- ]Security[- ]Policy|Permissions-Policy/i

/**
 * Collects policy problems from every page in a context. Chromium logs CSP violations to the console; the init
 * script also reports securitypolicyviolation events, which carry the blocked resource and directive.
 */
export async function watchPolicyProblems(context: BrowserContext): Promise<string[]> {
  const problems: string[] = []
  await context.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) => {
      console.error("Content Security Policy violation: " + event.effectiveDirective + " blocked " + (event.blockedURI || "inline code"))
    })
  })
  context.on("console", (message) => {
    if (POLICY_PROBLEM.test(message.text())) {
      problems.push((message.page()?.url() ?? "") + " " + message.text())
    }
  })
  return problems
}

/** Every test fails if a page in its default context reports a policy problem. */
export const test = base.extend<{ policyProblems: string[] }>({
  policyProblems: [
    async ({ context }, use) => {
      const problems = await watchPolicyProblems(context)
      await use(problems)
      expect(problems, "CSP or Permissions-Policy problems reported by the browser").toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
