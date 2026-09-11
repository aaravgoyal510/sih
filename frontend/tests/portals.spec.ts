import {test,expect,type Page} from '@playwright/test';

// UI-only fixture: never persisted to the API/database and never used by the app.
// Live-provider availability is checked separately; government outages must not
// make calculator/offline rendering tests dependent on synthetic DB seed rows.
async function marketFixture(page:Page){
 await page.route('**/api/mandi-prices?*',route=>route.fulfill({json:{success:true,mode:'live',cached:false,source:'TEST_FIXTURE',lastFetchedAt:new Date().toISOString(),lastObservedAt:new Date().toISOString(),priceBasis:'UI test fixture only',prices:[{id:'test-only-price',crop:'Onion',district:'Nashik',market:'Fixture market',pricePerKg:20,source:'TEST_FIXTURE',recordedAt:new Date().toISOString()}]}}));
}

test('unavailable live feed never presents legacy seed cache as live prices',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('ks_market_prices',JSON.stringify([{id:'old-seed',crop:'Onion',pricePerKg:999}])));
 await page.route('**/api/mandi-prices?*',route=>route.fulfill({json:{success:true,prices:[],mode:'unavailable',source:'AGMARKNET_LIVE',warning:'Government feed unavailable',lastFetchedAt:null,lastObservedAt:null}}));
 await page.goto('/farmer/prices');
 await expect(page.getByRole('heading',{name:'Live feed unavailable',exact:true})).toBeVisible();
 await expect(page.locator('.ks-row')).toHaveCount(0);
 await expect(page.getByText('Government feed unavailable',{exact:true})).toBeVisible();
});

test('all 11 role types open a database-backed workspace without page errors',async({page})=>{
 test.setTimeout(600000); // Includes cold Next dev compilation and hosted DB round-trips for 11 portals.
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 let snapshotReads=0;page.on('request',r=>{if(r.url().endsWith('/api/workspace/snapshot'))snapshotReads++;});
 const roles=['Farmer','FPO aggregator','Buyer','Storage operator','Transport operator','Equipment provider','Labor contractor','Input supplier','District administration','State command','Platform administration'];
 for(const role of roles){
  snapshotReads=0;
  await page.goto('/demo');
  const cards=page.locator('.ks-portal-card').filter({has:page.getByRole('heading',{name:role,exact:true})});
  await expect(cards.first()).toBeVisible();await cards.first().click();
  if(role==='Farmer'){await expect(page.getByRole('heading',{name:/Bhausaheb/})).toBeVisible();await expect(page.locator('.farmer-grid a')).toHaveCount(4);}
  else await expect(page.locator('.ks-workspace')).toBeVisible();
  await expect(page.locator('.ks-alert.error')).toHaveCount(0);
  expect(snapshotReads, `${role} should share duplicate mount reads`).toBe(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 }
 expect(errors).toEqual([]);
});

test('mobile hub and marketplace fit the viewport, filters and offer dialog work',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/demo');
 await expect(page.getByRole('heading',{name:'Where do you fit in?'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.getByRole('button',{name:'Service providers',exact:true}).click();
 await expect(page.locator('.ks-portal-card')).toHaveCount(5);
 await page.getByRole('button',{name:'Farmers & buyers',exact:true}).click();
 await page.locator('.ks-portal-card').filter({has:page.getByRole('heading',{name:'Buyer',exact:true})}).first().click();
 await page.getByRole('button',{name:'Source produce',exact:true}).click();
 await page.getByLabel('Search marketplace').fill('Pomegranate');
 const listings=page.locator('.ks-listing');await expect(listings).toHaveCount(1);
 await listings.getByRole('button',{name:'Send offer'}).click();
 await expect(page.getByRole('dialog')).toBeVisible();
 await expect(page.getByLabel('Offer price per unit')).toHaveValue('95');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.getByRole('button',{name:'Close dialog'}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('prices support source-labelled cost comparison with a UI-only fixture',async({page})=>{
 await marketFixture(page);
 await page.goto('/farmer/prices');await expect(page.getByRole('heading',{name:'Net value calculator'})).toBeVisible();
 await page.getByLabel('Quantity (kg)',{exact:true}).fill('1000');
 await page.getByLabel('Total transport cost').fill('2000');
 await page.getByLabel('Commission (%)').fill('2');
 await expect(page.locator('.ks-row').first()).toBeVisible();
 await expect(page.locator('.ks-row').first()).toContainText('Estimated net');
 await page.setViewportSize({width:360,height:800});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});

test('offline navigation exposes saved prices without queuing transactions', async ({page,context}) => {
 await marketFixture(page);
 await page.goto('/farmer/prices');
 await expect(page.locator('.ks-row').first()).toBeVisible();
 await page.evaluate(async () => { await navigator.serviceWorker.ready; });
 await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBeTruthy();
 await context.setOffline(true);
 await page.goto('/farmer/prices?offline-check=1');
 await expect(page.getByRole('heading', {name:'You’re offline'})).toBeVisible();
 await expect(page.locator('#prices article').first()).toBeVisible();
 await expect(page.locator('main')).toContainText('no offers or payments will be queued automatically');
 await context.setOffline(false);
});
