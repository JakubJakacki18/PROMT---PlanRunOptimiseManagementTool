import { test as setup } from "@playwright/test";
import { fileURLToPath } from "url";
import * as path from "path";
import * as fs from "fs";
import { config as loadEnv } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const authFile = path.join(__dirname, "../../playwright/.auth/admin.json");
const authDir = path.dirname(authFile);

loadEnv({ path: path.join(__dirname, "../../../.env") });

if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
}

setup("authenticate as admin", async ({ page }) => {
  await page.goto("/login");
  await page.fill(
    "#username",
    process.env.DJANGO_SUPERUSER_USERNAME ?? "admin",
  );
  await page.fill(
    "#password",
    process.env.DJANGO_SUPERUSER_PASSWORD ?? "admin123",
  );
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard**");
  await page.context().storageState({ path: authFile });
});
