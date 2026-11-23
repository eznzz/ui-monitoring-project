const { test, expect } = require('@playwright/test');
const url = 'http://127.0.0.1:8765/modules/platform/contract-demo/index.html';
async function signIn(page,actor='owner',status='success'){
 await page.goto(url);
 await page.locator('#demo-actor').selectOption(actor);
 await page.locator('#demo-login-status').selectOption(status);
 await page.locator('#mock-login').click();
}
test('login error and mock session',async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await signIn(page,'owner','401');
 await expect(page.locator('#feedback')).toContainText('401');
 await expect(page.locator('#session-panel')).toContainText('вход не выполнен');
 await page.locator('#demo-login-status').selectOption('success');
 await page.locator('#mock-login').click();
 await expect(page.locator('#session-panel')).toContainText('GET /me 200');
 await page.locator('#mock-logout').click();
 await expect(page.locator('#session-panel')).toContainText('очищена');
 expect(errors).toEqual([]);
});
test('reader denied writes and owner can create and edit draft',async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await signIn(page,'reader');
 await page.locator('#open-platform').click();
 await expect(page.locator('#new-company')).toBeDisabled();
 await expect(page.locator('#companies-body')).toContainText('North Shipping');
 await page.locator('a[data-page="login"]').click();
 await page.locator('#demo-actor').selectOption('owner');
 await page.locator('#mock-login').click();
 await page.locator('#open-platform').click();
 await page.locator('#new-company').click();
 await page.locator('#record-code').fill('SMOKE');
 await page.locator('#record-name').fill('Smoke Test');
 await page.locator('#record-form button[type="submit"]').click();
 await expect(page.locator('#companies-body')).toContainText('Smoke Test');
 await expect(page.locator('#company-detail')).toContainText('draft');
 await page.getByRole('button',{name:'Редактировать draft'}).click();
 await page.locator('#record-name').fill('Smoke Revised');
 await page.locator('#record-form button[type="submit"]').click();
 await expect(page.locator('#company-detail')).toContainText('Smoke Revised');
 expect(errors).toEqual([]);
});
test('409 and reviewer activation flow',async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await signIn(page);
 await page.locator('#open-platform').click();
 await page.locator('#companies-body button').first().click();
 await page.getByRole('button',{name:'Имитировать 409 при сохранении'}).click();
 await page.locator('#record-name').fill('Conflicted');
 await page.locator('#record-form button[type="submit"]').click();
 await expect(page.locator('#record-error')).toContainText('409');
 await page.locator('#cancel-record').click();
 await page.getByRole('button',{name:'Запросить активацию'}).click();
 await expect(page.locator('#feedback')).toContainText('requested');
 await page.locator('a[data-page="login"]').click();
 await page.locator('#demo-actor').selectOption('reviewer');
 await page.locator('#mock-login').click();
 await page.locator('a[data-page="activation"]').click();
 await expect(page.locator('#activation-queue')).toContainText('North Shipping');
 await page.getByRole('button',{name:'Одобрить (mock)'}).click();
 await expect(page.locator('#activation-queue')).toContainText('approved');
 expect(errors).toEqual([]);
});
test('mobile navigation remains reachable',async ({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto(url);
 await signIn(page);
 await page.locator('#open-platform').click();
 await page.locator('#burger').click();
 await expect(page.locator('#sidebar')).toHaveClass(/open/);
 await page.locator('a[data-page="contract"]').click();
 await expect(page.locator('#screen-contract')).toBeVisible();
 await expect(page.locator('#sidebar')).not.toHaveClass(/open/);
});


test('Reviewer invitation state and owner audit journal',async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await signIn(page,'owner');
 await page.locator('#open-platform').click();
 await page.locator('a[data-page="reviewer"]').click();
 await page.locator('#reviewer-email').fill('reviewer@example.test');
 await page.locator('#reviewer-login').fill('reviewer-demo');
 await page.locator('#invite-reviewer').click();
 await expect(page.locator('#reviewer-invitations')).toContainText('requested');
 await page.getByRole('button',{name:'Следующий mock-статус'}).click();
 await expect(page.locator('#reviewer-invitations')).toContainText('queued');
 await page.locator('a[data-page="logs"]').click();
 await expect(page.locator('#log-body')).toContainText('company.created');
 await page.locator('a[data-page="login"]').click();
 await page.locator('#demo-actor').selectOption('reader');
 await page.locator('#mock-login').click();
 await page.locator('#open-platform').click();
 await page.locator('a[data-page="logs"]').click();
 await expect(page.locator('#log-body')).toContainText('403');
 expect(errors).toEqual([]);
});
