// Expose PLAYWRIGHT_API_URL so test helpers can make direct API calls for setup/teardown.
// This runs once before all test files.
export default function globalSetup() {
  const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
  if (!process.env.PLAYWRIGHT_API_URL) {
    process.env.PLAYWRIGHT_API_URL = base.startsWith("http://localhost")
      ? "http://localhost:3001/api"
      : base.replace(/\/$/, "") + "/api";
  }
}
