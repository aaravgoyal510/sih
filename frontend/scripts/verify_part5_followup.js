const { chromium } = require('@playwright/test');
const { PrismaClient } = require('../../backend/node_modules/@prisma/client');
const path = require('path');

const prisma = new PrismaClient();
const artifactDir = 'C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\72cb5ae5-5c28-4ede-bb99-40af44f49acb';

async function run() {
  console.log('=== Step 1: Pre-Test Database Query (Before Mark as Read) ===');
  const targetIds = [
    'f4a87242-2226-43de-b745-31d249991da4', // NEW_OFFER
    '2a1adc0d-a3e2-4ea4-88fe-0530dd0d0959', // FUND
    'e73ba22d-ea78-40e3-9c09-91b264683aa3', // DISPUTE_OPENED
  ];

  const beforeRows = await prisma.notification.findMany({
    where: { id: { in: targetIds } },
    orderBy: { createdAt: 'desc' }
  });
  console.log('--- BEFORE DB STATE (Direct Query) ---');
  console.log(JSON.stringify(beforeRows, null, 2));

  console.log('\n=== Step 2: Playwright UI Interaction (Storage Operator View) ===');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Login as Nashik Cold Chain Storage Corp
  console.log('Navigating to login page...');
  await page.goto('http://localhost:3000/login');
  await page.waitForLoadState('networkidle');

  console.log('Logging in as Storage Operator (+919833011111)...');
  await page.fill('input[type="tel"]', '+919833011111');
  await page.fill('input[type="password"]', 'FarmerPass123!');
  await page.click('button[type="submit"]');

  await page.waitForURL('**/provider?role=STORAGE_OPERATOR', { timeout: 10000 });
  await page.waitForLoadState('networkidle');
  console.log('Landed on provider workspace:', page.url());

  // Click Updates Bell
  console.log('Opening Updates bell dropdown...');
  const bellBtn = page.locator('.ks-updates button.ks-icon-button').first();
  await bellBtn.click();
  await page.waitForSelector('.ks-updates-panel .ks-update', { timeout: 10000 });

  // Phase 1 Item 1: Click "Open workspace" on DISPUTE_OPENED notification
  console.log('\n[Phase 1] Clicking "Open workspace" on DISPUTE_OPENED notification...');
  const disputeUpdate = page.locator('.ks-updates-panel .ks-update', { hasText: 'Dispute' }).first();
  const disputeText = await disputeUpdate.textContent();
  console.log('Dispute notification text:', disputeText.replace(/\s+/g, ' '));
  await disputeUpdate.locator('a').click();

  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Switch to Offers & bookings tab
  const offersTab = page.locator('nav.ks-tabs button', { hasText: 'Offers & bookings' });
  if (await offersTab.isVisible()) {
    await offersTab.click();
    await page.waitForTimeout(1000);
  }

  // Find the dispute on booking dbc64b46-cebc-4799-94b6-d8a93fa43399
  const disputeCard = page.locator('.ks-dispute-note', { hasText: 'Chamber temperature sensor failure reported' }).first();
  await disputeCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  const disputeScreenshotPath = path.join(artifactDir, 'destination_dispute_view.png');
  await page.screenshot({ path: disputeScreenshotPath, fullPage: false });
  console.log('Captured dispute destination screenshot to:', disputeScreenshotPath);

  // Phase 1 Item 2: Click "Open workspace" on NEW_OFFER notification
  console.log('\n[Phase 1] Opening Updates bell again for NEW_OFFER notification...');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await bellBtn.click();
  await page.waitForSelector('.ks-updates-panel .ks-update', { timeout: 10000 });

  const offerUpdate = page.locator('.ks-updates-panel .ks-update', { hasText: 'New trade offer' }).first();
  const offerText = await offerUpdate.textContent();
  console.log('Offer notification text:', offerText.replace(/\s+/g, ' '));
  await offerUpdate.locator('a').click();

  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  if (await offersTab.isVisible()) {
    await offersTab.click();
    await page.waitForTimeout(1000);
  }

  // Find the offer/booking card for Cold Storage booking dbc64b46-... (Offer c6c3ac99-...)
  const bookingCard = page.locator('article.ks-panel', { hasText: 'Cold storage' }).first();
  await bookingCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  const offerScreenshotPath = path.join(artifactDir, 'destination_offer_view.png');
  await page.screenshot({ path: offerScreenshotPath, fullPage: false });
  console.log('Captured offer destination screenshot to:', offerScreenshotPath);

  // Phase 2: Verify read-state persistence
  console.log('\n=== Step 3: Phase 2 Read-State Persistence Test ===');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await bellBtn.click();
  await page.waitForSelector('.ks-updates-panel', { timeout: 10000 });

  const unreadCountBefore = await page.locator('.ks-unread').textContent().catch(() => '0');
  console.log('Live UI Unread Badge count before clicking "Mark as read":', unreadCountBefore);

  console.log('Clicking "Mark as read" inside the notification panel...');
  const markReadBtn = page.locator('.ks-updates-panel button', { hasText: 'Mark as read' });
  await markReadBtn.click();
  await page.waitForTimeout(2000);

  // Re-query database directly from Postgres
  console.log('\n--- AFTER DB STATE (Direct Prisma Query) ---');
  const afterRows = await prisma.notification.findMany({
    where: { id: { in: targetIds } },
    orderBy: { createdAt: 'desc' }
  });
  console.log(JSON.stringify(afterRows, null, 2));

  // Reload the page fresh (hard refresh)
  console.log('\nReloading page fresh (hard reload)...');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const unreadCountAfterReload = await page.locator('.ks-unread').count();
  console.log('Unread badge element count in DOM after hard reload (0 = cleared badge):', unreadCountAfterReload);

  const postReloadScreenshotPath = path.join(artifactDir, 'post_reload_unread_badge.png');
  await page.screenshot({ path: postReloadScreenshotPath, fullPage: false });
  console.log('Captured post reload unread badge screenshot to:', postReloadScreenshotPath);

  await browser.close();
  console.log('\n=== All Verification Steps Completed Successfully ===');
}

run()
  .catch((err) => {
    console.error('Error running test:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
