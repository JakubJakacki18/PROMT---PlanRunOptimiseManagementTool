import { test, expect } from "@playwright/test";

const pagedResponse = (results: object[]) => ({
  count: results.length,
  next: null,
  previous: null,
  results,
});

const makeProject = (id: number, name: string) => ({
  id,
  name,
  description: "",
  status: "active",
  owner: null,
  start_date: null,
  end_date: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
});

test("mockowane projekty — dwa projekty z mocka renderują się jako dwa linki Open project", async ({
  page,
}) => {
  await page.route("/api/projects/**", (route) =>
    route.fulfill({ json: pagedResponse([makeProject(1, "Alpha"), makeProject(2, "Beta")]) })
  );

  await page.goto("/dashboard/projects");
  const links = page.getByRole("link", { name: "Open project" });
  await expect(links.first()).toBeVisible({ timeout: 10_000 });
  await expect(links).toHaveCount(2);
});

test("mockowane projekty — pusta lista nie renderuje żadnego linku Open project", async ({
  page,
}) => {
  await page.route("/api/projects/**", (route) =>
    route.fulfill({ json: pagedResponse([]) })
  );

  await page.goto("/dashboard/projects");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("link", { name: "Open project" })).toHaveCount(0);
});

test("mockowane projekty — błąd 500 z API nie crashuje aplikacji", async ({ page }) => {
  await page.route("/api/projects/**", (route) =>
    route.fulfill({ status: 500, body: "Internal Server Error" })
  );

  await page.goto("/dashboard/projects");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("link", { name: "Open project" })).toHaveCount(0);
});
