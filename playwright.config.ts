import { defineConfig, devices } from "@playwright/test"

const enableWebServer = process.env.PLAYWRIGHT_WEB_SERVER !== "0"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: enableWebServer
    ? {
        command: "npm run dev -- --hostname 127.0.0.1",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        url: "http://localhost:3000",
      }
    : undefined,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
