const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const dir = 'C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\f47da02d-acc0-4f47-b5d9-5ca577a9ced3';

  // --- DEMO ROLE SWITCHER HUB SCREENSHOT ---
  console.log('Navigating to http://localhost:3000/demo...');
  await page.goto('http://localhost:3000/demo', { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(dir, 'demo_role_switcher_hub.png'), fullPage: true });
  console.log('Saved Demo Role Switcher Hub screenshot.');

  // --- STATE ADMIN DASHBOARD SCREENSHOTS ---
  console.log('Navigating to http://localhost:3000/state-admin...');
  await page.goto('http://localhost:3000/state-admin', { waitUntil: 'networkidle' });

  // Tab 1: Heatmap
  await page.screenshot({ path: path.join(dir, 'state_admin_tab1_heatmap.png'), fullPage: true });
  console.log('Saved State Admin Tab 1 (Heatmap) screenshot.');

  await browser.close();
  console.log('All demo screenshots captured cleanly.');
})();
