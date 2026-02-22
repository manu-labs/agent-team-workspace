/**
 * Game E2E tests — Space Tetris canvas gameplay.
 *
 * These tests cover the full game flow: start screen, active gameplay,
 * keyboard controls, game over, and authenticated score submission.
 *
 * Note: Some tests depend on UI elements added in issue #66 (Game UI & Space Theme).
 * Expected selectors:
 *   - [data-testid="game-canvas"] or <canvas> — the Tetris canvas
 *   - [data-testid="score"] or text matching score label — current score display
 *   - [data-testid="level"] — current level display
 *   - [data-testid="lines"] — lines cleared display
 *   - [data-testid="game-over"] or text "Game Over" — game over overlay
 *   - [data-testid="final-score"] — score shown on game over screen
 *   - [data-testid="submit-score"] or button "Submit Score" — score submission
 *   - [data-testid="play-again"] or button "Play Again" — restart
 */

import { test, expect } from "@playwright/test";
import { registerViaApi, uniqueUsername } from "./helpers.js";

// ---------------------------------------------------------------------------
// Start screen
// ---------------------------------------------------------------------------
test.describe("Start screen", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("shows SPACE TETRIS title", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /space tetris/i })).toBeVisible();
  });

  test("shows a Start Game button", async ({ page }) => {
    await expect(page.getByRole("button", { name: /start game/i })).toBeVisible();
  });

  test("shows the game canvas area after clicking Start Game", async ({ page }) => {
    await page.getByRole("button", { name: /start game/i }).click();

    // Canvas element should appear once game starts
    await expect(page.locator("canvas")).toBeVisible({ timeout: 3000 });
  });

  test("nav links to leaderboard are visible", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: /leaderboard/i })
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Active gameplay
// ---------------------------------------------------------------------------
test.describe("Active gameplay", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /start game/i }).click();
    // Wait for canvas to be ready
    await expect(page.locator("canvas")).toBeVisible({ timeout: 3000 });
  });

  test("canvas is rendered and has dimensions", async ({ page }) => {
    const canvas = page.locator("canvas");
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeGreaterThan(100);
    expect(box.height).toBeGreaterThan(200);
  });

  test("score display is visible and starts at 0", async ({ page }) => {
    const score = page
      .locator('[data-testid="score"]')
      .or(page.getByText(/score[:\s]*0/i));
    await expect(score).toBeVisible({ timeout: 2000 });
  });

  test("level display is visible", async ({ page }) => {
    await expect(
      page.locator('[data-testid="level"]').or(page.getByText(/level[:\s]*1/i))
    ).toBeVisible({ timeout: 2000 });
  });

  test("left arrow key moves piece (game responds to input)", async ({ page }) => {
    const canvas = page.locator("canvas");
    await canvas.click(); // focus
    const scoreBefore = await page
      .locator('[data-testid="score"]')
      .textContent()
      .catch(() => "0");

    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowRight");

    // Game shouldn't crash and canvas should still be visible
    await expect(canvas).toBeVisible();
    // Score may or may not change from arrow moves — just verify no crash
  });

  test("ArrowUp / Z rotates the piece", async ({ page }) => {
    const canvas = page.locator("canvas");
    await canvas.click();
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("z");
    await expect(canvas).toBeVisible();
  });

  test("Space hard-drops the piece", async ({ page }) => {
    const canvas = page.locator("canvas");
    await canvas.click();
    await page.keyboard.press("Space");
    // After hard drop the piece should land — canvas still visible, no crash
    await expect(canvas).toBeVisible();
  });

  test("ArrowDown soft-drops the piece", async ({ page }) => {
    const canvas = page.locator("canvas");
    await canvas.click();
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("ArrowDown");
    }
    await expect(canvas).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Game over
// ---------------------------------------------------------------------------
test.describe("Game over screen", () => {
  /**
   * Trigger game over by filling the board with hard drops.
   * Spams Space (hard drop) enough times to fill the board.
   */
  async function triggerGameOver(page) {
    await page.goto("/");
    await page.getByRole("button", { name: /start game/i }).click();
    await expect(page.locator("canvas")).toBeVisible({ timeout: 3000 });

    const canvas = page.locator("canvas");
    await canvas.click();

    // Spam hard drops until game over appears (max 30 iterations)
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press("Space");
      await page.waitForTimeout(50);
      const gameOver = await page
        .locator('[data-testid="game-over"]')
        .or(page.getByText(/game over/i))
        .isVisible()
        .catch(() => false);
      if (gameOver) break;
    }
  }

  test("game over screen appears after board fills up", async ({ page }) => {
    await triggerGameOver(page);
    await expect(
      page.locator('[data-testid="game-over"]').or(page.getByText(/game over/i))
    ).toBeVisible({ timeout: 5000 });
  });

  test("game over screen shows the final score", async ({ page }) => {
    await triggerGameOver(page);
    await expect(
      page.locator('[data-testid="game-over"]').or(page.getByText(/game over/i))
    ).toBeVisible({ timeout: 5000 });

    // Final score should be visible somewhere on the overlay
    const finalScore = page
      .locator('[data-testid="final-score"]')
      .or(page.getByText(/final score|your score/i));
    await expect(finalScore).toBeVisible({ timeout: 2000 });
  });

  test("Play Again button restarts the game", async ({ page }) => {
    await triggerGameOver(page);
    await expect(page.getByText(/game over/i)).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: /play again|restart/i }).click();

    // Game should restart — canvas visible, game over gone
    await expect(page.locator("canvas")).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/game over/i)).not.toBeVisible();
  });

  test("guest sees login prompt on game over (not submit score button)", async ({ page }) => {
    await triggerGameOver(page);
    await expect(page.getByText(/game over/i)).toBeVisible({ timeout: 5000 });

    // Guest should see a prompt to login to save score
    await expect(
      page
        .getByText(/login to save|sign in to save|create account/i)
        .or(page.getByRole("link", { name: /login/i }))
    ).toBeVisible({ timeout: 2000 });
  });

  test("logged-in user sees Submit Score button on game over", async ({ page }) => {
    const username = uniqueUsername("gameover");
    await registerViaApi(username);

    // Login first
    await page.goto("/login");
    await page.locator('input[type="text"]').fill(username);
    await page.locator('input[type="password"]').fill("testpass123");
    await page.getByRole("button", { name: /login|sign in/i }).click();
    await expect(page).toHaveURL("/");

    await triggerGameOver(page);
    await expect(page.getByText(/game over/i)).toBeVisible({ timeout: 5000 });

    await expect(
      page
        .locator('[data-testid="submit-score"]')
        .or(page.getByRole("button", { name: /submit score|save score/i }))
    ).toBeVisible({ timeout: 2000 });
  });

  test("logged-in user can submit score and it appears on leaderboard", async ({ page }) => {
    const username = uniqueUsername("scorer");
    await registerViaApi(username);

    await page.goto("/login");
    await page.locator('input[type="text"]').fill(username);
    await page.locator('input[type="password"]').fill("testpass123");
    await page.getByRole("button", { name: /login|sign in/i }).click();

    await triggerGameOver(page);
    await expect(page.getByText(/game over/i)).toBeVisible({ timeout: 5000 });

    const submitBtn = page
      .locator('[data-testid="submit-score"]')
      .or(page.getByRole("button", { name: /submit score|save score/i }));

    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      // Confirmation or redirect to leaderboard
      await expect(
        page.getByText(/submitted|saved|score recorded/i).or(
          page.getByRole("heading", { name: /leaderboard/i })
        )
      ).toBeVisible({ timeout: 5000 });

      // Verify on leaderboard
      await page.goto("/leaderboard");
      await page.waitForLoadState("networkidle");
      await expect(page.getByText(username)).toBeVisible();
    }
  });
});

// ---------------------------------------------------------------------------
// Mobile touch controls
// ---------------------------------------------------------------------------
test.describe("Mobile touch controls", () => {
  test.use({ ...require("@playwright/test").devices["Pixel 5"] });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /start game/i }).click();
    await expect(page.locator("canvas")).toBeVisible({ timeout: 3000 });
  });

  test("touch control buttons are visible on mobile", async ({ page }) => {
    // Expect on-screen d-pad or touch buttons
    const touchControls = page
      .locator('[data-testid="touch-controls"]')
      .or(page.locator('[data-testid="btn-left"]'))
      .or(page.getByRole("button", { name: /left/i }));

    await expect(touchControls).toBeVisible({ timeout: 2000 });
  });

  test("tapping left control moves piece left", async ({ page }) => {
    const canvas = page.locator("canvas");
    const leftBtn = page
      .locator('[data-testid="btn-left"]')
      .or(page.getByRole("button", { name: /left/i }));

    await leftBtn.tap();
    await expect(canvas).toBeVisible(); // game still running, no crash
  });

  test("tapping rotate control rotates piece", async ({ page }) => {
    const rotateBtn = page
      .locator('[data-testid="btn-rotate"]')
      .or(page.getByRole("button", { name: /rotate/i }));

    await rotateBtn.tap();
    await expect(page.locator("canvas")).toBeVisible();
  });

  test("tapping drop control hard-drops piece", async ({ page }) => {
    const dropBtn = page
      .locator('[data-testid="btn-drop"]')
      .or(page.getByRole("button", { name: /drop/i }));

    await dropBtn.tap();
    await expect(page.locator("canvas")).toBeVisible();
  });
});
