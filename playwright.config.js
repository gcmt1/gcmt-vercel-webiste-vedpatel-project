import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.js",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:4173",
    headless: true,
    trace: "retain-on-failure",
    launchOptions: process.env.CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH }
      : {},
  },
  webServer: {
    command: "npm run build && node tests/e2e/server.mjs",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      REACT_APP_SUPABASE_URL: "http://127.0.0.1:4173/supabase",
      REACT_APP_SUPABASE_ANON_KEY: "sb_publishable_local_test",
    },
  },
});
