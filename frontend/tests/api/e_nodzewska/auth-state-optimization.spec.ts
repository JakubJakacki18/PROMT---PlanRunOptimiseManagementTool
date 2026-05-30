import { test, expect } from "@playwright/test";

test("storageState — sesja admina pozwala odpytać /api/auth/me/ i /api/projects/ bez logowania przez UI", async ({
  page,
}) => {
  const meResp = await page.request.get("/api/auth/me/");
  expect(meResp.status()).toBe(200);
  const me = await meResp.json();
  expect(me).toHaveProperty("username");
  expect(me.is_staff).toBe(true);

  const projectsResp = await page.request.get("/api/projects/");
  expect(projectsResp.status()).toBe(200);
  const projects = await projectsResp.json();
  expect(projects).toHaveProperty("results");
});

test("storageState — sesja admina daje dostęp do /dashboard/projects bez ponownego logowania przez formularz", async ({
  page,
}) => {
  await page.goto("/dashboard/projects");
  await page.waitForLoadState("networkidle");

  expect(page.url()).not.toContain("/login");
  expect(page.url()).toContain("/dashboard");

  const state = await page.request.storageState();
  const session = state.cookies.find((c) => c.name === "sessionid");
  expect(session).toBeDefined();
  expect(session!.value.length).toBeGreaterThan(0);
});

test("storageState — nieuwierzytelniony request do /api/projects/ zwraca 401 lub 403", async ({
  playwright,
}) => {
  const anonRequest = await playwright.request.newContext({
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173",
  });

  try {
    const response = await anonRequest.get("/api/projects/");
    expect([401, 403]).toContain(response.status());
  } finally {
    await anonRequest.dispose();
  }
});
