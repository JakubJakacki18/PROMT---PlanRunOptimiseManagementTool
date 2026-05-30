import { test, expect } from "@playwright/test";

test("storageState — sesja admina daje dostęp do /dashboard/fundings bez logowania", async ({ page }) => {
  await page.goto("/dashboard/fundings");
  await page.waitForLoadState("networkidle");

  expect(page.url()).not.toContain("/login");
  expect(page.url()).toContain("/dashboard");

  await expect(
    page.getByRole("button", { name: "Dodaj finansowanie" }),
  ).toBeVisible({ timeout: 10_000 });

  const me = await (await page.request.get("/api/auth/me/")).json();
  expect(me).toHaveProperty("username");
  expect(me.is_staff).toBe(true);

  const state = await page.request.storageState();
  const csrf = state.cookies.find((c) => c.name === "csrftoken");
  expect(csrf).toBeDefined();
  expect(csrf!.value.length).toBeGreaterThan(32);
});
