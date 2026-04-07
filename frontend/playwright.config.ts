import {defineConfig, devices} from "@playwright/test";

export default defineConfig({
    testDir: "./e2e",
    testMatch: "**/*.spec.ts",
    fullyParallel: false,
    retries: 0,
    /* Playwright ma własny runner — nie ładuj vitest ani vite.config */
    forbidOnly: false,
    use: {
        baseURL: "http://localhost:5173",
        headless: true,
        screenshot: "only-on-failure",
    },
    projects: [
        {name: 'setup', testMatch: /.*\.setup\.cts/},
        {
            name: "chromium",
            use: {
                ...devices["Desktop Chrome"],
                storageState: 'playwright/.auth/user.json',
            },
            dependencies: ['setup'],
        },
    ],
});
