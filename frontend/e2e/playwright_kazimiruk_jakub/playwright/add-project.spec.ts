import { test, expect } from "@playwright/test";

const PROJECT_NAME = `E2E Projekt ${Date.now()}`;

test("R1 — tworzenie nowego projektu i weryfikacja na liście", async ({
  page,
}) => {
  await page.goto("/dashboard/projects");
  await expect(page.getByRole("button", { name: "Add project" })).toBeVisible({
    timeout: 10000,
  });

  await page.getByRole("button", { name: "Add project" }).click();
  await expect(page.getByRole("heading", { name: "Dodaj projekt" })).toBeVisible();

  await page.getByPlaceholder("Np. Strona www 2026").fill(PROJECT_NAME);
  await page.locator('textarea').fill("Opis projektu dodanego przez test E2E");

  await page.locator('input[name="start_date"]').fill("2026-05-01");
  await page.locator('input[name="end_date"]').fill("2026-08-31");

  await page.getByRole("button", { name: "Zapisz" }).click();

  await expect(page.getByRole("heading", { name: "Dodaj projekt" })).not.toBeVisible();
  await expect(page.getByRole("heading", { name: PROJECT_NAME })).toBeVisible({
    timeout: 10000,
  });
});

test("R1 — formularz tworzenia projektu odrzuca nazwę krótszą niż 3 znaki", async ({
  page,
}) => {
  await page.goto("/dashboard/projects");
  await expect(page.getByRole("button", { name: "Add project" })).toBeVisible({
    timeout: 10000,
  });

  await page.getByRole("button", { name: "Add project" }).click();
  await expect(page.getByRole("heading", { name: "Dodaj projekt" })).toBeVisible();

  await page.getByPlaceholder("Np. Strona www 2026").fill("AB");

  const submitBtn = page.getByRole("button", { name: "Zapisz" });
  await expect(submitBtn).toBeDisabled();
  await expect(page.getByText("Nazwa musi mieć min. 3 znaki")).toBeVisible();
});

test("Mock — błąd 500 z /api/projects/ wyświetla komunikat błędu zamiast listy", async ({
  page,
}) => {
  await page.route("**/api/projects/**", (route) =>
    route.fulfill({ status: 500, body: "Internal Server Error" }),
  );

  await page.goto("/dashboard/projects");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Failed to load projects.")).toBeVisible();
});

test("Auth — storageState ładuje sesję admina bez przejścia przez formularz logowania", async ({
  page,
}) => {
  await page.goto("/dashboard/projects");
  await expect(page).toHaveURL(/dashboard/);
  await expect(
    page.getByRole("button", { name: /admin/ }),
  ).toBeVisible({ timeout: 10000 });
});
