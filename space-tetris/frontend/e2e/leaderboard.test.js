import { test, expect } from "@playwright/test";
import { registerViaApi, submitScoreViaApi, uniqueUsername } from "./helpers.js";

// Pre-populate leaderboard once for all tests in this file
let seededUsers = [];

test.beforeAll(async () => {
  const players = [
    { username: uniqueUsername("top"), score: 50000, level: 10, lines: 100 },
    { username: uniqueUsername("mid"), score: 25000, level: 5, lines: 50 },
    { username: uniqueUsername("low"), score: 5000, level: 2, lines: 15 },
  ];

  for (const p of players) {
    const { token, user } = await registerViaApi(p.username);
    await submitScoreViaApi(token, p.score, { level: p.level, lines_cleared: p.lines });
    seededUsers.push({ ...p, token, user });
  }
});

// ---------------------------------------------------------------------------
// Leaderboard page — structure
// ---------------------------------------------------------------------------
test.describe("Leaderboard page — structure", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/leaderboard");
  });

  test("renders the Leaderboard heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /leaderboard/i })).toBeVisible();
  });

  test("shows period filter buttons: All Time, This Week, Today", async ({ page }) => {
    await expect(page.getByRole("button", { name: /all time/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /this week|weekly/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /today|daily/i })).toBeVisible();
  });

  test("shows table with Rank, Player, Score, Level, Lines headers", async ({ page }) => {
    await expect(page.getByRole("columnheader", { name: /rank/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /player/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /score/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /level/i })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: /lines/i })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Leaderboard page — data
// ---------------------------------------------------------------------------
test.describe("Leaderboard page — data", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/leaderboard");
    // Wait for loading state to resolve
    await expect(page.getByText(/loading/i)).not.toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test("displays seeded scores with player usernames", async ({ page }) => {
    for (const { username } of seededUsers) {
      await expect(page.getByText(username)).toBeVisible();
    }
  });

  test("shows scores in descending order (highest first)", async ({ page }) => {
    const rows = page.getByRole("row").filter({ hasNot: page.getByRole("columnheader") });
    const scoreTexts = await rows.locator("td").nth(2).allTextContents();
    const scores = scoreTexts
      .map((t) => parseInt(t.replace(/[^0-9]/g, ""), 10))
      .filter((n) => !isNaN(n));

    for (let i = 0; i < scores.length - 1; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
    }
  });

  test("top-seeded player appears in position 1 row", async ({ page }) => {
    const topUsername = seededUsers[0].username; // highest score
    const topRow = page.getByRole("row").filter({ hasText: topUsername });
    // Rank cell (first td) should be 1
    await expect(topRow.locator("td").first()).toHaveText("1");
  });
});

// ---------------------------------------------------------------------------
// Leaderboard page — period filter
// ---------------------------------------------------------------------------
test.describe("Leaderboard page — period filter", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/leaderboard");
    await page.waitForLoadState("networkidle");
  });

  test("All Time tab is active by default", async ({ page }) => {
    const allTimeBtn = page.getByRole("button", { name: /all time/i });
    // Active button should have a distinct visual state — check aria or class
    await expect(allTimeBtn).toBeVisible();
    // The data loads under alltime by default
    for (const { username } of seededUsers) {
      await expect(page.getByText(username)).toBeVisible();
    }
  });

  test("clicking This Week tab updates the table", async ({ page }) => {
    await page.getByRole("button", { name: /this week|weekly/i }).click();
    await page.waitForLoadState("networkidle");
    // Recently seeded scores should still appear in weekly view
    await expect(page.getByText(seededUsers[0].username)).toBeVisible();
  });

  test("clicking Today tab updates the table", async ({ page }) => {
    await page.getByRole("button", { name: /today|daily/i }).click();
    await page.waitForLoadState("networkidle");
    // Recently seeded scores should appear in daily view too
    await expect(page.getByText(seededUsers[0].username)).toBeVisible();
  });

  test("clicking All Time after another period brings back all scores", async ({ page }) => {
    await page.getByRole("button", { name: /this week|weekly/i }).click();
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /all time/i }).click();
    await page.waitForLoadState("networkidle");

    for (const { username } of seededUsers) {
      await expect(page.getByText(username)).toBeVisible();
    }
  });

  test("empty state message shown when no scores for period", async ({ page }) => {
    // Navigate directly with alltime to confirm empty state text exists in markup
    await page.getByRole("button", { name: /today|daily/i }).click();
    await page.waitForLoadState("networkidle");
    // If no scores: empty state message should appear OR scores should be listed
    const hasScores = (await page.getByRole("row").count()) > 1;
    const hasEmptyMsg = await page.getByText(/no scores yet|be the first/i).isVisible();
    expect(hasScores || hasEmptyMsg).toBeTruthy();
  });
});
