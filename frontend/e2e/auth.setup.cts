import {test as setup} from '@playwright/test';
import * as path from "path";
import * as fs from 'fs';
import * as dotenv from "dotenv";

const authFile = path.join(__dirname, '../playwright/.auth/admin.json');
const authDir = path.dirname(authFile);

dotenv.config({path: "../.env"});

if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, {recursive: true});
}

setup('authenticate as admin', async ({page}) => {
    await page.goto("/login");
    await page.fill("#username", process.env.DJANGO_SUPERUSER_USERNAME);
    await page.fill("#password", process.env.DJANGO_SUPERUSER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard**");
    await page.context().storageState({path: authFile});
});