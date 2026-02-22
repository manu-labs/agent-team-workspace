import { test, expect } from "@playwright/test";
import { registerViaApi, submitScoreViaApi, uniqueUsername } from "./helpers.js";

let seededUsers = [];

test.beforeAll(async () => {
  // Use very high scores to guarantee top-of-leaderboard visibility
  const players = [
    { username: uniqueUsername("top"), score: 999999, level: 20, lines: 200 },
    { username: uniqueUsername("mid"), score: 888888, level: 15, lines: 150 },
    { username: uniqueUsername("low"), score: 777777, level: 10, lines: 100 },
  ];

  for (const p of players) {
    const { token } = await registerViaApi(p.username);
    await submitScoreViaApi(token, p.score, { level: p.level, lines_cleared: p.lines });
    seededUsers.push({ ...p, token });
  }
});

test.describe("Leaderboard page — structure", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/leaderboard");
    // Wait for either content or loading to appear
    await page.waitForTimeout(2000);
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
    await expect(page.locator("th").filter({ hasText: /rank/i })).toBeVisible();
    await expect(page.locator("th").filter({ hasText: /player/i })).toBeVisible();
    await expect(page.locator("th").filter({ hasText: /score/i })).toBeVisible();
    await expect(page.locator("th").filter({ hasText: /level/i })).toBeVisible();
    await expect(page.locator("th").filter({ hasText: /lines/i })).toBeVisible();
  });
});

test.describe("Leaderboard page — data", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/leaderboard");
    // Wait for loading state to resolve or 3s max
    await page.getByText(/loading/i).waitFor({ state: "hidden", timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(1000);
  });

  test("displays seeded scores with player usernames", async ({ page }) => {
    for (const { username } of seededUsers) {
      await expect(page.getByText(username)).toBeVisible({ timeout: 10000 });
    }
  });

  test("shows scores in descending order (highest first)", async ({ page }) => {
    const rows = page.locator("tbody tr").filter({ hasNot: page.locator("td[colspan]") });
    const scoreTexts = await rows.locator("td").nth(2).allTextContents();
    const scores = scoreTexts
      .map((t) => parseInt(t.replace(/[^0-9]/g, ""), 10))
      .filter((n) => !isNaN(n) && n > 0);

    expect(scores.length).toBeGreaterThan(0);
    for (let i = 0; i < scores.length - 1; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
    }
  });

  test("top-seeded player appears in position 1 row", async ({ page }) => {
    const topUsername = seededUsers[0].username;
    await expect(page.getByText(topUsername)).toBeVisible({ timeout: 10000 });
    const topRow = page.getByRole("row").filter({ hasText: topUsername });
    await expect(topRow.locator("td").first()).toHaveText("1");
  });
});

test.describe("Leaderboard page — period filter", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/leaderboard");
    // Wait for content — avoid networkidle which hangs due to 30s auto-refresh
    await page.waitForTimeout(2000);
  });

  test("All Time tab is active by default and shows seeded scores", async ({ page }) => {
    await expect(page.getByRole("button", { name: /all time/i })).toBeVisible();
    for (const { username } of seededUsers) {
      await expect(page.getByText(username)).toBeVisible({ timeout: 10000 });
    }
  });

  test("clicking This Week tab updates the table", async ({ page }) => {
    await page.getByRole("button", { name: /this week|weekly/i }).click();
    await page.waitForTimeout(1500);
    await expect(page.getByText(seededUsers[0].username)).toBeVisible({ timeout: 10000 });
  });

  test("clicking Today tab updates the table", async ({ page }) => {
    await page.getByRole("button", { name: /today|daily/i }).click();
    await page.waitForTimeout(1500);
    await expect(page.getByText(seededUsers[0].username)).toBeVisible({ timeout: 10000 });
  });

  test("clicking All Time after another period brings back all scores", async ({ page }) => {
    await page.getByRole("button", { name: /this week|weekly/i }).click();
    await page.waitForTimeout(1000);
    await page.getByRole("button", { name: /all time/i }).click();
    await page.waitForTimeout(1500);

    for (const { username } of seededUsers) {
      await expect(page.getByText(username)).toBeVisible({ timeout: 10000 });
    }
  });

  test("empty state or scores shown for Today filter", async ({ page }) => {
    await page.getByRole("button", { name: /today|daily/i }).click();
    await page.waitForTimeout(1500);
    const hasScores = (await page.getByRole("row").count()) > 1;
    const hasEmptyMsg = await page.getByText(/no scores yet|be the first/i).isVisible();
    expect(hasScores || hasEmptyMsg).toBeTruthy();
  });
});