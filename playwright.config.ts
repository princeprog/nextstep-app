import { defineConfig, devices } from "@playwright/test"

const CI = Boolean(process.env.CI)

/**
 * End-to-end tests run the built app (pnpm build first) against a running API.
 * Start the API with relaxed rate limits for repeated local runs: ..\nextstep-api\scripts\run-api.ps1 -RelaxedLimits
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: 3,
  reporter: CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    timezoneId: "Asia/Manila",
    locale: "en-US",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "pnpm start",
      url: "http://localhost:3000/login",
      reuseExistingServer: !CI,
      timeout: 120_000,
    },
    {
      // The same build with APP_HTTPS=true, so e2e/security-headers.spec.ts can check the HTTPS-only headers.
      command: "pnpm exec next start --port 3100",
      url: "http://localhost:3100/login",
      env: { APP_HTTPS: "true" },
      reuseExistingServer: !CI,
      timeout: 120_000,
    },
  ],
})

