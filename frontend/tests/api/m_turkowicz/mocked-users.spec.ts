import { test, expect } from "@playwright/test";

const makeUser = (
  id: number,
  username: string,
  overrides: Record<string, unknown> = {},
) => ({
  id,
  username,
  email: `${username}@testpromt.pl`,
  first_name: "Playwright",
  last_name: "Test",
  is_staff: false,
  is_active: true,
  role: "member",
  profile: {
    phone: "+48123456789",
    avatar_url: null,
  },
  date_joined: "2026-01-01T00:00:00Z",
  ...overrides,
});

const pagedResponse = (results: object[], count?: number) => ({
  count: count ?? results.length,
  next: null,
  previous: null,
  results,
});

const USERS_ROUTE_PATTERN = "/api/users/**";

test(
  "MOCK — panel admina wyświetla wszystkich użytkowników z mockowanej listy w tabeli #users-table",
  async ({ page }) => {
    const mockUsers = [
      makeUser(501, "anna_kowalska", { role: "manager", first_name: "Anna", last_name: "Kowalska" }),
      makeUser(502, "jan_nowak", { role: "member", first_name: "Jan", last_name: "Nowak" }),
      makeUser(503, "piotr_wiszniewski", {
        role: "member",
        first_name: "Piotr",
        last_name: "Wiszniewski",
        is_staff: false,
      }),
    ];

    await page.route(USERS_ROUTE_PATTERN, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        json: pagedResponse(mockUsers),
      });
    });

    await page.goto("/dashboard/admin");
    await page.waitForSelector("#admin-panel-title", { timeout: 15_000 });
    await page.waitForLoadState("networkidle");

    const usersTable = page.locator("#users-table");
    await expect(
      usersTable,
      "Tabela #users-table powinna być widoczna po załadowaniu panelu admina",
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByText("anna_kowalska"),
      "Użytkownik 'anna_kowalska' z mocka powinien być widoczny w tabeli",
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByText("jan_nowak"),
      "Użytkownik 'jan_nowak' z mocka powinien być widoczny w tabeli",
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByText("piotr_wiszniewski"),
      "Użytkownik 'piotr_wiszniewski' z mocka powinien być widoczny w tabeli",
    ).toBeVisible({ timeout: 10_000 });

    const rows = page.locator("tbody tr.ap__row");
    const rowCount = await rows.count();
    expect(
      rowCount,
      `Oczekiwano 3 wierszy w tabeli, znaleziono: ${rowCount}`,
    ).toBe(3);
  },
);

test(
  "MOCK — badge roli użytkownika renderuje się poprawnie: manager jako 'Menedżer', member jako 'Członek zespołu'",
  async ({ page }) => {
    const mockUsers = [
      makeUser(601, "manager_test_user", {
        role: "manager",
        first_name: "Manager",
        last_name: "Testowy",
      }),
      makeUser(602, "member_test_user", {
        role: "member",
        first_name: "Member",
        last_name: "Testowy",
      }),
    ];

    await page.route(USERS_ROUTE_PATTERN, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        json: pagedResponse(mockUsers),
      });
    });

    await page.goto("/dashboard/admin");
    await page.waitForSelector("#admin-panel-title", { timeout: 15_000 });
    await page.waitForLoadState("networkidle");

    const managerRow = page
      .locator("tbody tr.ap__row")
      .filter({ hasText: "manager_test_user" });

    await expect(
      managerRow,
      "Wiersz użytkownika 'manager_test_user' powinien być widoczny",
    ).toBeVisible({ timeout: 10_000 });

    const managerBadge = managerRow.locator(".ap__role-badge");
    await expect(
      managerBadge,
      "Badge roli managera powinien wyświetlać 'Menedżer'",
    ).toContainText("Menedżer");

    const memberRow = page
      .locator("tbody tr.ap__row")
      .filter({ hasText: "member_test_user" });

    await expect(
      memberRow,
      "Wiersz użytkownika 'member_test_user' powinien być widoczny",
    ).toBeVisible({ timeout: 10_000 });

    const memberBadge = memberRow.locator(".ap__role-badge");
    await expect(
      memberBadge,
      "Badge roli member powinien wyświetlać 'Członek zespołu'",
    ).toContainText("Członek zespołu");
  },
);

test(
  "MOCK — błąd 500 z /api/users/ nie crashuje panelu admina i strona pozostaje responsywna",
  async ({ page }) => {
    await page.route(USERS_ROUTE_PATTERN, (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Wewnętrzny błąd serwera." }),
      });
    });

    const jsErrors: string[] = [];
    page.on("pageerror", (error) => {
      jsErrors.push(error.message);
    });

    await page.goto("/dashboard/admin");
    await page.waitForLoadState("networkidle");

    expect(
      page.url(),
      "Strona powinna pozostać na /dashboard/admin mimo błędu API",
    ).toContain("/dashboard");

    const body = page.locator("body");
    await expect(body, "Ciało strony powinno być widoczne").toBeVisible();

    const sidebar = page.locator("nav, aside, [role='navigation']").first();
    if (await sidebar.count() > 0) {
      await expect(
        sidebar,
        "Nawigacja powinna być dostępna nawet przy błędzie API",
      ).toBeVisible();
    }

    const criticalErrors = jsErrors.filter(
      (e) =>
        !e.includes("ResizeObserver") &&
        !e.includes("Non-Error promise rejection"),
    );

    expect(
      criticalErrors,
      `Nie powinno być nieobsługiwanych błędów JavaScript. Znalezione: ${criticalErrors.join(", ")}`,
    ).toHaveLength(0);
  },
);
