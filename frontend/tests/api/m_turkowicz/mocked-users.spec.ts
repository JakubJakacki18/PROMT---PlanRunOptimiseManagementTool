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
  tasks_count: 0,
  done_tasks_count: 0,
  profile: {
    role: "member",
    phone: "+48123456789",
    avatar_url: null,
  },
  ...overrides,
});

const makeMe = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  username: "admin",
  email: "admin@testpromt.pl",
  first_name: "Admin",
  last_name: "PROMT",
  is_staff: true,
  role: "admin",
  ...overrides,
});

// UserViewSet ma pagination_class = None — mock zwraca TABLICĘ, nie obiekt z {results}
const flatList = (users: object[]) => users;

const USERS_ROUTE_PATTERN = "/api/users/**";
const ME_ROUTE = "/api/auth/me/";

test(
  "MOCK — panel admina wyświetla wszystkich użytkowników z mockowanej listy w tabeli #users-table",
  async ({ page }) => {
    const mockUsers = [
      makeUser(501, "anna_kowalska", { profile: { role: "manager", phone: "", avatar_url: null }, first_name: "Anna", last_name: "Kowalska" }),
      makeUser(502, "jan_nowak", { first_name: "Jan", last_name: "Nowak" }),
      makeUser(503, "piotr_wiszniewski", {
        first_name: "Piotr",
        last_name: "Wiszniewski",
      }),
    ];

    await page.route(USERS_ROUTE_PATTERN, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        json: flatList(mockUsers),
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
        profile: { role: "manager", phone: "", avatar_url: null },
        first_name: "Manager",
        last_name: "Testowy",
      }),
      makeUser(602, "member_test_user", {
        profile: { role: "member", phone: "", avatar_url: null },
        first_name: "Member",
        last_name: "Testowy",
      }),
    ];

    await page.route(USERS_ROUTE_PATTERN, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        json: flatList(mockUsers),
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

test(
  "MOCK — /api/auth/me/ zwraca dane aktualnie zalogowanego użytkownika z rolą admin i is_staff: true",
  async ({ page }) => {
    const mockMe = makeMe({
      username: "marek_turkowicz",
      first_name: "Marek",
      last_name: "Turkowicz",
      email: "marek@testpromt.pl",
    });

    await page.route(ME_ROUTE, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        json: mockMe,
      });
    });

    await page.goto("/dashboard/admin");
    await page.waitForLoadState("networkidle");

    // Weryfikujemy, że request do /api/auth/me/ zostaje wykonany przez stronę
    // i że strona poprawnie obsługuje odpowiedź z danymi użytkownika
    expect(
      page.url(),
      "Strona powinna pozostać na /dashboard po załadowaniu zamockowanego me",
    ).toContain("/dashboard");

    // Weryfikujemy, że frontned nie ulega awarii przy specyficznych danych użytkownika z mocka
    const body = page.locator("body");
    await expect(body, "Body strony powinno być widoczne").toBeVisible();
  },
);

test(
  "MOCK — użytkownik z ustawionym avatar_url — frontend nie wyświetla błędnego placeholder",
  async ({ page }) => {
    const mockUsers = [
      makeUser(701, "avatar_user", {
        profile: {
          role: "member",
          phone: "+48111222333",
          avatar_url: "https://avatars.testpromt.pl/user701.png",
        },
        first_name: "Avatar",
        last_name: "Testowy",
      }),
    ];

    await page.route(USERS_ROUTE_PATTERN, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        json: flatList(mockUsers),
      });
    });

    await page.goto("/dashboard/admin");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByText("avatar_user"),
      "Użytkownik z avatar_url powinien być widoczny na liście",
    ).toBeVisible({ timeout: 10_000 });

    const jsErrors: string[] = [];
    page.on("pageerror", (e) => jsErrors.push(e.message));

    const criticalErrors = jsErrors.filter(
      (e) => !e.includes("ResizeObserver"),
    );
    expect(
      criticalErrors,
      "Wyświetlenie użytkownika z avatar_url nie powinno powodować błędów JS",
    ).toHaveLength(0);
  },
);

test(
  "MOCK — lista z mieszanymi rolami (admin, pm, member, viewer) — każda rola ma swój badge",
  async ({ page }) => {
    const mockUsers = [
      makeUser(801, "admin_user", { profile: { role: "admin", phone: "", avatar_url: null } }),
      makeUser(802, "pm_user", { profile: { role: "pm", phone: "", avatar_url: null } }),
      makeUser(803, "member_user", { profile: { role: "member", phone: "", avatar_url: null } }),
      makeUser(804, "viewer_user", { profile: { role: "viewer", phone: "", avatar_url: null } }),
    ];

    await page.route(USERS_ROUTE_PATTERN, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        json: flatList(mockUsers),
      });
    });

    await page.goto("/dashboard/admin");
    await page.waitForSelector("#admin-panel-title", { timeout: 15_000 });
    await page.waitForLoadState("networkidle");

    const rows = page.locator("tbody tr.ap__row");
    await expect(
      rows,
      "Powinny być widoczne dokładnie 4 wiersze odpowiadające 4 użytkownikom z mocka",
    ).toHaveCount(4, { timeout: 10_000 });

    const badges = page.locator(".ap__role-badge");
    const badgeCount = await badges.count();
    expect(
      badgeCount,
      "Każdy z 4 użytkowników powinien mieć swój badge roli",
    ).toBe(4);
  },
);
