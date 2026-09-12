import {test,expect} from '@playwright/test';
test('Hindi sentence fills crop and quantity, draft survives reload, publication is explicit',async({page})=>{
 await page.setViewportSize({width:360,height:800});
 await page.addInitScript(()=>{localStorage.setItem('maha_lang','hi');localStorage.setItem('maha_token','fixture');});
 await page.route('**/api/backend/api/workspace/me',r=>r.fulfill({json:{success:true,party:{id:'fixture-farmer',name:'Test farmer',district:'Nashik',roles:['FARMER']}}}));
 let submitted:any=null;
 await page.route('**/api/backend/api/workspace/resources/listing',async r=>{submitted=r.request().postDataJSON();await r.fulfill({json:{success:true,listing:{id:'fixture-listing'}}});});
 await page.goto('/farmer/sell');
 await expect(page.getByRole('heading',{name:'अपनी फसल चुनें'})).toBeVisible();
 await page.getByLabel('आप बोलने की जगह लिख भी सकते हैं').fill('मेरे पास २० क्विंटल गेहूं है');
 await page.getByRole('button',{name:'ये जानकारी भरें',exact:true}).click();
 await expect(page.getByRole('button',{name:'गेहूं',exact:true})).toHaveAttribute('aria-pressed','true');
 expect(submitted).toBeNull();
 await page.getByRole('button',{name:'आगे',exact:true}).click();
 await expect(page.getByLabel('मात्रा',{exact:true})).toHaveValue('20');
 await page.getByLabel('प्रति किलो भाव').fill('25');
 await expect(page.getByRole('button',{name:'जाँचें',exact:true})).toBeDisabled();
 await page.getByLabel('गुणवत्ता',{exact:true}).selectOption('A');
 await page.reload();
 await expect(page.getByRole('button',{name:'गेहूं',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'आगे',exact:true}).click();
 await expect(page.getByLabel('प्रति किलो भाव')).toHaveValue('25');
 await page.getByRole('button',{name:'जाँचें',exact:true}).click();
 await expect(page.locator('.ks-review-details')).toContainText('2,000');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:'test-results/assisted-hindi-review.png',fullPage:true});
 await page.getByRole('button',{name:'फसल बिक्री के लिए डालें',exact:true}).click();
 await expect(page.getByRole('heading',{name:'आपकी फसल प्रकाशित हो गई'})).toBeVisible();
 expect(submitted.attributes).toEqual({crop:'Wheat',quantityKg:2000,qualityGrade:'A'});
 expect(submitted.clientRequestId).toMatch(/^[0-9a-f-]{36}$/);
});

test('speech permission failure gives a usable typing fallback',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('maha_lang','en');localStorage.setItem('maha_token','fixture');
  (window as any).SpeechRecognition=class {onerror:any;onend:any;start(){this.onerror?.({error:'not-allowed'});this.onend?.();}abort(){}stop(){}};
 });
 await page.route('**/api/backend/api/workspace/me',r=>r.fulfill({json:{success:true,party:{id:'fixture-farmer',name:'Test farmer',district:'Nashik',roles:['FARMER']}}}));
 await page.goto('/farmer/sell');await page.getByRole('button',{name:'Speak to fill',exact:true}).click();
 await expect(page.getByText('Microphone permission denied. You can still type.')).toBeVisible();
 await expect(page.getByLabel('You can also type what you would say')).toBeEditable();
});

test('same-origin gateway reaches API and preserves authentication rejection',async({request})=>{
 const health=await request.get('/api/backend/health');expect(health.status()).toBe(200);expect((await health.json()).service).toBe('KrishiSetu API');
 const missing=await request.get('/api/backend/api/workspace/snapshot?section=create');expect(missing.status()).toBe(401);
 const invalid=await request.get('/api/backend/api/workspace/snapshot?section=create',{headers:{Authorization:'Bearer test-invalid'}});expect(invalid.status()).toBe(401);expect((await invalid.json()).error).toContain('Invalid or expired');
});
