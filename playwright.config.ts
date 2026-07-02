import { defineConfig, devices } from "@playwright/test";

const useExternalServer = process.env.RIZHI_E2E_EXTERNAL_SERVER === "1";
const useFastify = process.env.RIZHI_E2E_FASTIFY === "1";
const webServer = useFastify
  ? [
      {
        command: "node ./node_modules/tsx/dist/cli.mjs ./server/app/main.ts",
        env: { ...process.env, RIZHI_FASTIFY_PORT: "18977" },
        url: "http://127.0.0.1:18977/api/v1/health",
        reuseExistingServer: false,
        timeout: 60_000,
      },
      {
        command: "node ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port 15173",
        env: {
          ...process.env,
          VITE_DATA_SOURCE: "http",
          VITE_API_BASE_URL: "http://127.0.0.1:18977/api/v1",
        },
        url: "http://127.0.0.1:15173/assets",
        reuseExistingServer: false,
        timeout: 60_000,
      },
    ]
  : {
      command: "node ./node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173",
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
    baseURL: useFastify ? "http://127.0.0.1:15173" : "http://127.0.0.1:5173",
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
