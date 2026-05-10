import { test, expect } from "@playwright/test";
import {Task, TaskPriority} from "../../../src/features/tasks/types";

const pagedResponse = (results: object[]) => ({
  count: results.length,
  next: null,
  previous: null,
  results,
});

const mockedTask = (id: number, title: string): Task => ({
  id,
  title,
  description: "",
  status: "doing",
  priority: 2,
  owner: null,
  start_date: null,
  due_date: null,
  cost_currency: "PLN",
  receipt_url: "",
  receipt_note: "",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  scope_project: null,
  scope_funding: null,
  scope_project_funding: null,
});

const API_URL = "/api/tasks/**";

test.describe("Mockowanie obiektów Task", () => {
  test("powinno wyrenderować task z mocka (GET)", async ({page}) => {
    // Mock GET /tasks
    await page.route(API_URL, (route) =>
     route.fulfill({
      json: pagedResponse([mockedTask(1, "nietypowezadanie")]),
    }),
        );
    await page.goto("/dashboard/tasks");

    await expect(page.getByText("nietypowezadanie")).toBeVisible();

  });

  test("mockowane zadania — błąd 500 z API nie crashuje aplikacji", async ({
  page,
}) => {
  await page.route(API_URL, (route) =>
    route.fulfill({ status: 500, body: "Internal Server Error" }),
  );

  await page.goto("/dashboard/tasks");
  await page.waitForLoadState("networkidle");
  const error = page.locator(".error");
await expect(error).toBeVisible();
  await expect(page.getByText("Nie udało się wczytać zadań.")).toBeVisible();
});
});