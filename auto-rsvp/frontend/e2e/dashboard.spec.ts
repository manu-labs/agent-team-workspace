import { test, expect } from "@playwright/test";
import {
  createTestUser,
  deleteTestUser,
  setUserInLocalStorage,
} from "./helpers";

const LOAD_TIMEOUT = 15000;

async function waitForDashboardLoaded(page: import("@playwright/test").Page) {
  await page.waitForFunction(
    () => document.querySelectorAll(".animate-pulse").length === 0,
    { timeout: LOAD_TIMEOUT }
  );
}

test.describe("Dashboard page", () => {
  test("shows sign-up prompt when no user in localStorage", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("user_id"));
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "RSVP Dashboard" })
    ).toBeVisible();
    await expect(
      page.getByText("Sign up first to see your matched events")
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign Up" })).toBeVisible();
  });

  test("loads dashboard for logged-in user", async ({ page, request }) => {
    const user = await createTestUser(request);
    try {
      await page.goto("/");
      await setUserInLocalStorage(page, user.id);
      await page.goto("/dashboard");
      await waitForDashboardLoaded(page);

      await expect(
        page.getByRole("heading", { name: "RSVP Dashboard" })
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /Run Auto-RSVP Now/ })
      ).toBeVisible();
    } finally {
      await deleteTestUser(request, user.id);
    }
  });

  test("shows all four stat cards for logged-in user", async ({
    page,
    request,
  }) => {
    const user = await createTestUser(request);
    try {
      await page.goto("/");
      await setUserInLocalStorage(page, user.id);
      await page.goto("/dashboard");
      await waitForDashboardLoaded(page);

      await expect(page.getByText("Total Matched")).toBeVisible();
      await expect(page.getByText("Successful")).toBeVisible();
      await expect(page.getByText("Pending")).toBeVisible();
      await expect(page.getByText("Failed")).toBeVisible();
    } finally {
      await deleteTestUser(request, user.id);
    }
  });

  test("shows empty state for new user with no RSVPs", async ({
    page,
    request,
  }) => {
    const user = await createTestUser(request);
    try {
      await page.goto("/");
      await setUserInLocalStorage(page, user.id);
      await page.goto("/dashboard");
      await waitForDashboardLoaded(page);

      await expect(
        page.getByText("No matched events yet.")
      ).toBeVisible();
    } finally {
      await deleteTestUser(request, user.id);
    }
  });
});
