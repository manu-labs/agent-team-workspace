import { test, expect } from "@playwright/test";

test.describe("Home page", () => {
  test("renders hero heading and description", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Auto-RSVP" })
    ).toBeVisible();
    await expect(page.getByText("Tell us what you're into")).toBeVisible();
  });

  test("Get Started CTA links to /signup", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: "Get Started" })
    ).toHaveAttribute("href", "/signup");
  });

  test("Browse Events CTA links to /events", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: "Browse Events" })
    ).toHaveAttribute("href", "/events");
  });

  test("nav has expected links", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("nav");
    await expect(nav.getByRole("link", { name: "Events" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Settings" })).toBeVisible();
  });

  test("shows three-step explanation", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("1. Describe your vibe")).toBeVisible();
    await expect(page.getByText("2. We match & RSVP")).toBeVisible();
    await expect(page.getByText("3. Just show up")).toBeVisible();
  });
});
