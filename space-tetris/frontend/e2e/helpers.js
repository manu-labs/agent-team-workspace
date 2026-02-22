import { request } from "@playwright/test";

function apiBase() {
  return process.env.PLAYWRIGHT_API_URL || "http://localhost:3001/api";
}

/**
 * Register a new user via the API directly (bypasses UI for test setup speed).
 * Returns { token, user }.
 */
export async function registerViaApi(username, password = "testpass123") {
  const ctx = await request.newContext();
  const res = await ctx.post(`${apiBase()}/auth/register`, {
    data: { username, password },
  });
  const body = await res.json();
  await ctx.dispose();
  if (!body.token) throw new Error(`Register failed: ${JSON.stringify(body)}`);
  return body;
}

/**
 * Login via the API directly. Returns { token, user }.
 */
export async function loginViaApi(username, password = "testpass123") {
  const ctx = await request.newContext();
  const res = await ctx.post(`${apiBase()}/auth/login`, {
    data: { username, password },
  });
  const body = await res.json();
  await ctx.dispose();
  if (!body.token) throw new Error(`Login failed: ${JSON.stringify(body)}`);
  return body;
}

/**
 * Submit a score via the API directly (for pre-populating leaderboard in tests).
 */
export async function submitScoreViaApi(token, score, extras = {}) {
  const ctx = await request.newContext();
  await ctx.post(`${apiBase()}/scores`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { score, lines_cleared: 10, level: 2, duration_seconds: 60, ...extras },
  });
  await ctx.dispose();
}

/**
 * Set auth token in localStorage so the app loads as a logged-in user.
 * Call this after page.goto() but before interacting with the page.
 */
export async function loginViaLocalStorage(page, token, user) {
  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem("auth-token", token);
      localStorage.setItem("auth-user", JSON.stringify(user));
    },
    { token, user }
  );
}

/**
 * Generate a unique username for test isolation.
 */
export function uniqueUsername(prefix = "tester") {
  return `${prefix}_${Date.now().toString(36)}`;
}
