import {test,expect} from '@playwright/test';
import {recommendationFixture} from '../lib/decision-platform';
test('Hindi service booking has a review step and sends one explicit idempotent request',async({page})=>{
 await page.setViewportSize({width:360,height:800});
 await page.addInitScript(()=>{localStorage.setItem('maha_lang','hi');localStorage.setItem('maha_token','ui-fixture');});
 await page.route('**/workspace/snapshot?section=market',r=>r.fulfill({json:{success:true,party:{id:'farmer',roles:['FARMER']},listings:[{id:'storage-fixture',resourceType:'COLD_STORAGE',status:'OPEN',partyId:'provider',party:{id:'provider',name:'Test storage',credibility:null},district:'Nashik',price:50,priceUnit:'per_quintal',attributes:{capacityQuintal:20,cropSuitability:['Onion'],tempRange:'2–8 °C'}}]}}));
 let writes:any[]=[];await page.route('**/workspace/offers',r=>{writes.push(r.request().postDataJSON());return r.fulfill({json:{success:true,offer:{id:'ui-offer'}}});});
 await page.goto('/farmer/services');
 await page.locator('.ks-service-tile').filter({has:page.getByRole('heading',{name:'भंडारण',exact:true})}).click();
 await expect(page.getByText('Test storage',{exact:false})).toBeVisible();
 await page.getByRole('button',{name:'यह सेवा माँगें'}).click();await expect(page.getByRole('dialog')).toBeVisible();expect(writes).toHaveLength(0);
 await page.getByRole('dialog').getByRole('spinbutton').fill('2');await page.getByRole('button',{name:'पक्का करें',exact:true}).click();
 await expect(page.getByRole('dialog')).not.toBeVisible();expect(writes).toHaveLength(1);expect(writes[0]).toMatchObject({quantity:2,price:50,listingId:'storage-fixture'});expect(writes[0].clientRequestId).toMatch(/^[0-9a-f-]{36}$/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:'test-results/hindi-service-request.png',fullPage:true});
});
test('buyer demand shows unknown costs and requires an explicit proposal',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('maha_lang','en');localStorage.setItem('maha_token','ui-fixture');});
 await page.route('**/workspace/sell-options/*',r=>r.fulfill({json:{success:true,listing:{id:'lot',status:'OPEN',price:25,attributes:{crop:'Wheat',quantityKg:2000}},options:[{id:'requirement',buyer:{id:'buyer',name:'Test buyer',district:'Pune'},quantityKg:1000,budgetPerKg:28,verified:false,requiresPooling:false}]}}));
 let proposals=0;await page.route('**/workspace/offers',r=>{proposals++;return r.fulfill({json:{success:true,offer:{id:'offer'}}});});
 await page.goto('/farmer/buyers?listingId=lot');await expect(page.locator('strong').filter({hasText:'Enter costs to compare net value'})).toBeVisible();expect(proposals).toBe(0);
 await page.getByLabel('Transport cost for this buyer').fill('1000');await page.getByLabel('Other sale costs').fill('500');await expect(page.getByText(/Expected take-home:.*26,500/)).toBeVisible();
 let decisionRequest:any=null;await page.route('**/workspace/recommendations/preview',r=>{decisionRequest=r.request().postDataJSON();return r.fulfill({json:{success:true,recommendation:{...recommendationFixture,synthetic:false,persisted:false,buyerTrust:null,why:{...recommendationFixture.why,expectedNetPaise:2650000,baselineNetPaise:2300000,deltaPaise:350000,costs:[{label:'Transport',amountPaise:100000},{label:'Other sale costs',amountPaise:50000}]},what_if_wait:{status:'UNAVAILABLE',reason:'No validated waiting forecast.'}}}});});
 await page.getByText('Compare with my local option',{exact:true}).click();await page.getByLabel('Local take-home amount').fill('23000');await page.getByRole('button',{name:'Explain this decision'}).click();
 const card=page.getByRole('article',{name:'Explainable sell recommendation'});await expect(card).toBeVisible();await expect(card).toContainText('Net realization ₹3,500 higher');expect(decisionRequest).toMatchObject({transportPaise:100000,otherCostsPaise:50000,baselineNetPaise:2300000});expect(proposals).toBe(0);
 expect(await card.locator('[data-decision-field]').evaluateAll(elements=>elements.map(e=>e.getAttribute('data-decision-field')))).toEqual(['WHAT','WHY','RISK','WHAT IF I WAIT']);
 await page.getByRole('button',{name:/Send my asking price/}).click();await expect(page.getByRole('status')).toContainText('Price proposal sent');expect(proposals).toBe(1);
});

test('buyer can act on matched supply directly from its own requirement',async({page})=>{
 const party={id:'buyer',name:'Test procurement',district:'Nashik',roles:['BUYER'],verifications:[]};
 const requirement={id:'requirement',partyId:'buyer',party,resourceType:'CROP_LOT',district:'Nashik',quantityNeeded:100,budget:20,attributes:{crop:'Wheat',quantityKg:100,qualityGrade:'A'},_count:{offers:0}};
 await page.addInitScript(()=>{localStorage.setItem('maha_lang','en');localStorage.setItem('maha_token','fixture');});
 await page.route('**/workspace/snapshot?section=*',r=>r.fulfill({json:{success:true,party,listings:[],requirements:[requirement],offers:[],verifications:[],disputes:[],members:[],logs:[],stats:[],documents:{}}}));
 await page.route('**/workspace/matches/requirement',r=>r.fulfill({json:{success:true,matches:[{listingId:'lot',title:'Wheat 100 kg',partyName:'Test farmer',district:'Nashik',price:21,score:90}]}}));
 let sent:any=null;await page.route('**/workspace/offers',r=>{sent=r.request().postDataJSON();return r.fulfill({json:{success:true,offer:{id:'new-offer'}}});});
 await page.goto('/buyer');await page.getByRole('navigation',{name:'Workspace sections'}).getByRole('button',{name:'Source produce',exact:true}).click();
 await page.getByRole('button',{name:'Find matches'}).click();await page.getByLabel('Choose matching supply').selectOption('lot');await page.getByLabel('Offer price per unit').fill('21');expect(sent).toBeNull();
 await page.getByRole('button',{name:'Respond with an offer'}).click();await expect(page.getByRole('status')).toContainText('Offer sent');expect(sent).toMatchObject({listingId:'lot',requirementId:'requirement',quantity:100,price:21});expect(sent.clientRequestId).toMatch(/^[0-9a-f-]{36}$/);
});
