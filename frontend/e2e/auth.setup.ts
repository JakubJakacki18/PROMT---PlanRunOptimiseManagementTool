import { test as setup, expect } from "@playwright/test";
import path from "path";

/**
 * Plik konfiguracji auth wg https://playwright.dev/docs/auth
 *
 * Loguje admina przez formularz UI i zapisuje storageState
 * (ciasteczka + localStorage) do pliku JSON.
 * Dzięki temu wszystkie testy startują już zalogowane —
 * nie trzeba wywoływać loginAsAdmin() w każdym teście.
 */

const authFile = path.join(__dirname, "../playwright/.auth/admin.json");

setup("authenticate as admin", async ({ page }) => {
  // ─── Krok 1: Przejdź do strony logowania ───
  await page.goto("/login");
  await page.waitForSelector("#username", { timeout: 15_000 });

  // ─── Krok 2: Wypełnij formularz logowania ───
  await page.fill("#username", "admin");
  await page.fill("#password", "admin123");
  await page.click('button[type="submit"]');

  // ─── Krok 3: Czekaj na przekierowanie po zalogowaniu ───
  await page.waitForURL("**/dashboard/**", { timeout: 10_000 });

  // ─── Krok 4: Upewnij się, że jesteśmy zalogowani ───
  // Sprawdzamy, że strona się załadowała i sesja jest aktywna
  await expect(page).toHaveURL(/\/dashboard/);

  // ─── Krok 5: Zapisz stan uwierzytelnienia ───
  await page.context().storageState({ path: authFile });
});
