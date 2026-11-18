const { defineConfig, devices } = require("@playwright/test");
const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";
module.exports = defineConfig({
  testDir: "./tests", outputDir: process.env.OUT_DIR || "/tmp/oracle-out", timeout: 60000,
  globalSetup: require.resolve("./oracle-setup"), fullyParallel: true, workers: Number(process.env.WORKERS || 6),
  reporter: [["json", { outputFile: process.env.JSON_OUT || "/tmp/oracle.json" }]],
  use: { baseURL: BASE, video: "off", screenshot: "off", trace: "off" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } }],
});
