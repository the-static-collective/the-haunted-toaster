const path = require("node:path");
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: __dirname,
  testMatch: "ui-witness.spec.cjs",
  snapshotPathTemplate: "{testDir}/ui-witness-baselines/{arg}{ext}",
  outputDir: path.join(__dirname, "ui-witness-results"),
  reporter: "line",
  use: {
    baseURL: process.env.UI_WITNESS_URL || "http://127.0.0.1:4173",
    browserName: "chromium",
    viewport: { width: 1380, height: 900 },
    colorScheme: "dark",
  },
  webServer: {
    command: "node scripts/serve-ui-witness.cjs",
    cwd: path.resolve(__dirname, ".."),
    port: 4173,
    reuseExistingServer: true,
  },
});
