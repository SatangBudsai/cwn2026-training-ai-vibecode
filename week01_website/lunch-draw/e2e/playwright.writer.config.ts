// Temporary config for test writers: runs specs against an already-running server
// (BASE_URL), without building. The official run still uses playwright.config.ts.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  expect: { timeout: 5_000 },
  workers: 1,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3301",
    ...devices["Desktop Chrome"],
    viewport: { width: 1440, height: 1000 },
    locale: "th-TH",
    timezoneId: "Asia/Bangkok",
    trace: "off",
  },
  outputDir: process.env.PW_OUT ?? "../../.pw-writer-out",
});
