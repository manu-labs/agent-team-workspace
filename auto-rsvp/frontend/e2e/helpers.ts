import { APIRequestContext, Page } from "@playwright/test";

const API_BASE =
  process.env.API_URL || "https://auto-rsvp-production.up.railway.app";

export interface TestUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

export async function createTestUser(
  request: APIRequestContext
): Promise<TestUser> {
  const email = `playwright-${Date.now()}@test.invalid`;
  const res = await request.post(`${API_BASE}/api/v1/users`, {
    data: {
      email,
      first_name: "Playwright",
      last_name: "Test",
      interests_description:
        "Tech startups, AI panels, music showcases, happy hours with founders",
    },
  });
  if (\!res.ok()) {
    throw new Error(
      `createTestUser failed: ${res.status()} ${await res.text()}`
    );
  }
  return res.json() as Promise<TestUser>;
}

export async function deleteTestUser(
  request: APIRequestContext,
  userId: string
): Promise<void> {
  await request.delete(`${API_BASE}/api/v1/users/${userId}`);
}

export async function setUserInLocalStorage(
  page: Page,
  userId: string
): Promise<void> {
  await page.evaluate((id) => localStorage.setItem("user_id", id), userId);
}

export async function clearUser(page: Page): Promise<void> {
  await page.evaluate(() => localStorage.removeItem("user_id"));
}
