const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  const dir = 'C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\f47da02d-acc0-4f47-b5d9-5ca577a9ced3';

  console.log('Navigating to http://localhost:3000/farmer/fasalrakshak...');
  await page.goto('http://localhost:3000/farmer/fasalrakshak', { waitUntil: 'networkidle' });

  await page.screenshot({ path: path.join(dir, 'fasalrakshak_daily_advisory.png'), fullPage: true });
  console.log('Saved Daily Advisory screenshot.');

  // Click Tab 2: Crop Problem Assistant
  const tabs = await page.$$('button');
  if (tabs.length >= 2) {
    await tabs[1].click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(dir, 'fasalrakshak_ai_diagnosis.png'), fullPage: true });
    console.log('Saved AI Diagnosis screenshot.');
  }

  // Click Tab 3: Expense Diary
  if (tabs.length >= 3) {
    await tabs[2].click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(dir, 'fasalrakshak_expense_diary.png'), fullPage: true });
    console.log('Saved Expense Diary screenshot.');
  }

  // Click Tab 4: Harvest Planner
  if (tabs.length >= 4) {
    await tabs[3].click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(dir, 'fasalrakshak_harvest_planner.png'), fullPage: true });
    console.log('Saved Harvest Planner screenshot.');
  }

  await browser.close();
  console.log('All FasalRakshak screenshots captured successfully.');
})();
