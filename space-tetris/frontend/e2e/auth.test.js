import { test, expect } from "@playwright/test";
import { registerViaApi, uniqueUsername } from "./helpers.js";

// ---------------------------------------------------------------------------
// Register page
// ---------------------------------------------------------------------------
test.describe("Register page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/register");
  });

  test("renders the registration form", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /create account/i })).toBeVisible();
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /login/i })).toBeVisible();
  });

  test("can register a new account and lands on game page", async ({ page }) => {
    const username = uniqueUsername("reg");

    await page.locator('input[type="text"]').fill(username);
    await page.locator('input[type="password"]').first().fill("password123");
    await page.locator('input[type="password"]').last().fill("password123");
    await page.getByRole("button", { name: /create account/i }).click();

    // After successful registration, app should redirect to home (game page)
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: /space tetris/i })).toBeVisible();
  });

  test("shows error when passwords do not match", async ({ page }) => {
    await page.locator('input[type="text"]').fill(uniqueUsername());
    await page.locator('input[type="password"]').first().fill("password123");
    await page.locator('input[type="password"]').last().fill("differentpass");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
    await expect(page).toHaveURL("/register"); // stayed on register
  });

  test("shows error when username is already taken", async ({ page }) => {
    const username = uniqueUsername("dup");
    await registerViaApi(username); // register once via API

    await page.locator('input[type="text"]').fill(username);
    await page.locator('input[type="password"]').first().fill("password123");
    await page.locator('input[type="password"]').last().fill("password123");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page.getByText(/already taken/i)).toBeVisible();
  });

  test("shows error for short password", async ({ page }) => {
    await page.locator('input[type="text"]').fill(uniqueUsername());
    await page.locator('input[type="password"]').first().fill("abc");
    await page.locator('input[type="password"]').last().fill("abc");
    await page.getByRole("button", { name: /create account/i }).click();

    // HTML5 validation or server error should surface
    const hasError =
      (await page.locator('input[minlength]').first().evaluate((el) => el.validity.tooShort)) ||
      (await page.getByText(/6 characters/i).isVisible().catch(() => false));
    expect(hasError).toBeTruthy();
  });

  test("login link navigates to login page", async ({ page }) => {
    await page.getByRole("link", { name: /login/i }).click();
    await expect(page).toHaveURL("/login");
  });
});

// ---------------------------------------------------------------------------
// Login page
// ---------------------------------------------------------------------------
test.describe("Login page", () => {
  let testUsername;
  const testPassword = "testpass123";

  test.beforeAll(async () => {
    testUsername = uniqueUsername("login");
    await registerViaApi(testUsername, testPassword);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("renders the login form", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /login|sign in/i })).toBeVisible();
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /login|sign in/i })).toBeVisible();
  });

  test("can login with valid credentials and lands on game page", async ({ page }) => {
    await page.locator('input[type="text"]').fill(testUsername);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.getByRole("button", { name: /login|sign in/i }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: /space tetris/i })).toBeVisible();
  });

  test("shows error on wrong password", async ({ page }) => {
    await page.locator('input[type="text"]').fill(testUsername);
    await page.locator('input[type="password"]').fill("wrongpassword");
    await page.getByRole("button", { name: /login|sign in/i }).click();

    await expect(page.getByText(/invalid/i)).toBeVisible();
    await expect(page).toHaveURL("/login");
  });

  test("shows error on nonexistent user", async ({ page }) => {
    await page.locator('input[type="text"]').fill("no_such_user_xyz");
    await page.locator('input[type="password"]').fill("password123");
    await page.getByRole("button", { name: /login|sign in/i }).click();

    await expect(page.getByText(/invalid/i)).toBeVisible();
  });

  test("register link navigates to register page", async ({ page }) => {
    await page.getByRole("link", { name: /register|create account|sign up/i }).click();
    await expect(page).toHaveURL("/register");
  });
});

// ---------------------------------------------------------------------------
// Auth state / logout
// ---------------------------------------------------------------------------
test.describe("Auth state", () => {
  test("navbar shows username when logged in", async ({ page }) => {
    const username = uniqueUsername("nav");
    await registerViaApi(username);

    await page.goto("/login");
    await page.locator('input[type="text"]').fill(username);
    await page.locator('input[type="password"]').fill("testpass123");
    await page.getByRole("button", { name: /login|sign in/i }).click();

    await expect(page).toHaveURL("/");
    // Nav should reflect logged-in state — username or logout button visible
    await expect(
      page.getByText(username).or(page.getByRole("button", { name: /logout|sign out/i }))
    ).toBeVisible();
  });

  test("can logout and returns to guest state", async ({ page }) => {
    const username = uniqueUsername("logout");
    await registerViaApi(username);

    // Login via UI
    await page.goto("/login");
    await page.locator('input[type="text"]').fill(username);
    await page.locator('input[type="password"]').fill("testpass123");
    await page.getByRole("button", { name: /login|sign in/i }).click();
    await expect(page).toHaveURL("/");

    // Logout
    await page.getByRole("button", { name: /logout|sign out/i }).click();

    // Should be back to guest — login link visible again
    await expect(
      page.getByRole("link", { name: /login/i }).or(page.getByRole("button", { name: /login/i }))
    ).toBeVisible();
  });
});
