import { test, expect } from "@playwright/test";
import { loginAs, loginAsAdmin, goToAdminPanel } from "./helpers/auth";

// ─────────────────────────────────────────────────────────────────
// TEST 1: Logowanie jako admin → widoczny Panel Administracyjny
// ─────────────────────────────────────────────────────────────────
test("TC-01 Admin może zalogować się i wejść do panelu administracyjnego", async ({
  page,
}) => {
  await loginAsAdmin(page);

  // Przechodzimy do panelu admina
  await goToAdminPanel(page);

  // Sprawdzamy, że nagłówek panelu jest widoczny
  await expect(page.locator("#admin-panel-title")).toBeVisible();
  await expect(page.locator("#admin-panel-title")).toContainText(
    "Panel Administracyjny"
  );

  // Tabela użytkowników powinna być widoczna
  await expect(page.locator("#users-table")).toBeVisible();

  // Przycisk "Dodaj użytkownika" powinien być aktywny
  await expect(page.locator("#create-user-btn")).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────
// TEST 2: Tworzenie nowego użytkownika z rolą "member"
//         i weryfikacja, że pojawia się w tabeli z poprawną rolą
// ─────────────────────────────────────────────────────────────────
test("TC-02 Admin tworzy nowego użytkownika z rolą Członek zespołu", async ({
  page,
}) => {
  await loginAsAdmin(page);
  await goToAdminPanel(page);

  // Generujemy unikalny login żeby test był idempotentny
  const uniqueUser = `testmember_${Date.now()}`;

  // Klikamy "Dodaj użytkownika"
  await page.click("#create-user-btn");

  // Modal powinien się pojawić
  await expect(page.locator('[role="dialog"]')).toBeVisible();
  await expect(page.locator("#modal-title")).toContainText("Nowy użytkownik");

  // Wypełniamy formularz
  await page.fill("#field-username", uniqueUser);
  await page.fill("#field-email", `${uniqueUser}@example.com`);
  await page.fill("#field-first-name", "Jan");
  await page.fill("#field-last-name", "Testowy");
  await page.fill("#field-password", "haslo123");

  // Rola — wybieramy "Członek zespołu" (wartość "member")
  await page.selectOption("#field-role", "member");

  // Numer telefonu (opcjonalny)
  await page.fill("#field-phone", "+48123456789");

  // Zapisujemy
  await page.click("#submit-user-btn");

  // Modal powinien się zamknąć po sukcesie
  await expect(page.locator('[role="dialog"]')).not.toBeVisible({
    timeout: 8_000,
  });

  // Nowy user powinien być widoczny w tabeli
  const row = page.locator(`[data-user-id]`).filter({ hasText: uniqueUser });
  await expect(row).toBeVisible({ timeout: 5_000 });

  // Badge roli powinien pokazywać "Członek zespołu"
  await expect(row.locator(".ap__role-badge")).toContainText("Członek zespołu");
});

// ─────────────────────────────────────────────────────────────────
// TEST 3: Edycja użytkownika — zmiana roli z "member" na "pm"
//         (test kluczowy dla modelu UserProfile!!)
// ─────────────────────────────────────────────────────────────────
test("TC-03 Admin może zmienić rolę użytkownika z Member na PM", async ({
  page,
}) => {
  await loginAsAdmin(page);
  await goToAdminPanel(page);

  // Szukamy użytkownika z rolą "Członek zespołu"
  // Filtrujemy po roli żeby znaleźć kandydata do edycji
  await page.selectOption("#role-filter-select", "member");

  // Bierzemy pierwszego użytkownika z wyfiltrowanej listy
  const firstRow = page.locator("tbody tr.ap__row").first();
  await expect(firstRow).toBeVisible({ timeout: 5_000 });

  // Pobieramy data-user-id z wiersza żeby używać data-testid
  const userId = await firstRow.getAttribute("data-user-id");
  expect(userId).not.toBeNull();

  // Klikamy przycisk edycji
  await page.click(`[data-testid="edit-user-${userId}"]`);

  // Modal edycji powinien się otworzyć
  await expect(page.locator('[role="dialog"]')).toBeVisible();
  await expect(page.locator("#modal-title")).toContainText("Edytuj:");

  // Zmieniamy rolę na PM
  await page.selectOption("#field-role", "pm");

  // Zapisujemy
  await page.click("#submit-user-btn");

  // Modal zamknięty
  await expect(page.locator('[role="dialog"]')).not.toBeVisible({
    timeout: 8_000,
  });

  // Resetujemy filtr i szukamy tego użytkownika
  await page.selectOption("#role-filter-select", "all");

  // Badge roli dla tego użytkownika powinien pokazywać "Project Manager"
  const editedRow = page.locator(`[data-user-id="${userId}"]`);
  await expect(editedRow.locator(".ap__role-badge")).toContainText(
    "Project Manager",
    { timeout: 5_000 }
  );
});

// ─────────────────────────────────────────────────────────────────
// TEST 4: Filtrowanie użytkowników po roli
//         (weryfikuje, że UserProfile.role jest poprawnie wyświetlana)
// ─────────────────────────────────────────────────────────────────
test("TC-04 Filtrowanie tabeli po roli pokazuje tylko wybranych użytkowników", async ({
  page,
}) => {
  await loginAsAdmin(page);
  await goToAdminPanel(page);

  // Czekamy aż tabela się załaduje
  await page.waitForSelector("tbody tr.ap__row", { timeout: 8_000 });

  // Filtrujemy po roli "Admin"
  await page.selectOption("#role-filter-select", "admin");

  // Po filtrowaniu każdy wiersz powinien mieć badge "Administrator"
  const rows = page.locator("tbody tr.ap__row");
  const count = await rows.count();

  if (count > 0) {
    // Sprawdzamy, że żaden wiersz nie ma innej roli
    for (let i = 0; i < count; i++) {
      const badge = rows.nth(i).locator(".ap__role-badge");
      await expect(badge).toContainText("Administrator");
    }
  }

  // Filtrujemy po roli "Viewer"
  await page.selectOption("#role-filter-select", "viewer");

  const viewerRows = page.locator("tbody tr.ap__row");
  const viewerCount = await viewerRows.count();

  if (viewerCount > 0) {
    for (let i = 0; i < viewerCount; i++) {
      const badge = viewerRows.nth(i).locator(".ap__role-badge");
      await expect(badge).toContainText("Viewer");
    }
  }

  // Resetujemy — "Wszystkie role" — musi być więcej wierszy
  await page.selectOption("#role-filter-select", "all");
  const allRows = page.locator("tbody tr.ap__row");
  const allCount = await allRows.count();
  expect(allCount).toBeGreaterThanOrEqual(1);
});

// ─────────────────────────────────────────────────────────────────
// TEST 5: Walidacja formularza — próba stworzenia usera bez loginu
//         (login jest polem wymaganym w modelu Django i w formularzu)
// ─────────────────────────────────────────────────────────────────
test("TC-05 Formularz blokuje wysłanie gdy brak wymaganych pól (login, hasło)", async ({
  page,
}) => {
  await loginAsAdmin(page);
  await goToAdminPanel(page);

  await page.click("#create-user-btn");
  await expect(page.locator('[role="dialog"]')).toBeVisible();

  // Próbujemy zatwierdzić bez wpisania czegokolwiek
  await page.click("#submit-user-btn");

  // Modal NIE powinien się zamknąć — HTML5 validation blokuje submit
  await expect(page.locator('[role="dialog"]')).toBeVisible();

  // Wpisujemy tylko login, ale bez hasła
  await page.fill("#field-username", "testnopass");
  await page.click("#submit-user-btn");

  // Dalej modal otwarty — hasło też wymagane przy tworzeniu
  await expect(page.locator('[role="dialog"]')).toBeVisible();

  // Wpisujemy hasło za krótkie (< 6 znaków) — minLength="6" w HTML
  await page.fill("#field-password", "abc");
  await page.click("#submit-user-btn");

  // Nadal modal otwarty (HTML5 minlength blokuje)
  await expect(page.locator('[role="dialog"]')).toBeVisible();
});

// ─────────────────────────────────────────────────────────────────
// TEST 6: Wyszukiwarka użytkowników — filtrowanie po frazie
// ─────────────────────────────────────────────────────────────────
test("TC-06 Wyszukiwarka filtruje użytkowników po nazwie lub e-mailu", async ({
  page,
}) => {
  await loginAsAdmin(page);
  await goToAdminPanel(page);

  // Czekamy na załadowanie tabeli
  await page.waitForSelector("tbody tr.ap__row", { timeout: 8_000 });
  const totalRows = await page.locator("tbody tr.ap__row").count();

  // Wpisujemy "admin" — powinniśmy znaleźć przynajmniej konto admina
  await page.fill("#search-users-input", "admin");

  // Liczba wierszy powinna się zmniejszyć lub zostać ta sama
  const filteredRows = page.locator("tbody tr.ap__row");
  await expect(filteredRows.first()).toBeVisible({ timeout: 3_000 });

  const filteredCount = await filteredRows.count();
  expect(filteredCount).toBeLessThanOrEqual(totalRows);

  // Każdy wyświetlony wiersz powinien zawierać tekst "admin"
  for (let i = 0; i < filteredCount; i++) {
    const text = await filteredRows.nth(i).textContent();
    expect(text?.toLowerCase()).toContain("admin");
  }

  // Czyścimy wyszukiwarkę — wraca pełna lista
  await page.fill("#search-users-input", "");
  await expect(page.locator("tbody tr.ap__row")).toHaveCount(totalRows, {
    timeout: 3_000,
  });
});

// ─────────────────────────────────────────────────────────────────
// TEST 7: Usunięcie użytkownika — z potwierdzeniem dwukrokowym
// ─────────────────────────────────────────────────────────────────
test("TC-07 Admin może usunąć użytkownika po potwierdzeniu", async ({
  page,
}) => {
  await loginAsAdmin(page);
  await goToAdminPanel(page);

  // Najpierw tworzymy użytkownika do usunięcia
  const userToDelete = `del_user_${Date.now()}`;
  await page.click("#create-user-btn");
  await expect(page.locator('[role="dialog"]')).toBeVisible();

  await page.fill("#field-username", userToDelete);
  await page.fill("#field-password", "haslo123");
  await page.click("#submit-user-btn");

  // Czekamy aż modal się zamknie i user pojawi się w tabeli
  await expect(page.locator('[role="dialog"]')).not.toBeVisible({
    timeout: 8_000,
  });

  // Szukamy świeżo stworzonego użytkownika
  const row = page.locator(`[data-user-id]`).filter({ hasText: userToDelete });
  await expect(row).toBeVisible({ timeout: 5_000 });

  const userId = await row.getAttribute("data-user-id");
  expect(userId).not.toBeNull();

  // Klikamy ikonę kosza — pojawia się potwierdzenie ✓ / ✗
  await page.click(`[data-testid="delete-user-${userId}"]`);

  // Przycisk potwierdzenia ✓ powinien być widoczny
  const confirmBtn = page.locator(`[data-testid="confirm-delete-${userId}"]`);
  await expect(confirmBtn).toBeVisible();

  // Potwierdzamy usunięcie
  await confirmBtn.click();

  // Użytkownik znika z tabeli
  await expect(row).not.toBeVisible({ timeout: 8_000 });
});
