const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
    console.log("Launching headless tracing browser...");
    const browser = await chromium.launch();
    const context = await browser.newContext({ recordVideo: { dir: './playwright-videos' } });
    const page = await context.newPage();

    console.log("Navigating to login...");
    await page.goto("http://localhost:3000/login");
    await page.fill('input[type="email"]', "admin@tzir.com");
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL("http://localhost:3000/admin");

    console.log("Going to Courier 1 directly...");
    await page.goto("http://localhost:3000/admin/couriers/1");
    // Wait for the new info card to load
    await page.waitForSelector('text=פרטי קשר מקושרים', { timeout: 10000 });

    console.log("Capturing redesigned profile view...");
    const redesignPath = 'c:\\Users\\Israel\\.gemini\\antigravity\\brain\\4a2e103b-f83c-4c28-803e-fab78aa76cd4\\courier_card_redesign.png';
    await page.screenshot({ path: redesignPath });

    console.log("Opening Edit modal...");
    await page.click('text=✏ ערוך שליח');
    await page.waitForSelector('text=עריכת פרטי שליח');

    console.log("Typing new name and license plate...");
    // The Name input is the first text input in the form
    await page.fill('input[type="text"]', "Demo courier V2");

    // License plate can be specifically selected by traversing from its label
    const lpInput = await page.locator('div').filter({ hasText: /^לוחית רישוי$/ }).locator('input');
    await lpInput.fill("123-45-678");

    console.log("Submitting modal...");
    await page.click('button[type="submit"]');

    console.log("Waiting for success toast and auto-reload...");
    await page.waitForSelector('text=פרטי השליח עודכנו בהצלחה', { timeout: 10000 });

    // Take screenshot showing the updated Name on the card
    await page.waitForTimeout(1000); // let animations play
    const successPath = 'c:\\Users\\Israel\\.gemini\\antigravity\\brain\\4a2e103b-f83c-4c28-803e-fab78aa76cd4\\courier_edit_success.png';
    await page.screenshot({ path: successPath });

    await context.close();
    await browser.close();
    console.log("E2E Test Success!");
})();
