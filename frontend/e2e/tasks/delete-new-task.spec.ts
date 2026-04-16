import { test, expect } from "@playwright/test";
import { createTask } from "../helpers/tasks";

test("Zalogowany user usuwa zadanie po czym zostaje poprawnie usunięte", async ({
  page,
}) => {
  const taskName = await createTask(page);
  await page.goto("/dashboard/tasks");
  await expect(page.getByText(taskName)).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  const row = page.locator(".task-card", { hasText: taskName });
  await row.getByRole("button", { name: "Usuń" }).click();
  await expect(page.getByText(taskName)).not.toBeVisible();
});
