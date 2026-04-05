import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
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
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /* Automatycznie uruchom Vite przed testami */
  // webServer: {
  //   command: "npm run dev",
  //   url: "http://localhost:5173",
  //   reuseExistingServer: true,
  // },
});
