import { defineConfig, devices } from "@playwright/test"

/**
 * End-to-end tests run the built app (pnpm build first) against a running API.
 * Start the API with relaxed rate limits for repeated local runs: ..\nextstep-api\scripts\run-api.ps1 -RelaxedLimits
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 3,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    timezoneId: "Asia/Manila",
    locale: "en-US",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm start",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
})

