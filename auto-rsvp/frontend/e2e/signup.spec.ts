import { test, expect } from "@playwright/test";
import { deleteTestUser } from "./helpers";

const API_BASE =
  process.env.API_URL || "https://auto-rsvp-production.up.railway.app";

test.describe("Signup page", () => {
  test("renders form with all required fields", async ({ page }) => {
    await page.goto("/signup");
    await expect(
      page.getByRole("heading", { name: "Get started" })
    ).toBeVisible();
    await expect(page.getByLabel("First name")).toBeVisible();
    await expect(page.getByLabel("Last name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Describe your interests")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Start Auto-RSVPing/ })
    ).toBeVisible();
  });

  test("shows validation errors on empty submit", async ({ page }) => {
    await page.goto("/signup");
    await page.getByRole("button", { name: /Start Auto-RSVPing/ }).click();
    await expect(page.getByText("First name is required.")).toBeVisible();
    await expect(page.getByText("Last name is required.")).toBeVisible();
    await expect(page.getByText("Email is required.")).toBeVisible();
    await expect(
      page.getByText(/Tell us what events you're looking for/)
    ).toBeVisible();
  });

  test("shows error for invalid email", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("First name").fill("Jane");
    await page.getByLabel("Last name").fill("Smith");
    await page.getByLabel("Email").fill("not-an-email");
    await page
      .getByLabel("Describe your interests")
      .fill("Tech startup events and panels");
    await page.getByRole("button", { name: /Start Auto-RSVPing/ }).click();
    await expect(
      page.getByText("Enter a valid email address.")
    ).toBeVisible();
  });

  test("shows error when interests are too short", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("First name").fill("Jane");
    await page.getByLabel("Last name").fill("Smith");
    await page.getByLabel("Email").fill("jane@example.test");
    await page.getByLabel("Describe your interests").fill("tech");
    await page.getByRole("button", { name: /Start Auto-RSVPing/ }).click();
    await expect(page.getByText(/at least 10 characters/)).toBeVisible();
  });

  test("shows duplicate email warning for existing user", async ({
    page,
    request,
  }) => {
    const res = await request.post(`${API_BASE}/api/v1/users`, {
      data: {
        email: `dup-${Date.now()}@test.invalid`,
        first_name: "Test",
        last_name: "User",
        interests_description:
          "Tech startup networking events and AI panels here",
      },
    });
    const user = await res.json();

    await page.goto("/signup");
    await page.getByLabel("First name").fill("Jane");
    await page.getByLabel("Last name").fill("Smith");
    await page.getByLabel("Email").fill(user.email);
    await page
      .getByLabel("Describe your interests")
      .fill("Tech startup networking events and AI panels here");
    await page.getByRole("button", { name: /Start Auto-RSVPing/ }).click();
    await expect(page.getByText(/You're already signed up/)).toBeVisible({
      timeout: 10000,
    });

    await deleteTestUser(request, user.id);
  });

  test("successful signup redirects to dashboard and saves user_id", async ({
    page,
    request,
  }) => {
    const email = `signup-${Date.now()}@test.invalid`;
    await page.goto("/signup");
    await page.getByLabel("First name").fill("Playwright");
    await page.getByLabel("Last name").fill("Tester");
    await page.getByLabel("Email").fill(email);
    await page
      .getByLabel("Describe your interests")
      .fill("Tech startup networking events, AI panels, happy hours with founders");
    await page.getByRole("button", { name: /Start Auto-RSVPing/ }).click();

    await page.waitForURL("/dashboard", { timeout: 15000 });
    const userId = await page.evaluate(() => localStorage.getItem("user_id"));
    expect(userId).toBeTruthy();

    if (userId) await deleteTestUser(request, userId);
  });
});
