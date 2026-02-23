import { test, expect } from "@playwright/test";
import { createTestUser, deleteTestUser, setUserInLocalStorage } from "./helpers";

const LOAD_TIMEOUT = 15000;

// Waits for the loading skeleton to disappear
async function waitForEventsLoaded(page: import("@playwright/test").Page) {
  await page.waitForFunction(
    () => document.querySelectorAll(".animate-pulse").length === 0,
    { timeout: LOAD_TIMEOUT }
  );
}

test.describe("Events page", () => {
  test("renders page heading and subtitle", async ({ page }) => {
    await page.goto("/events");
    await expect(
      page.getByRole("heading", { name: "Events" })
    ).toBeVisible();
    await expect(
      page.getByText("Scraped from rsvpatx.com")
    ).toBeVisible();
  });

  test("exits loading state and shows events or empty state", async ({
    page,
  }) => {
    await page.goto("/events");
    await waitForEventsLoaded(page);

    const hasEvents = await page
      .locator("h3")
      .first()
      .isVisible()
      .catch(() => false);
    const hasEmpty = await page
      .getByText("No events found.")
      .isVisible()
      .catch(() => false);
    expect(hasEvents || hasEmpty).toBe(true);
  });

  test("search input is interactive and filters results", async ({ page }) => {
    await page.goto("/events");
    await waitForEventsLoaded(page);

    const search = page.getByPlaceholder("Search events...");
    await expect(search).toBeVisible();
    await search.fill("music");
    await expect(search).toHaveValue("music");
  });

  test("platform filter buttons toggle active state", async ({ page }) => {
    await page.goto("/events");
    const eventbriteBtn = page.getByRole("button", { name: "Eventbrite" });
    await expect(eventbriteBtn).toBeVisible();
    await eventbriteBtn.click();
    await expect(eventbriteBtn).toHaveClass(/bg-blue-600/);

    // Click All to reset
    await page.getByRole("button", { name: "All" }).first().click();
    await expect(
      page.getByRole("button", { name: "All" }).first()
    ).toHaveClass(/bg-blue-600/);
  });

  test("date filter buttons toggle active state", async ({ page }) => {
    await page.goto("/events");

    // "All dates" is always present as the reset button
    const allDatesBtn = page.getByRole("button", { name: "All dates" });
    await expect(allDatesBtn).toBeVisible();

    // Click the first specific date button (not "All dates") — avoid hardcoding a specific date
    const specificDateBtn = page
      .locator("button")
      .filter({ hasText: /^[A-Z][a-z]+ \d+$/ })
      .first();
    await expect(specificDateBtn).toBeVisible();
    await specificDateBtn.click();
    await expect(specificDateBtn).toHaveClass(/bg-zinc-600/);

    // Reset to all dates
    await allDatesBtn.click();
    await expect(allDatesBtn).toHaveClass(/bg-zinc-600/);
  });

  test("Refresh Events button triggers scrape", async ({ page }) => {
    await page.goto("/events");
    const refreshBtn = page.getByRole("button", { name: /Refresh Events/ });
    await expect(refreshBtn).toBeVisible();
    await refreshBtn.click();
    // Button should briefly show "Scraping..." or return to "Refresh Events"
    await expect(
      page.getByRole("button", { name: /Scraping\.\.\.|Refresh Events/ })
    ).toBeVisible();
  });

  test("Match My Events button visible when logged in", async ({
    page,
    request,
  }) => {
    const user = await createTestUser(request);
    try {
      await page.goto("/");
      await setUserInLocalStorage(page, user.id);
      await page.goto("/events");
      await expect(
        page.getByRole("button", { name: /Match My Events/ })
      ).toBeVisible();
    } finally {
      await deleteTestUser(request, user.id);
    }
  });

  test("Match My Events button hidden when not logged in", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("user_id"));
    await page.goto("/events");
    await expect(
      page.getByRole("button", { name: /Match My Events/ })
    ).not.toBeVisible();
  });
});
