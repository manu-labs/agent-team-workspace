import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.js"],
    // Run test files sequentially — avoids SQLite concurrency issues
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
    testTimeout: 15000, // bcrypt with 10 rounds is ~100ms per hash
  },
});
