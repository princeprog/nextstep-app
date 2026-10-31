import { defineConfig, devices } from "@playwright/test"

const STAGING_URL = process.env.STAGING_URL ?? "https://app.nextstep.localhost:8443"

/**
 * Checks the production-like staging copy that scripts/staging.ps1 starts (see README, "Staging"); it starts no servers
 * of its own. The tests run in order in one browser and use part of the production rate limits for 127.0.0.1, so
 * restart staging with -Fresh before running them again within the hour.
 */
export default defineConfig({
  testDir: "./e2e-staging",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: STAGING_URL,
    // Local staging uses certificates from Caddy's own authority, which the browser doesn't trust. Any other target,
    // such as production for the post-deploy client-address check, must present a valid certificate.
    ignoreHTTPSErrors: new URL(STAGING_URL).hostname.endsWith(".localhost"),
    timezoneId: "Asia/Manila",
    locale: "en-US",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
})
