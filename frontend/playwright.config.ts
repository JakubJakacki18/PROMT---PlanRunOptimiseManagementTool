import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  /* Uruchom wszystkie testy sekwencyjnie (ważne przy sesji/CSRF) */
  fullyParallel: false,
  workers: 1,
  /* Powtórz nieudane testy raz na CI */
  retries: process.env.CI ? 1 : 0,
  /* Reporter */
  reporter: process.env.CI ? "github" : "html",

  use: {
    /* Adres frontendu — lokalnie 5173, w Dockerze nadpisany przez env */
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173",
    /* Zapisuj ślad przy nieudanych testach */
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    /* Obsługa ciasteczek sesji Django (CSRF + sessionid) */

    extraHTTPHeaders: {
      Accept: "application/json",
    },
  },

  projects: [
    // ── Projekt setup: logowanie i zapis storageState ──
    // Uruchamia się PRZED testami i zapisuje stan sesji do pliku.
    // Patrz: https://playwright.dev/docs/auth#basic-shared-account-in-all-tests
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },

    // ── Projekt testowy: korzysta z gotowej sesji ──
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/admin.json",
      },
      dependencies: ["setup"],
    },
  ],
});
