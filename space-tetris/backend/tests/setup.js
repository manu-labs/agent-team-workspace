// Global test setup — runs before each test file
// Must set env vars before any module imports that read them
import { initDb } from "../src/db/index.js";

process.env.DB_PATH = "/tmp/space-tetris-test.db";
process.env.JWT_SECRET = "test-secret-not-for-production";

// Initialize DB once for the entire test run (singleFork keeps one process)
initDb();
