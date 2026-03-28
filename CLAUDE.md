# PROMT – Playwright E2E Testing Guide

## Stack

| Warstwa | Technologia |
|---------|-------------|
| Frontend | React 19 + Vite + TypeScript |
| Testy jednostkowe | Vitest + @testing-library/react |
| Testy E2E | Playwright (`@playwright/test`) |
| Backend | Django REST Framework (port 8000) |
| Dev server | `localhost:5173` |

---

## Uruchamianie testów E2E

```bash
# z katalogu frontend/ na hoście (nie w kontenerze)
cd frontend

# jednorazowo — instalacja przeglądarek
npx playwright install chromium

# uruchom wszystkie testy
npx playwright test --config=playwright.config.ts

# uruchom konkretny plik
npx playwright test e2e/create-task.spec.ts --config=playwright.config.ts

# tryb headed (widoczna przeglądarka) — przydatny przy debugowaniu
npx playwright test --config=playwright.config.ts --headed
```

> Playwright uruchamiaj lokalnie (na hoście), nie w kontenerze Docker.
> Frontend musi być uruchomiony (`docker compose up frontend`).

---

## Struktura pliku testowego

```
frontend/
├── e2e/                        ← wszystkie testy Playwright
│   ├── create-task.spec.ts
│   ├── team-tab.spec.ts
│   └── project-tasks-filter.spec.ts
├── playwright.config.ts
└── src/                        ← kod aplikacji (Vitest)
```

Każdy plik to osobny scenariusz. Jeden plik = jeden feature area.

---

## Szablon testu

```typescript
import { test, expect } from "@playwright/test";

test("krótki opis tego co test weryfikuje", async ({ page }) => {
  // ── 1. Logowanie ─────────────────────────────────────────────────────────────
  await page.goto("/login");
  await page.fill("#username", "admin");
  await page.fill("#password", "admin123");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard**");

  // ── 2. Nawigacja ──────────────────────────────────────────────────────────────
  await page.goto("/dashboard/tasks");
  await expect(page.getByRole("button", { name: "Dodaj zadanie" })).toBeVisible();

  // ── 3. Akcja ──────────────────────────────────────────────────────────────────
  // ...

  // ── 4. Asercja ────────────────────────────────────────────────────────────────
  // ...
});
```

---

## Zasady selektorów — co używać

Aplikacja używa CSS Modules z własnymi klasami. Wiele labeli **nie ma `htmlFor`**, więc `getByLabel()` często nie działa. Poniższa tabela pokazuje co stosować.

| Sytuacja | Poprawny selektor | Unikaj |
|---|---|---|
| Input z `id` | `page.fill("#username", "...")` | — |
| Input bez `id`, ale z `placeholder` | `page.getByPlaceholder("Np. Przygotować ofertę")` | `getByLabel()` |
| Input z `name` attr (react-hook-form) | `page.locator('input[name="start_date"]')` | — |
| Select z `name` attr | `page.locator('select[name="projectId"]')` | — |
| Przycisk po tekście | `page.getByRole("button", { name: "Zapisz" })` | — |
| Link po tekście | `page.getByRole("link", { name: "Open project" })` | — |
| Radio button | `page.locator('input[type="radio"][value="project"]')` | — |
| Checkbox w liście | `page.locator(".team-person-row").nth(0).locator("label").click()` | — |
| KPI tile / custom button | `page.locator(".tsk-kpi-tile").filter({ hasText: "Zaległe" })` | — |
| Filtr pill | `page.locator(".tsk-pill").filter({ hasText: "Średni" })` | — |
| Dwa elementy o tej samej nazwie | `.first()` lub `.nth(i)` | `getByRole(...)` bez indeksu |

### Regex w selektorach

`getByRole("button", { name: /tekst/i })` działa.
`selectOption({ label: /regex/ })` **nie działa** — Playwright wymaga stringa lub value:

```typescript
// ✗ błąd
await select.selectOption({ label: /Projekt 10/ });

// ✓ znajdź value przez evaluate, potem selectOption
const value = await page.evaluate(() => {
  const sel = document.querySelector('select[name="projectId"]') as HTMLSelectElement;
  return Array.from(sel.options).find(o => o.text.includes("Projekt 10"))?.value ?? null;
});
await select.selectOption({ value: value! });
```

---

## Czekanie na dane z API

RTK Query cache'uje odpowiedzi. Nigdy nie zakładaj, że request zostanie wysłany — zamiast `waitForResponse` czekaj na pojawienie się elementów w DOM.

```typescript
// ✗ kruche — request może być z cache'a
await page.waitForResponse(r => r.url().includes("/api/projects/"));

// ✓ solidne — czekaj aż opcje faktycznie się pojawią
await expect(projectSelect.locator("option").nth(1)).toBeAttached({ timeout: 10000 });

// ✓ lub przez waitForFunction
await page.waitForFunction(
  (sel) => {
    const el = document.querySelector(sel) as HTMLSelectElement | null;
    return el !== null && el.options.length > 1;
  },
  'select[name="projectId"]',
  { timeout: 10000 }
);
```

---

## Toasty

`react-hot-toast` znika po ~2s. Nie sprawdzaj treści toastu — zamiast tego weryfikuj zmianę w DOM (zamknięcie modalu, pojawienie się elementu na liście).

```typescript
// ✗ toast może zniknąć zanim asercja się wykona
await expect(page.getByText("Dodano zadanie")).toBeVisible();

// ✓ sprawdź efekt uboczny
await expect(page.getByRole("heading", { name: "Dodaj zadanie" })).not.toBeVisible();
await expect(page.getByRole("heading", { name: "ABC" }).first()).toBeVisible();
```

---

## Weryfikacja filtrów

Filtry mają klasę `is-active` gdy są aktywne. Sprawdzaj stan UI przez klasy, nie przez zawartość listy (ta zależy od danych w DB).

```typescript
// Sprawdź że filtr jest aktywny
await expect(page.locator(".tsk-kpi-tile").filter({ hasText: "Zaległe" }))
  .toHaveClass(/is-active/);

// Sprawdź że inny filtr nie jest aktywny
await expect(todoBtn).not.toHaveClass(/is-active/);

// Sprawdź wartość selecta
await expect(page.locator(".tsk-select").first()).toHaveValue("overdue");
```

---

## Ważne klasy CSS w aplikacji

| Klasa | Co to jest |
|-------|------------|
| `.tsk-kpi-tile` | Kafelek KPI na stronie Tasks projektu |
| `.tsk-pill` | Przycisk filtra (status / priorytet) |
| `.tsk-select` | Select filtra (Termin, Grupuj, Sortuj) |
| `.tsk-item-card` | Karta zadania na liście |
| `.tsk-search-input` | Pole wyszukiwania tasków |
| `.tsk-list-subtitle` | Licznik wyników (`X widocznych • Y łącznie`) |
| `.team-person-row` | Wiersz osoby w zakładce Team |
| `.team-person-left` | Label z checkboxem osoby |
| `.team-big-card-btn` | Przycisk filtru KPI w Team (Total/Todo/Doing/Overdue) |
| `.team-selected-pill` | Licznik zaznaczonych osób (`Selected: N`) |
| `.modal-window` | Okno modalu (AddTaskModal / EditTaskModal) |
| `.acc-trigger` | Przycisk akordeonu w modalu |

---

## Dane testowe — seed

Testy zakładają istnienie danych w bazie. Przed pierwszym uruchomieniem:

```bash
docker compose exec backend python manage.py seed
```

Seed tworzy:
- 10 projektów (`Projekt 1 - ...` do `Projekt 10 - ...`)
- 30–40 tasków na projekt
- Użytkowników z rolami

Konto admina: `admin` / `admin123` (z pliku `.env`).

---

## Izolacja testów od Vitest

Vitest skanuje `src/**/*.spec.ts`. Playwright skanuje `e2e/**/*.spec.ts`.
Obie konfiguracje są rozdzielone — nie mieszaj ich:

- `vite.config.ts` → `test.exclude: ["**/e2e/**"]` (już ustawione)
- `playwright.config.ts` → `testDir: "./e2e"` (już ustawione)
- Nie importuj nic z `vitest` w plikach `e2e/`
- Nie importuj nic z `@playwright/test` w plikach `src/`

---

## Częste błędy i rozwiązania

| Błąd | Przyczyna | Fix |
|------|-----------|-----|
| `strict mode violation: resolved to 2 elements` | Dwa elementy pasują do selektora | Dodaj `.first()` lub użyj bardziej precyzyjnego locatora |
| `options[0].label: expected string, got object` | `selectOption({ label: /regex/ })` | Zamień na `page.evaluate` + `selectOption({ value })` |
| `Cannot redefine property: Symbol($$jest-matchers-object)` | Vitest i Playwright uruchomione w tym samym procesie | Uruchom `playwright test` z `--config=playwright.config.ts` z katalogu `frontend/` |
| Toast nie jest widoczny | Toast znikł przed asercją | Sprawdź efekt w DOM zamiast treści toastu |
| Select ma tylko placeholder | Dane z API nie załadowane | Użyj `waitForFunction` lub `expect(option.nth(1)).toBeAttached()` |
| `EACCES permission denied` na `test-results/` | Folder należy do root (Docker) | `sudo chown -R $USER:$USER test-results/` |
