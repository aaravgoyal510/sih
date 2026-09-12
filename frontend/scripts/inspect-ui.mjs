import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
await mkdir('test-results',{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
page.on('requestfailed',r=>console.log('Request failed:',r.url(),r.failure()?.errorText));
page.on('console',m=>{if(m.type()==='error')console.log('Console:',m.text());});
await page.goto('http://localhost:3000/demo');
await page.getByRole('heading',{name:'Where do you fit in?'}).waitFor();
try { await page.locator('.ks-portal-card').first().waitFor({timeout:30000}); }
catch(e){console.log('Alerts:',await page.getByRole('alert').allTextContents());await page.screenshot({path:'test-results/startup-error.png',fullPage:true});await browser.close();throw e;}
await page.screenshot({path:'test-results/hub-desktop.png',fullPage:true});
console.log('Desktop overflow:',await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
await page.setViewportSize({width:390,height:844});
await page.screenshot({path:'test-results/hub-mobile.png',fullPage:true});
console.log('Mobile overflow:',await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
await page.setViewportSize({width:1440,height:1000});
await page.locator('.ks-portal-card').filter({has:page.getByRole('heading',{name:'Buyer',exact:true})}).first().click();
await page.locator('.ks-workspace').waitFor({timeout:60000});
await page.screenshot({path:'test-results/buyer-desktop.png',fullPage:true});
console.log('Buyer heading:',await page.locator('h1').innerText());
await page.getByRole('button',{name:'Source produce',exact:true}).click();
await page.screenshot({path:'test-results/market-desktop.png',fullPage:true});
await page.setViewportSize({width:390,height:844});
await page.screenshot({path:'test-results/market-mobile.png',fullPage:true});
console.log('Market mobile overflow:',await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
console.log('Browser errors:',JSON.stringify(errors));
await browser.close();
