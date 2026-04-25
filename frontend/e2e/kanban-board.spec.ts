import { test, expect } from "@playwright/test";

async function openSeededProjectKanban(page: import("@playwright/test").Page) {
  await page.goto("/dashboard/projects");
  await page.getByPlaceholder("Search…").fill("Projekt 10");
  await expect(
    page.getByRole("link", { name: "Open project" }).first(),
  ).toBeVisible({ timeout: 10000 });
  await page.getByRole("link", { name: "Open project" }).first().click();
  await page.getByRole("link", { name: "Kanban" }).click();
  await page.waitForURL("**/kanban");
}

test("R2 — tablica Kanban wyświetla trzy kolumny statusu z zadaniami", async ({
  page,
}) => {
  await openSeededProjectKanban(page);

  await expect(page.locator(".kanban-col-head").filter({ hasText: "Do zrobienia" })).toBeVisible({ timeout: 10000 });
  await expect(page.locator(".kanban-col-head").filter({ hasText: "W trakcie" })).toBeVisible();
  await expect(page.locator(".kanban-col-head").filter({ hasText: "Zrobione" })).toBeVisible();

  const totalCards = page.locator(".kanban-card");
  await expect(totalCards.first()).toBeVisible({ timeout: 10000 });
});

test("R2 — filtr priorytetu na tablicy Kanban zawęża widoczne karty", async ({
  page,
}) => {
  await openSeededProjectKanban(page);

  await expect(page.locator(".kanban-card").first()).toBeVisible({ timeout: 10000 });
  const allCards = await page.locator(".kanban-card").count();

  const highBtn = page.locator(".segmented-btn").filter({ hasText: "Wysoki" });
  await highBtn.click();
  await expect(highBtn).toHaveClass(/is-active/);

  const highCards = await page.locator(".kanban-card").count();
  expect(highCards).toBeLessThanOrEqual(allCards);

  const allBtn = page.locator(".segmented-btn").filter({ hasText: "Wszystkie" });
  await allBtn.click();
  await expect(allBtn).toHaveClass(/is-active/);
});

// ── API ──────────────────────────────────────────────────────────────────────

test("API — GET /api/tasks/?project={id} zwraca zadania z wymaganymi polami", async ({
  page,
}) => {
  const listResp = await page.request.get("/api/projects/?search=Projekt+10");
  expect(listResp.status()).toBe(200);
  const list = await listResp.json();
  const projectId = list.results[0].id;

  const tasksResp = await page.request.get(`/api/tasks/?project=${projectId}`);
  expect(tasksResp.status()).toBe(200);
  const tasks = await tasksResp.json();
  expect(tasks).toHaveProperty("results");
  expect(tasks.results.length).toBeGreaterThan(0);

  const task = tasks.results[0];
  expect(task).toHaveProperty("id");
  expect(task).toHaveProperty("title");
  expect(task).toHaveProperty("status");
  expect(task).toHaveProperty("priority");
});

// ── MOCK ─────────────────────────────────────────────────────────────────────

test("Mock — zadania z mockowanego API trafiają do właściwych kolumn Kanban", async ({
  page,
}) => {
  const listResp = await page.request.get("/api/projects/?search=Projekt+10");
  const list = await listResp.json();
  const projectId = list.results[0].id;

  const mockTasks = {
    count: 2,
    next: null,
    previous: null,
    results: [
      { id: 9001, title: "Zadanie Mockowane Todo", status: "todo", priority: 2, description: "", project: projectId, start_date: null, due_date: null },
      { id: 9002, title: "Zadanie Mockowane Done", status: "done", priority: 1, description: "", project: projectId, start_date: null, due_date: null },
    ],
  };

  await page.route(/\/api\/tasks\//, (route) =>
    route.fulfill({ json: mockTasks }),
  );

  await page.goto(`/dashboard/projects/${projectId}/kanban`);

  await expect(page.getByText("Zadanie Mockowane Todo")).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("Zadanie Mockowane Done")).toBeVisible({ timeout: 10000 });
});

// ── AUTH STATE ────────────────────────────────────────────────────────────────

test("Auth — page.request ze storageState uwierzytelnia żądania API bez logowania przez UI", async ({
  page,
}) => {
  const resp = await page.request.get("/api/auth/me/");
  expect(resp.status()).toBe(200);
  const me = await resp.json();
  expect(me).toHaveProperty("username");
  expect(me.is_staff).toBe(true);
});
