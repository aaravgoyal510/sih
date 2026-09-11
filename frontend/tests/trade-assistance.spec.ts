import {test,expect} from '@playwright/test';
import {recommendationFixture} from '../lib/decision-platform';

const farmer={id:'farmer',name:'Test farmer',roles:['FARMER'],district:'Nashik'};
const offer={id:'offer',listingId:'lot',requirementId:'requirement',status:'PENDING',price:21,listing:{id:'lot',partyId:'farmer',party:farmer,resourceType:'CROP_LOT',priceUnit:'per_kg',attributes:{crop:'Wheat',quantityKg:100,qualityGrade:'A'}},requirement:{id:'requirement',quantityNeeded:100,party:{id:'buyer',name:'Test buyer'}}};

test('received crop offer calculates its recorded rate and acceptance requires confirmation',async({page})=>{
 await page.setViewportSize({width:360,height:800});
 await page.addInitScript(()=>{localStorage.setItem('maha_lang','en');localStorage.setItem('maha_token','fixture');});
 await page.route('**/workspace/snapshot?section=offers',r=>r.fulfill({json:{success:true,party:farmer,offers:[offer]}}));
 let calculation:any,writes=0;
 await page.route('**/workspace/recommendations/preview',r=>{calculation=r.request().postDataJSON();return r.fulfill({json:{success:true,recommendation:{...recommendationFixture,synthetic:false,persisted:false,buyerTrust:null,why:{...recommendationFixture.why,expectedNetPaise:195000,baselineNetPaise:null,deltaPaise:null}}}});});
 await page.route('**/workspace/offers/offer',r=>{writes++;return r.fulfill({json:{success:true,offer:{...offer,status:'ACCEPTED'}}});});
 await page.goto('/farmer/offers');
 await page.getByLabel('Transport cost for this buyer').fill('100');await page.getByLabel('Other sale costs').fill('50');
 await page.getByText('Compare with my local option',{exact:true}).click();await page.getByRole('button',{name:'Explain this decision'}).click();
 await expect(page.getByRole('article',{name:'Explainable sell recommendation'})).toContainText('₹1,950');
 expect(calculation).toMatchObject({offerId:'offer',requirementId:'requirement',transportPaise:10000,otherCostsPaise:5000});expect(writes).toBe(0);
 await page.getByRole('button',{name:'Accept',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('A booking will be created');expect(writes).toBe(0);
 await page.getByRole('dialog').getByRole('button',{name:'Confirm',exact:true}).click();await expect(page.getByRole('dialog')).not.toBeVisible();expect(writes).toBe(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});

test('agreement preserves accepted terms and cancellation has a recorded reason',async({page})=>{
 await page.setViewportSize({width:360,height:800});
 await page.addInitScript(()=>{localStorage.setItem('maha_lang','en');localStorage.setItem('maha_token','fixture');});
 const booking={id:'booking',createdAt:new Date().toISOString(),fulfillmentStatus:'PENDING',paymentStatus:'PENDING',totalAmount:2100,ratings:[],events:[],agreementSnapshot:{version:1,acceptedAt:new Date().toISOString(),seller:{name:'Original farmer'},buyer:{name:'Original buyer'},resourceType:'CROP_LOT',resource:{crop:'Wheat',qualityGrade:'A'},quantity:100,pricePerUnit:21,unit:'per_kg',totalAmountPaise:210000}};
 await page.route('**/workspace/snapshot?section=offers',r=>r.fulfill({json:{success:true,party:farmer,offers:[{...offer,status:'ACCEPTED',price:99,booking}]}}));
 let submitted:any=null;await page.route('**/workspace/bookings/booking/action',r=>{submitted=r.request().postDataJSON();return r.fulfill({json:{success:true,booking:{...booking,fulfillmentStatus:'CANCELLED',cancellationReason:submitted.reason}}});});
 await page.goto('/farmer/offers');await page.locator('summary').filter({hasText:/^Agreement$/}).click();
 const agreement=page.locator('.ks-agreement');await expect(agreement).toContainText('Original farmer');await expect(agreement).toContainText('₹21.00 / kg');await expect(agreement).toContainText('₹2,100.00');await expect(agreement).not.toContainText('₹99.00');
 await page.getByRole('button',{name:'Cancel booking',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('unfunded, unstarted');expect(submitted).toBeNull();
 await page.getByLabel('Cancellation reason',{exact:true}).fill('Pickup arrangements changed');await page.getByRole('dialog').getByRole('button',{name:'Confirm'}).click();
 await expect(page.getByRole('dialog')).not.toBeVisible();expect(submitted).toEqual({action:'CANCEL',reason:'Pickup arrangements changed'});await expect(page.getByRole('button',{name:'Cancel booking',exact:true})).toHaveCount(0);await expect(agreement).toContainText('Pickup arrangements changed');
 await page.screenshot({path:'test-results/mobile-agreement.png',fullPage:true});
});

test('Hindi farmer verification and complaint tracking are guided and persist confirmed UI state',async({page})=>{
 await page.setViewportSize({width:360,height:800});
 await page.addInitScript(()=>{localStorage.setItem('maha_lang','hi');localStorage.setItem('maha_token','fixture');});
 await page.route('**/workspace/snapshot?section=*',r=>r.fulfill({json:{success:true,party:farmer,verifications:[],disputes:[]}}));
 let submitted:any;await page.route('**/workspace/verification',r=>{submitted=r.request().postDataJSON();return r.fulfill({json:{success:true,verification:{id:'doc',status:'PENDING',documentRef:submitted.documentRef,auditLogs:[]}}});});
 await page.goto('/farmer/account');await page.getByLabel('भूमि दस्तावेज़ का संदर्भ').fill('LAND-TEST-001');await page.getByRole('button',{name:'जाँच के लिए भेजें'}).click();
 await expect(page.getByRole('status')).toContainText('जाँच के लिए जमा हुआ');expect(submitted).toMatchObject({role:'FARMER',documentType:'LAND_RECORD',documentRef:'LAND-TEST-001'});await expect(page.getByText('LAND-TEST-001')).toBeVisible();
 await page.getByRole('button',{name:'मेरी शिकायतें'}).click();await expect(page.getByText('कोई शिकायत दर्ज नहीं है।')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});

test('in-app notifications mark account-level read state and fit a phone',async({page})=>{
 await page.setViewportSize({width:320,height:800});
 await page.addInitScript(p=>{localStorage.setItem('maha_lang','en');localStorage.setItem('maha_token','fixture');localStorage.setItem('maha_party',JSON.stringify(p));},farmer);
 await page.route('**/workspace/snapshot?section=verification',r=>r.fulfill({json:{success:true,party:farmer,verifications:[],disputes:[]}}));
 const notificationId='00000000-0000-4000-8000-000000000001';let read=false,submitted:any;
 await page.route('**/workspace/updates',r=>r.fulfill({json:{success:true,partyId:farmer.id,updates:[{id:notificationId,kind:'TRADE',event:'ACCEPT',status:'ACCEPTED',recordedAt:new Date().toISOString(),readAt:read?new Date().toISOString():null}]}}));
 await page.route('**/workspace/updates/read',r=>{submitted=r.request().postDataJSON();read=true;return r.fulfill({json:{success:true}});});
 await page.goto('/farmer/account');await page.getByRole('button',{name:'Updates',exact:true}).click();
 await expect(page.getByText('Agreement accepted',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Updates (1)',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Mark as read',exact:true}).click();await expect(page.getByRole('button',{name:'Updates',exact:true})).toBeVisible();expect(submitted.ids).toEqual([notificationId]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
