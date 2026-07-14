import { defineConfig, devices } from "@playwright/test";

const useExternalServer = process.env.RIZHI_E2E_EXTERNAL_SERVER === "1";
const webServer = {
  command: "node ./node_modules/vite/bin/vite.js --mode unicloud --host 127.0.0.1 --port 5173",
  url: "http://127.0.0.1:5173/assets",
  reuseExistingServer: !process.env.CI,
  timeout: 60_000,
};

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: {
    timeout: 8_000,
  },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: useExternalServer ? undefined : webServer,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
