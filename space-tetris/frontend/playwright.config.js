import { defineConfig, devices } from "@playwright/test";

// Set PLAYWRIGHT_BASE_URL to the deployed Vercel URL when running against production.
// Defaults to local dev server.
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// API URL for direct API calls in test setup helpers.
// Defaults to the local backend proxy (Vite forwards /api to :3001).
const API_URL =
  process.env.PLAYWRIGHT_API_URL ||
  (BASE_URL.startsWith("http://localhost")
    ? "http://localhost:3001/api"
    : BASE_URL.replace(/\/$/, "") + "/api");

export default defineConfig({
  testDir: "./e2e",
  // Run tests sequentially — they share a live backend (leaderboard state, etc.)
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "html",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },
  projects: [
    {
      name: "Desktop Chrome",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],
  // Expose API_URL to tests via env
  globalSetup: "./e2e/globalSetup.js",
});
