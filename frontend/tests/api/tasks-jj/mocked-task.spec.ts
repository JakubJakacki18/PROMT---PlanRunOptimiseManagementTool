import { test, expect } from "@playwright/test";
import {Task, TaskPriority} from "../../../src/features/tasks/types";
import { TaskStatus } from "../../../src/features/tasks/types";

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
  test.beforeEach(async ({ page }) => {
    // Mock GET /tasks
    await page.route("/api/tasks", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([ mockedTask(1,"zadanie"),
        ]),
      });
    });

    // Mock POST /tasks
    await page.route("**/api/tasks", async (route) => {
      if (route.request().method() === "POST") {
        const requestBody = await route.request().postDataJSON();

        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: 99,
            title: requestBody.title,
            done: false
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("http://localhost:3000/tasks");
  });

});
