// Run: node tests/browser-demo.test.cjs (requires npm package playwright + Chromium and local server on :8765)
'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root='http://127.0.0.1:8765';
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 await page.route(/^https:\/\//,route=>route.abort()); // fonts/icons are optional; no external access
 await page.goto(root+'/modules/platform/index.html#companies');
 await page.evaluate(()=>localStorage.removeItem('mp-ui-prototype-v1'));
 await page.reload();
 await page.locator('#add-company-button').click();
 await page.locator('#new-company-name').fill('Demo Test Shipping');
 await page.locator('#new-owner-email').fill('owner@browser.test');
 await page.locator('#company-object-types').selectOption('vessels');
 await page.locator('#company-form button[type=submit]').click();
 await page.locator('#company-owner-email').waitFor();
 assert.equal(await page.locator('#company-owner-email').textContent(),'owner@browser.test');
 assert.match(await page.locator('#company-template').textContent(),/mock-etalon-vessels-v1/);

 await page.goto(root+'/modules/tenant/index.html?tenant=tenant_db_000001#vessels');
 await page.locator('#add-vessel-button').click();
 await page.locator('#ship-shipName').fill('Demo Vessel');
 await page.locator('#ship-imo').fill('1234567');
 await page.locator('#vessel-particulars-form button[type=submit]').click();
 const shipID=await page.locator('#editor-object-id').textContent();
 assert.match(shipID,/^object-/);
 assert.match(await page.locator('#editor-object-status').textContent(),/Неактивно/);
 assert.match(page.url(),/object=/);

 await page.goto(root+'/modules/tenant/index.html?tenant=tenant_db_000001#vessels');
 await page.locator('[data-next-status=active]').click();
 await page.locator('.mp-confirm-dialog button[value=delete]').click();
 await page.locator('#tenant-vessel-list').getByText('Активно',{exact:true}).waitFor();
 await page.locator('#tenant-vessel-status-filter').selectOption('active');
 assert.equal(await page.locator('#tenant-vessel-list tbody tr').count(),1);

 await page.goto(root+'/modules/tenant/index.html?tenant=tenant_db_000001#users');
 await page.locator('#add-user-button').click();
 await page.locator('#tenant-user-name').fill('Demo Captain');
 await page.locator('#tenant-user-email').fill('captain@browser.test');
 await page.locator('#tenant-user-password').fill('demopass123');
 await page.locator('#tenant-user-password-confirm').fill('demopass123');
 await page.locator('#tenant-user-role').selectOption('vessel');
 await page.locator('#tenant-user-vessel').selectOption([shipID]);
 await page.locator('#save-user-button').click();
 assert.match(await page.locator('#tenant-user-list').textContent(),/Demo Captain/);
 assert.match(await page.locator('#tenant-user-list').textContent(),/Demo Vessel/);

 await page.locator('#add-user-button').click();
 await page.locator('#tenant-user-name').fill('Office User');
 await page.locator('#tenant-user-email').fill('office@browser.test');
 await page.locator('#tenant-user-password').fill('demopass123');
 await page.locator('#tenant-user-password-confirm').fill('demopass123');
 await page.locator('#tenant-user-role').selectOption('office');
 await page.locator('#save-user-button').click();
 assert.match(await page.locator('#tenant-user-list').textContent(),/Office User/);

 await page.goto(root+'/modules/tenant/vessel.html?tenant=tenant_db_000001&object='+encodeURIComponent(shipID));
 await page.locator('#ship-imo').fill('7654321');
 await page.locator('#vessel-particulars-form button[type=submit]').click();
 assert.equal(await page.locator('#editor-object-id').textContent(),shipID);
 assert.match(await page.locator('#editor-object-history').textContent(),/Ship Particulars/);

 await page.goto(root+'/modules/tenant/index.html?tenant=tenant_db_000001#vessels');
 await page.locator('[data-next-status=archived]').click();
 await page.locator('.mp-confirm-dialog button[value=delete]').click();
 await page.locator('#tenant-vessel-status-filter').selectOption('archived');
 assert.equal(await page.locator('#tenant-vessel-list tbody tr').count(),1);
 await page.locator('[data-next-status=inactive]').click();
 await page.locator('.mp-confirm-dialog button[value=delete]').click();
 await page.locator('#tenant-vessel-status-filter').selectOption('inactive');
 assert.equal(await page.locator('#tenant-vessel-list tbody tr').count(),1);

 await page.setViewportSize({width:375,height:812});
 await page.evaluate(()=>localStorage.setItem('vms-theme','dark'));
 await page.reload();
 assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('dark')),true);
 await page.evaluate(()=>localStorage.setItem('vms-theme','light'));
 await page.reload();
 assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('dark')),false);
 const bounds=await page.evaluate(()=>({screen:innerWidth,body:document.documentElement.scrollWidth}));
 assert.ok(bounds.body<=bounds.screen+24,'unexpected page horizontal overflow '+JSON.stringify(bounds));
 assert.deepEqual(errors,[],'browser JavaScript errors: '+errors.join('; '));
 await browser.close();
 console.log('browser demo smoke: PASS');
})().catch(error=>{console.error(error);process.exit(1);});
