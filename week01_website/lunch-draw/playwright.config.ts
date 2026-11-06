import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;

export default defineConfig({
  testDir: "./e2e/tests",
  timeout: 45_000,
  expect: { timeout: 5_000 },
  workers: 1, // one server keeps one data folder: run one test at a time so data never collides
  fullyParallel: false,
  reporter: [
    ["list"],
    ["html", { outputFolder: "e2e/report/html", open: "never" }],
    ["json", { outputFile: "e2e/report/results.json" }],
  ],
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices["Desktop Chrome"],
    viewport: { width: 1440, height: 1000 },
    locale: "th-TH",
    timezoneId: "Asia/Bangkok",
    screenshot: "on",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  outputDir: "e2e/test-results",
  webServer: {
    // its own data folder (e2e/.data) so tests never touch data/restaurants.json
    command: `node e2e/prepare-data.mjs && npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/restaurants`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: { LUNCH_DATA_DIR: "e2e/.data", LUNCH_TEST: "1" },
  },
});
