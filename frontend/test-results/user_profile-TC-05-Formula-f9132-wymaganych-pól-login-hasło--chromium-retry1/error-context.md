# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: user_profile.spec.ts >> TC-05 Formularz blokuje wysłanie gdy brak wymaganych pól (login, hasło)
- Location: e2e/user_profile.spec.ts:180:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForSelector: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('#username') to be visible

```

# Page snapshot

```yaml
- generic [ref=e2]: "Blocked request. This host (\"frontend\") is not allowed. To allow this host, add \"frontend\" to `server.allowedHosts` in vite.config.js."
```

# Test source

```ts
  1  | import { Page } from "@playwright/test";
  2  | 
  3  | const API = "http://localhost:8000/api";
  4  | 
  5  | /**
  6  |  * Loguje użytkownika przez UI (formularz logowania).
  7  |  * Używa domyślnego konta admina z .env → admin / admin
  8  |  */
  9  | export async function loginAsAdmin(page: Page) {
  10 |   await loginAs(page, "admin", "admin");
  11 | }
  12 | 
  13 | /**
  14 |  * Loguje dowolnego użytkownika przez UI.
  15 |  */
  16 | export async function loginAs(
  17 |   page: Page,
  18 |   username: string,
  19 |   password: string
  20 | ) {
  21 |   await page.goto("/login");
> 22 |   await page.waitForSelector("#username");
     |              ^ Error: page.waitForSelector: Test timeout of 30000ms exceeded.
  23 | 
  24 |   await page.fill("#username", username);
  25 |   await page.fill("#password", password);
  26 |   await page.click('button[type="submit"]');
  27 | 
  28 |   // Czekamy na przekierowanie do dashboardu
  29 |   await page.waitForURL("**/dashboard/**", { timeout: 10_000 });
  30 | }
  31 | 
  32 | /**
  33 |  * Przechodzi bezpośrednio do panelu admina (zakłada, że jest się zalogowanym).
  34 |  */
  35 | export async function goToAdminPanel(page: Page) {
  36 |   await page.goto("/dashboard/admin");
  37 |   // Czekamy aż załaduje się tabela użytkowników
  38 |   await page.waitForSelector("#admin-panel-title");
  39 | }
  40 | 
```