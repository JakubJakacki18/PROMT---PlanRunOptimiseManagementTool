import { test, expect } from "@playwright/test";

const makeProject = (id: number, name: string, overrides: Record<string, unknown> = {}) => ({
  id,
  name,
  description: "",
  status: "active",
  owner: null,
  start_date: null,
  end_date: null,
  tasks: [],
  ...overrides,
});

const pagedResponse = (results: object[]) => ({
  count: results.length,
  next: null,
  previous: null,
  results,
});

const PROJECTS_ROUTE = "/api/projects/**";

test(
  "MOCK — dwa projekty z mocka renderują się jako dwa linki 'Open project' na stronie projektów",
  async ({ page }) => {
    await page.route(PROJECTS_ROUTE, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        json: pagedResponse([
          makeProject(1, "System Zarządzania Projektami"),
          makeProject(2, "Platforma E-learningowa"),
        ]),
      }),
    );

    await page.goto("/dashboard/projects");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByText("System Zarządzania Projektami"),
      "Pierwszy projekt z mocka powinien być widoczny",
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByText("Platforma E-learningowa"),
      "Drugi projekt z mocka powinien być widoczny",
    ).toBeVisible({ timeout: 10_000 });

    const links = page.getByRole("link", { name: "Open project" });
    await expect(links).toHaveCount(2);
  },
);

test(
  "MOCK — pusta lista projektów nie wyświetla żadnych linków 'Open project'",
  async ({ page }) => {
    await page.route(PROJECTS_ROUTE, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        json: pagedResponse([]),
      }),
    );

    await page.goto("/dashboard/projects");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("link", { name: "Open project" }),
    ).toHaveCount(0);
  },
);

test(
  "MOCK — błąd 500 z /api/projects/ nie crashuje aplikacji i strona pozostaje dostępna",
  async ({ page }) => {
    await page.route(PROJECTS_ROUTE, (route) =>
      route.fulfill({ status: 500, body: "Internal Server Error" }),
    );

    const jsErrors: string[] = [];
    page.on("pageerror", (e) => jsErrors.push(e.message));

    await page.goto("/dashboard/projects");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("body")).toBeVisible();

    const criticalErrors = jsErrors.filter((e) => !e.includes("ResizeObserver"));
    expect(
      criticalErrors,
      `Błąd 500 nie powinien powodować nieobsługiwanych wyjątków JS. Znalezione: ${criticalErrors.join(", ")}`,
    ).toHaveLength(0);
  },
);
