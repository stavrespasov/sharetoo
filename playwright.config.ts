import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.SHARETOO_TEST_URL ?? "http://127.0.0.1:3100";
const executablePath = process.env.SHARETOO_CHROMIUM;
export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  reporter: "list",
  use: {baseURL, trace:"retain-on-failure", launchOptions:executablePath ? {executablePath} : {}},
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport:{width:1440,height:950} } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType:"chromium" } },
  ],
  webServer: process.env.SHARETOO_TEST_URL ? undefined : {command:"npm run dev -- --hostname 127.0.0.1 --port 3100",url:baseURL,reuseExistingServer:false,timeout:60000},
});
