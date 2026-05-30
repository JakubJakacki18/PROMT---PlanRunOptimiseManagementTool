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

test(
  "storageState — nieuwierzytelniony request do /api/users/ (nowy kontekst bez sesji) zwraca 401 lub 403",
  async ({ playwright }) => {
    // Tworzymy nowy kontekst REQUEST bez żadnego storageState — symulacja anonimowego klienta
    const anonRequest = await playwright.request.newContext({
      baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173",
    });

    try {
      const response = await anonRequest.get("/api/users/");

      expect(
        [401, 403],
        `Anonimowy GET /api/users/ powinien być odrzucony (401 lub 403). Otrzymano: ${response.status()}`,
      ).toContain(response.status());
    } finally {
      await anonRequest.dispose();
    }
  },
);

test(
  "storageState — sesja admina pozwala odpytać /api/users/ i /api/auth/me/ bez ponownego logowania przez UI",
  async ({ page }) => {
    // Test weryfikuje, że storageState (zapisany przez auth.setup.ts) jest w pełni funkcjonalny
    // dla obu kluczowych endpointów panelu użytkowników
    const usersResp = await page.request.get("/api/users/");
    expect(
      usersResp.status(),
      "Zalogowany admin powinien mieć dostęp do /api/users/ bez ponownego logowania",
    ).toBe(200);

    const users = await usersResp.json();
    expect(
      Array.isArray(users),
      "Odpowiedź /api/users/ powinna być tablicą (bez paginacji)",
    ).toBe(true);

    const meResp = await page.request.get("/api/auth/me/");
    expect(
      meResp.status(),
      "Zalogowany admin powinien mieć dostęp do /api/auth/me/ bez ponownego logowania",
    ).toBe(200);

    const me = await meResp.json();
    expect(me).toHaveProperty("username");
    expect(me.is_staff).toBe(true);

    // Sprawdzamy spójność — admin widzi siebie na liście użytkowników
    const adminOnList = users.find((u: { id: number }) => u.id === me.id);
    expect(
      adminOnList,
      `Admin (id=${me.id}, username=${me.username}) powinien być widoczny na liście /api/users/`,
    ).toBeDefined();
  },
);
