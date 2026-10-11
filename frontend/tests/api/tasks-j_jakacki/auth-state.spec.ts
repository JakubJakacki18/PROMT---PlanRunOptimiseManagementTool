import { test, expect } from "@playwright/test";

test(
  "storageState — sesja admina daje dostęp do /dashboard/tasks bez ponownego logowania",
  async ({ page }) => {
    await page.goto("/dashboard/tasks");
    await page.waitForLoadState("networkidle");

    expect(page.url()).not.toContain("/login");
    expect(page.url()).toContain("/dashboard");

    const me = await (await page.request.get("/api/auth/me/")).json();
    expect(me).toHaveProperty("username");
    expect(me.is_staff).toBe(true);

    const state = await page.request.storageState();
    const csrf = state.cookies.find((c) => c.name === "csrftoken");
    const session = state.cookies.find((c) => c.name === "sessionid");
    expect(csrf).toBeDefined();
    expect(session).toBeDefined();
    expect(csrf!.value.length).toBeGreaterThanOrEqual(32);
  },
);

test(
  "storageState — sesja admina pozwala odpytać /api/tasks/ przez request fixture bez przechodzenia przez UI",
  async ({ request }) => {
    const response = await request.get("/api/tasks/");

    expect(
      response.status(),
      `GET /api/tasks/ powinien zwrócić 200 OK dla zalogowanego admina. Otrzymano: ${response.status()}`,
    ).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty("results");
    expect(Array.isArray(body.results)).toBe(true);
  },
);

test(
  "storageState — nieuwierzytelniony request do /api/tasks/ zwraca 401 lub 403",
  async ({ playwright }) => {
    const anonRequest = await playwright.request.newContext({
      baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173",
    });

    try {
      const response = await anonRequest.get("/api/tasks/");
      expect([401, 403]).toContain(response.status());
    } finally {
      await anonRequest.dispose();
    }
  },
);
