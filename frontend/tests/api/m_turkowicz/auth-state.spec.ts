import { test, expect } from "@playwright/test";

test("storageState — sesja admina daje dostęp do /dashboard/admin bez logowania", async ({ page }) => {
  await page.goto("/dashboard/admin");
  await page.waitForSelector("#admin-panel-title", { timeout: 15_000 });

  expect(page.url()).not.toContain("/login");
  await expect(page.locator("#admin-panel-title")).toContainText("Panel Administracyjny");
  await expect(page.locator("#users-table")).toBeVisible();
  await expect(page.locator("#create-user-btn")).toBeVisible();

  const me = await (await page.request.get("/api/auth/me/")).json();
  expect(me).toHaveProperty("username");
  expect(me.is_staff).toBe(true);

  const state = await page.request.storageState();
  const csrf = state.cookies.find((c) => c.name === "csrftoken");
  const session = state.cookies.find((c) => c.name === "sessionid");
  expect(csrf).toBeDefined();
  expect(session).toBeDefined();
  expect(csrf!.value.length).toBeGreaterThanOrEqual(32);
});
