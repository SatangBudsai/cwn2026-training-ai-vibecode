const { defineConfig, devices } = require("@playwright/test");
module.exports = defineConfig({
  testDir: ".", testMatch: "**/*.spec.js", outputDir: "../.e2e-out", timeout: 30000,
  globalSetup: require.resolve("./global-setup.js"), fullyParallel: false, workers: 1,
  reporter: process.env.JSON_OUT ? [["json", { outputFile: process.env.JSON_OUT }]] : [["list"]],
  use: { baseURL: process.env.BASE_URL, video: "off", trace: "off", screenshot: "off" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } }],
});
