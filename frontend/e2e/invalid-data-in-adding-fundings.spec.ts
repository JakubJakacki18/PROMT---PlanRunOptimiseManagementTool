import { test, expect } from "@playwright/test";

test("logowanie i walidacja błędów przy dodawaniu finansowania", async ({
  page,
}) => {
  // ── 1. Logowanie 
  await page.goto("/login");
  await page.fill('input[name="username"]', "admin");
  await page.fill('input[name="password"]', "admin123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard**");

  // ── 2. Zakładka Finansowania 
  await page.goto("/dashboard/fundings");
  await expect(
    page.getByRole("button", { name: "Dodaj finansowanie" })
  ).toBeVisible();

  // ── 3. Otwórz modal 
  await page.getByRole("button", { name: "Dodaj finansowanie" }).click();
  await expect(
    page.getByRole("heading", { name: "Dodaj finansowanie" })
  ).toBeVisible();

  // ── 4. Błędne dane – sekcja Ogólne 
  await page.getByLabel("Nazwa").fill("a"); 

  await page.locator('input[name="program"]').fill("sda");
  await page.locator('input[name="funder"]').fill("ds");

  // ── 5. Błędne dane – Budżet 
  await page.getByRole("button", { name: "Budżet" }).click();

  await page.locator('input[name="amount_total"]').fill("-1"); 
  await page.locator('input[name="currency"]').fill("a"); 

  // ── 6. Błędne dane – Daty 
  await page.getByRole("button", { name: "Daty" }).click();

  await page.locator('input[name="start_date"]').fill("2026-03-30");
  await page.locator('input[name="end_date"]').fill("2026-03-10"); 
  await page
    .locator('input[name="reporting_deadline"]')
    .fill("1999-02-10");

  // ── 7. Walidacja błędów 

  await expect(
    page.getByText("Nazwa musi mieć min. 2 znaki")
  ).toBeVisible();

  await expect(
    page.getByText("Kwota musi być liczbą")
  ).toBeVisible();

  await expect(
    page.getByText("Waluta musi mieć 3 znaki")
  ).toBeVisible();

  await expect(
    page.getByText("Data końcowa nie może być wcześniejsza niż start")
  ).toBeVisible();

  // ── 8. Przycisk Dodaj jest zablokowany 
  const submitButton = page.getByRole("button", { name: "Dodaj" });
  await expect(submitButton).toBeDisabled();

  // ── 9. Modal nadal otwarty 
  await expect(
  page.getByRole("heading", { name: "Dodaj finansowanie" })
  ).toBeVisible();
});