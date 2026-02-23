import { test, expect } from "@playwright/test";
import {
  createTestUser,
  deleteTestUser,
  setUserInLocalStorage,
} from "./helpers";

const API_BASE =
  process.env.API_URL || "https://auto-rsvp-production.up.railway.app";

const LOAD_TIMEOUT = 15000;

async function waitForSettingsLoaded(page: import("@playwright/test").Page) {
  await page.waitForFunction(
    () => document.querySelectorAll(".animate-pulse").length === 0,
    { timeout: LOAD_TIMEOUT }
  );
}

test.describe("Settings page", () => {
  test("redirects to /signup when no user in localStorage", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("user_id"));
    await page.goto("/settings");
    await page.waitForURL("/signup", { timeout: 10000 });
  });

  test("renders settings form populated with user data", async ({
    page,
    request,
  }) => {
    const user = await createTestUser(request);
    try {
      await page.goto("/");
      await setUserInLocalStorage(page, user.id);
      await page.goto("/settings");
      await waitForSettingsLoaded(page);

      await expect(
        page.getByRole("heading", { name: "Settings" })
      ).toBeVisible();
      await expect(page.getByLabel("First name")).toHaveValue(user.first_name);
      await expect(page.getByLabel("Last name")).toHaveValue(user.last_name);
      await expect(page.getByText(user.email)).toBeVisible();
    } finally {
      await deleteTestUser(request, user.id);
    }
  });

  test("can update profile and see success message", async ({
    page,
    request,
  }) => {
    const user = await createTestUser(request);
    try {
      await page.goto("/");
      await setUserInLocalStorage(page, user.id);
      await page.goto("/settings");
      await waitForSettingsLoaded(page);

      await page.getByLabel("First name").fill("UpdatedFirst");
      await page.getByRole("button", { name: /Save Changes/ }).click();
      await expect(page.getByText("Profile saved\!")).toBeVisible({
        timeout: 10000,
      });
    } finally {
      await deleteTestUser(request, user.id);
    }
  });

  test("char count shows /500 not /10 min for interests field", async ({
    page,
    request,
  }) => {
    const user = await createTestUser(request);
    try {
      await page.goto("/");
      await setUserInLocalStorage(page, user.id);
      await page.goto("/settings");
      await waitForSettingsLoaded(page);

      // Should show "/ 500" (fixed), not "/ 10 min"
      await expect(page.getByText(/\/ 500/)).toBeVisible();
      await expect(page.getByText(/\/ 10 min/)).not.toBeVisible();
    } finally {
      await deleteTestUser(request, user.id);
    }
  });

  test("shows danger zone with delete account option", async ({
    page,
    request,
  }) => {
    const user = await createTestUser(request);
    try {
      await page.goto("/");
      await setUserInLocalStorage(page, user.id);
      await page.goto("/settings");
      await waitForSettingsLoaded(page);

      await expect(page.getByText("Danger Zone")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Delete Account" })
      ).toBeVisible();
    } finally {
      await deleteTestUser(request, user.id);
    }
  });

  test("delete account flow clears localStorage and redirects home", async ({
    page,
    request,
  }) => {
    const res = await request.post(`${API_BASE}/api/v1/users`, {
      data: {
        email: `delete-test-${Date.now()}@test.invalid`,
        first_name: "Delete",
        last_name: "Me",
        interests_description:
          "Tech startup networking events and AI panels here",
      },
    });
    const user = await res.json();

    await page.goto("/");
    await setUserInLocalStorage(page, user.id);
    await page.goto("/settings");
    await waitForSettingsLoaded(page);

    await page.getByRole("button", { name: "Delete Account" }).click();
    await expect(page.getByText("Are you sure?")).toBeVisible();
    await page
      .getByRole("button", { name: /Yes, delete my account/ })
      .click();

    await page.waitForURL("/", { timeout: 10000 });
    const storedId = await page.evaluate(() =>
      localStorage.getItem("user_id")
    );
    expect(storedId).toBeNull();
  });
});
