import { test, expect } from "@playwright/test";

test("logowanie i usunięcie finansowania", async ({ page }) => {
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

  // ── 3. Dodaj finansowanie (setup pod test usuwania) 
  const fundingName = `Test Funding ${Date.now()}`;

  await page.getByRole("button", { name: "Dodaj finansowanie" }).click();

  await page.getByLabel("Nazwa").fill(fundingName);
  await page.locator('input[name="program"]').fill("NCBIR");
  await page.locator('input[name="funder"]').fill("UE");
  await page.locator('select[name="type"]').selectOption("grant");

  await page.getByRole("button", { name: "Budżet" }).click();
  await page.locator('input[name="amount_total"]').fill("1000");
  await page.locator('input[name="currency"]').fill("PLN");

  await page.getByRole("button", { name: "Daty" }).click();
  await page.locator('input[name="start_date"]').fill("2026-03-30");
  await page.locator('input[name="end_date"]').fill("2026-04-30");

  await page.getByRole("button", { name: "Dodaj" }).click();

  await expect(page.getByText(fundingName)).toBeVisible();

  // ── 4. Obsługa dialogu confirm 
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("Czy na pewno"); // opcjonalne
    await dialog.accept(); // klikamy "OK"
  });

  // ── 5. Kliknij usuń dla konkretnego elementu 
  const row = page.locator("tr", { hasText: fundingName });
  await row.getByRole("button", { name: "Usuń" }).click();

  // ── 6. Walidacja usunięcia 
  await expect(page.getByText(fundingName)).not.toBeVisible();
});