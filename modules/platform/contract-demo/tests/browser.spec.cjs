const { test, expect } = require('@playwright/test');
const url = 'http://127.0.0.1:8765/modules/platform/contract-demo/index.html';
async function fillIdentity(page,actor='owner',mode='restricted'){
 const login=actor==='reviewer'?(mode==='standard'?'readonly.reviewer.demo':'reviewer.demo'):(mode==='lab'?'lab.owner.demo':'owner.demo');
 await page.locator('#platform-login-name').fill(login);
 await page.locator('#platform-login-password').fill('demo-only');
 await page.locator('#platform-login-totp').fill('000000');
}
async function signIn(page,actor='owner',status='success',mode='restricted'){
 await page.goto(url);
 await fillIdentity(page,actor,mode);
 if(status==='401')await page.locator('#platform-login-password').fill('invalid');
 await page.locator('#mock-login').click();
}
test('sign in fields mirror VDMS and open scenarios directly without credentials transmission',async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const requests=[];page.on('request',req=>{if(req.method()!=='GET')requests.push(req.method()+' '+req.url());});
 await page.goto(url);
 await expect(page.getByLabel('Platform login')).toBeVisible();
 await expect(page.getByLabel('Password')).toHaveAttribute('type','password');
 await expect(page.getByLabel('Authenticator code')).toHaveAttribute('pattern','[0-9]{6}');
 await expect(page.locator('#demo-server-mode')).toHaveCount(0);
 await expect(page.locator('#demo-login-status')).toHaveCount(0);
 await expect(page.locator('#open-platform')).toHaveCount(0);
 await page.locator('#platform-login-name').fill('owner.demo');
 await page.locator('#platform-login-password').fill('invalid');
 await page.locator('#platform-login-totp').fill('000000');
 await page.locator('#mock-login').click();
 await expect(page.locator('#platform-login-error')).toContainText('демонстрационные');
 await expect(page.locator('#screen-login')).toBeVisible();
 await expect(page.locator('#platform-login-password')).toHaveValue('');
 await fillIdentity(page,'owner');
 await page.locator('#mock-login').click();
 await expect(page.locator('#screen-overview')).toBeVisible();
 await page.locator('#concept-nav a[data-page="login"]').click();
 await expect(page.locator('#screen-login')).toBeVisible();
 await expect(page.locator('#platform-login-password')).toHaveValue('');
 expect(requests).toEqual([]);
 expect(errors).toEqual([]);
});
test('only actual Owner and Reviewer fixtures exist; Owner can create and edit draft',async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await signIn(page,'reviewer');
 
 await expect(page.locator('#screen-activation')).toBeVisible();
 await expect(page.locator('#concept-nav a[data-page="companies"]')).toBeHidden();
 await expect(page.locator('#concept-nav a[data-page="reviewer"]')).toBeHidden();
 await expect(page.locator('#demo-actor')).toHaveCount(0);
 await page.locator('#concept-nav a[data-page="login"]').click();
 await fillIdentity(page,'owner');
 await page.locator('#mock-login').click();
 
 await page.locator('#concept-nav a[data-page="companies"]').click();
 await expect(page.locator('#screen-companies')).toBeVisible();
 await page.locator('#new-company').click();
 await page.locator('#record-code').fill('smoke');
 await page.locator('#record-name').fill('Smoke Test');
 await page.locator('#record-form button[type="submit"]').click();
 await expect(page.locator('#companies-body')).toContainText('Smoke Test');
 await expect(page.locator('#company-detail')).toContainText('draft');
 await page.getByRole('button',{name:'Редактировать'}).click();
 await page.locator('#record-name').fill('Smoke Revised');
 await page.locator('#profile-legalName').fill('Smoke Revised Ltd.');
 await page.locator('#profile-countryCode').fill('GB');
 await page.locator('#record-form button[type="submit"]').click();
 await expect(page.locator('#company-detail')).toContainText('Smoke Revised Ltd.');
 expect(errors).toEqual([]);
});
test('reviewer activation flow after cancelling draft edit',async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await signIn(page);
 
 await page.locator('#concept-nav a[data-page="companies"]').click();
 await page.locator('#companies-body button').first().click();
 await page.getByRole('button',{name:'Редактировать',exact:true}).click();
 await page.locator('#record-name').fill('Cancelled edit');
 await page.locator('#cancel-record').click();
 await page.getByRole('button',{name:'Запросить активацию'}).click();
 await expect(page.locator('#company-dialog-notice')).toHaveClass(/vms-alert-warning/);
 await expect(page.locator('#company-dialog-notice')).toBeVisible();
 await expect(page.locator('#company-dialog-notice')).toHaveCSS('margin-top','12px');
 await expect(page.locator('#company-dialog-notice')).toContainText('Активация требует решения независимого Reviewer');
 await page.getByRole('button',{name:'Подтвердить запрос'}).click();
 await expect(page.locator('#company-dialog-notice')).toHaveClass('vms-alert');
 await expect(page.locator('#company-dialog-notice')).toContainText('Ожидается решение Reviewer');
 await page.locator('#company-dialog-close').click();
 await expect(page.locator('#feedback')).toContainText('requested');
 await page.locator('#concept-nav a[data-page="login"]').click();
 await fillIdentity(page,'reviewer');
 await page.locator('#mock-login').click();
 
 await page.locator('a[data-page="activation"]').click();
 await expect(page.locator('#activation-queue')).toContainText('North Shipping');
 await page.getByRole('button',{name:'Одобрить (mock)'}).click();
 await expect(page.locator('#review-decision-dialog')).toBeVisible();
 await page.locator('#review-decision-consent').check();
 await page.locator('#review-submit').click();
 await page.locator('[data-review-mode="approved"]').click();
 await expect(page.locator('#activation-queue')).toContainText('approved');
 expect(errors).toEqual([]);
});
test('mobile navigation remains reachable',async ({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto(url);
 await signIn(page);
 
 await page.locator('#burger').click();
 await expect(page.locator('#sidebar')).toHaveClass(/open/);
 await page.locator('a[data-page="contract"]').click();
 await expect(page.locator('#screen-contract')).toBeVisible();
 await expect(page.locator('#sidebar')).not.toHaveClass(/open/);
});


test('Reviewer invitation state and owner audit journal',async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await signIn(page,'owner');
 
 await page.locator('a[data-page="reviewer"]').click();
 await page.locator('#reviewer-email').fill('reviewer@example.test');
 await page.locator('#reviewer-login').fill('reviewer-demo');
 await page.locator('#invite-reviewer').click();
 await expect(page.locator('#reviewer-invitations')).toContainText('requested');
 await page.locator('#reviewer-existing-check').click();
 await expect(page.locator('#reviewer-selected-detail')).toContainText('requested');
 await expect(page.locator('#reviewer-selected-detail .vms-alert')).toHaveCount(0);
 await page.locator('#reviewer-selected-detail input[type="checkbox"]').check();
 await page.getByRole('button',{name:'Имитировать отправку приглашения'}).click();
 await expect(page.locator('#reviewer-invitations')).toContainText('queued');
 await page.locator('a[data-page="logs"]').click();
 await expect(page.locator('#log-body')).toContainText('company.created');
 await page.locator('#concept-nav a[data-page="login"]').click();
 await fillIdentity(page,'reviewer');
 await page.locator('#mock-login').click();
 
 await expect(page.locator('#screen-activation')).toBeVisible();
 await expect(page.locator('#concept-nav a[data-page="logs"]')).toBeHidden();
 expect(errors).toEqual([]);
});


test('VDMS Owner overview, C01 provisioning evidence and service monitor',async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await signIn(page,'owner');
 
 await page.locator('a[data-page="overview"]').click();
 await expect(page.locator('#overview-kpis')).toContainText('Компаний · загружено');
 await expect(page.locator('#overview-kpis')).toContainText('18');
 await page.locator('#overview-open-provisioning').click();
 await expect(page.locator('#screen-provisioning')).toBeVisible();
 await expect(page.locator('#provisioning-detail')).toContainText('routingEpoch');
 await expect(page.locator('#provisioning-detail')).toContainText('database.prepare');
 await page.locator('a[data-page="monitor"]').click();
 await page.locator('#monitor-refresh').click();
 await expect(page.locator('#monitor-services')).toContainText('C01 Provisioning Operator');
 await expect(page.locator('#monitor-summary')).toContainText('Отвечают');
 await page.locator('#monitor-scenario').selectOption('unavailable');
 await page.locator('#monitor-refresh').click();
 await expect(page.locator('#monitor-services')).toContainText('Недоступен');
 expect(errors).toEqual([]);
});
test('VDMS Owner email operator, lab-only SMTP and Reviewer separation',async ({page})=>{
 page.setDefaultTimeout(4500);
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await signIn(page,'owner','success','lab');
 await page.locator('a[data-page="email-operator"]').click();
 await expect(page.locator('#email-operator-status')).toContainText('configured');
 await page.locator('#email-template-subject').fill('Test email template');
 await page.locator('#email-template-save').click();
 await expect(page.locator('#email-template-revision')).toContainText('revision: 2');
 await page.locator('a[data-page="mail"]').click();
 await expect(page.locator('#mail-check')).toBeDisabled();
 await page.locator('#mail-lab').selectOption('on');
 await page.locator('#mail-action').selectOption('send');
 await page.locator('#mail-recipient').selectOption('owner');
 await page.locator('#mail-check').click();
 await expect(page.locator('#mail-result')).toContainText('status: failed');
 await page.locator('#concept-nav a[data-page="login"]').click();
 await fillIdentity(page,'reviewer');
 await page.locator('#mock-login').click();
 await expect(page.locator('#screen-activation')).toBeVisible();
 await expect(page.locator('#concept-nav a[data-page="overview"]')).toBeHidden();
 await expect(page.locator('#concept-nav a[data-page="email-operator"]')).toBeHidden();
 await expect(page.locator('#concept-nav a[data-page="monitor"]')).toBeHidden();
 await page.goto(url+'?fresh=1#overview');
 await expect(page.locator('#screen-login')).toBeVisible();
 await fillIdentity(page,'reviewer');
 await fillIdentity(page,(await page.locator('#platform-login-name').inputValue()).includes('reviewer')?'reviewer':'owner','lab');
 await page.locator('#mock-login').click();
 
 await expect(page.locator('#screen-activation')).toBeVisible();
 expect(errors).toEqual([]);
});
test('VDMS Reviewer decision history tabs are separated',async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await signIn(page,'owner');
 await page.locator('a[data-page="companies"]').click();
 await page.locator('#companies-body button').first().click();
 await page.getByRole('button',{name:'Запросить активацию'}).click();
 await page.getByRole('button',{name:'Подтвердить запрос'}).click();
 await page.locator('#company-dialog-close').click();
 await page.locator('#concept-nav a[data-page="login"]').click();
 await fillIdentity(page,'reviewer');
 await page.locator('#mock-login').click();
 await page.locator('a[data-page="activation"]').click();
 await expect(page.locator('#review-count')).toHaveText('1');
 await page.getByRole('button',{name:'Одобрить (mock)'}).click();
 await expect(page.locator('#review-decision-dialog')).toBeVisible();
 await page.locator('#review-decision-consent').check();
 await page.locator('#review-submit').click();
 await expect(page.locator('#review-count')).toHaveText('0');
 await page.locator('[data-review-mode="approved"]').click();
 await expect(page.locator('#activation-queue')).toContainText('North Shipping');
 await expect(page.locator('#activation-queue')).toContainText('approved');
 await page.locator('[data-review-mode="rejected"]').click();
 await expect(page.locator('#review-count')).toHaveText('0');
 expect(errors).toEqual([]);
});

test('Reviewer invitation existing request, SMTP uncertainty and owner confirmation',async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await signIn(page,'owner');
 await page.locator('a[data-page="reviewer"]').click();
 await page.locator('#reviewer-check-status').click();
 await expect(page.locator('#reviewer-status-summary')).toContainText('activeReviewers: 0');
 await page.locator('#reviewer-email').fill('another@example.test');
 await page.locator('#reviewer-login').fill('reviewer-another');
 await page.locator('#invite-reviewer').click();
 await page.locator('#reviewer-existing-check').click();
 await expect(page.locator('#reviewer-selected-detail')).toContainText('requested');
 await expect(page.locator('#reviewer-selected-detail .vms-alert')).toHaveCount(0);
 await page.locator('#reviewer-selected-detail input[type="checkbox"]').check();
 await page.getByRole('button',{name:'Имитировать отправку приглашения'}).click();
 await page.locator('#reviewer-existing-check').click();
 await expect(page.locator('#reviewer-selected-detail')).toContainText('очтовый ящик Reviewer');
 await page.locator('#reviewer-selected-detail input[type="checkbox"]').check();
 await page.getByRole('button',{name:'Имитировать повторную отправку'}).click();
 await page.locator('#reviewer-existing-check').click();
 await page.getByRole('button',{name:'Имитировать внешний Claim (без токена)'}).click();
 await page.locator('#reviewer-existing-check').click();
 await expect(page.locator('#reviewer-selected-detail')).toContainText('pending');
 await page.locator('#reviewer-selected-detail input[type="checkbox"]').check();
 await page.getByRole('button',{name:'Подтвердить Reviewer (mock)'}).click();
 await page.locator('#reviewer-existing-check').click();
 await expect(page.locator('#reviewer-selected-detail')).toContainText('confirmed');
 expect(errors).toEqual([]);
});

test('VDMS Reviewer rejection requires reason and records own rejection',async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await signIn(page,'owner');
 await page.locator('a[data-page="companies"]').click();
 await page.locator('#companies-body button').first().click();
 await page.getByRole('button',{name:'Запросить активацию'}).click();
 await page.getByRole('button',{name:'Подтвердить запрос'}).click();
 await page.locator('#company-dialog-close').click();
 await page.locator('#concept-nav a[data-page="login"]').click();
 await fillIdentity(page,'reviewer');
 await page.locator('#mock-login').click();
 await page.locator('a[data-page="activation"]').click();
 await page.getByRole('button',{name:'Отклонить (mock)'}).click();
 await expect(page.locator('#review-decision-dialog')).toBeVisible();
 await page.locator('#review-decision-consent').check();
 await page.locator('#review-submit').click();
 await expect(page.locator('#review-decision-error')).toContainText('причину отказа');
 await page.locator('#review-reason').fill('Missing compliance documents');
 await page.locator('#review-submit').click();
 await expect(page.locator('#review-decision-dialog')).not.toBeVisible();
 await page.locator('[data-review-mode="rejected"]').click();
 await expect(page.locator('#activation-queue')).toContainText('rejected');
 expect(errors).toEqual([]);
});

test('full overview separates Platform company counts and demo Tenant users/modules',async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await signIn(page,'owner');
 await page.locator('a[data-page="overview"]').click();
 await expect(page.locator('#screen-overview')).toBeVisible();
 await expect(page.locator('#overview-kpis .mp-card')).toHaveCount(6);
 await expect(page.locator('#overview-kpis')).toContainText('Компаний · загружено');
 await expect(page.locator('#overview-kpis')).toContainText('Tenant DB · общий инвентарь');
 await expect(page.locator('#overview-kpis')).toContainText('Не доступен');
 await expect(page.locator('#overview-companies-body tr')).toHaveCount(18);
 await expect(page.locator('label[for="overview-load-demo"]')).toHaveText('Восстановить демонстрационный набор');
 await expect(page.locator('#overview-load-demo')).toHaveText('Загрузить 18 демо-компаний');
 await expect(page.locator('#overview-company-statuses')).toContainText('draft · 5');
 await expect(page.locator('#overview-tenant-body')).toContainText('captain.demo');
 await expect(page.locator('#overview-tenant-kpis')).toContainText('Всего (демо): 3');
 await page.locator('#overview-tenant-kind').selectOption('modules');
 await expect(page.locator('#overview-tenant-body')).toContainText('Documents (пример)');
 await page.locator('#overview-tenant-select').selectOption({label:'Blue Logistics (demo) · blue'});
 await expect(page.locator('#overview-tenant-kpis')).toContainText('Модулей в фикстуре: 2');
 await page.locator('#overview-tenant-kind').selectOption('users');
 await page.locator('#overview-tenant-select').selectOption({label:'South Transport (demo) · south'});
 await expect(page.locator('#overview-tenant-kpis')).toContainText('Пользователей в этой тестовой компании нет');
 await expect(page.locator('#overview-databases-body')).toContainText('Не проверено');
 await expect(page.locator('#overview-databases-body')).toContainText('Требуется C01 проверка');
 await page.locator('#overview-companies-body tr').last().getByRole('button',{name:'Открыть'}).click();
 await expect(page.locator('#screen-companies')).toBeVisible();
 await expect(page.locator('#company-dialog')).toBeVisible();
 await expect(page.locator('#company-dialog-title')).toContainText('Tidewater Solutions');
 await page.locator('#company-dialog-close').click();
 await expect(page.locator('#company-range')).toHaveText('Показано 8 из 18');
 await expect(page.locator('#company-page')).toHaveText('2 / 2');
 expect(errors).toEqual([]);
});
test('overview protects tenant preview and remains accessible on mobile',async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await signIn(page,'reviewer');
 await expect(page.locator('#screen-activation')).toBeVisible();
 await expect(page.locator('#concept-nav a[data-page="overview"]')).toBeHidden();
 await page.locator('#concept-nav a[data-page="login"]').click();
 await fillIdentity(page,'owner');
 await page.locator('#mock-login').click();
 await page.locator('a[data-page="overview"]').click();
 await expect(page.locator('#overview-companies-body tr')).toHaveCount(18);
 await expect(page.locator('#overview-open-provisioning')).toBeEnabled();
 await page.setViewportSize({width:390,height:844});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
 expect(overflow).toBe(false);
 await expect(page.locator('#overview-tenant-body tr:first-child td[data-label="Логин"]')).toBeVisible();
 expect(errors).toEqual([]);
});


test('overview toggles empty and demo fixtures across linked screens',async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await signIn(page,'owner');
 
 await page.locator('a[data-page="overview"]').click();
 await expect(page.locator('#overview-companies-body tr')).toHaveCount(18);
 await expect(page.locator('#overview-tenant-body')).toContainText('captain.demo');
 await page.locator('#overview-data-mode').selectOption('empty');
 await expect(page.locator('#overview-mode-label')).toHaveText('Пустое состояние');
 await expect(page.locator('#overview-kpis')).toContainText('Компаний · загружено0');
 await expect(page.locator('#overview-kpis')).toContainText('Пользователи · Tenant demo0');
 await expect(page.locator('#overview-companies-body')).toContainText('Компаний пока нет');
 await expect(page.locator('#overview-tenant-kpis')).toContainText('пользователи и модули не загружены');
 await expect(page.locator('#overview-databases-body')).toContainText('Нет записей Tenant DB');
 await page.locator('#overview-open-companies').click();
 await expect(page.locator('#companies-body')).toContainText('Компаний пока нет');
 await page.locator('a[data-page="provisioning"]').click();
 await expect(page.locator('#provisioning-list')).toContainText('Компаний в provisioning среди загруженных нет');
 await page.locator('a[data-page="overview"]').click();
 await page.locator('#overview-data-mode').selectOption('demo');
 await expect(page.locator('#overview-companies-body tr')).toHaveCount(18);
 await expect(page.locator('#overview-tenant-body')).toContainText('captain.demo');
 await expect(page.locator('#overview-databases-body')).toContainText('Требуется C01 проверка');
 expect(errors).toEqual([]);
});
test('empty overview supports creating a draft and resets it on fixture mode switch',async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await signIn(page,'owner');
 
 await page.locator('a[data-page="overview"]').click();
 await page.locator('#overview-data-mode').selectOption('empty');
 await page.locator('#overview-open-companies').click();
 await page.locator('#new-company').click();
 await page.locator('#record-code').fill('new-demo');
 await page.locator('#record-name').fill('New Demo Company');
 await page.locator('#record-form button[type="submit"]').click();
 await expect(page.locator('#companies-body')).toContainText('New Demo Company');
 await page.locator('#company-dialog-close').click();
 await page.locator('a[data-page="overview"]').click();
 await expect(page.locator('#overview-kpis')).toContainText('Компаний · загружено1');
 await expect(page.locator('#overview-tenant-kpis')).toContainText('нет Tenant-фикстур');
 await page.locator('#overview-data-mode').selectOption('demo');
 await expect(page.locator('#overview-companies-body')).not.toContainText('New Demo Company');
 await expect(page.locator('#overview-companies-body tr')).toHaveCount(18);
 await page.locator('#overview-data-mode').selectOption('empty');
 await expect(page.locator('#overview-companies-body')).toContainText('Компаний пока нет');
 expect(errors).toEqual([]);
});
test('demo tenant company selection covers varied user and module empty states',async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await signIn(page,'owner');
 await page.locator('a[data-page="overview"]').click();
 await page.locator('#overview-tenant-select').selectOption({label:'Harbor Engineering (demo) · harbor'});
 await expect(page.locator('#overview-tenant-body')).toContainText('engineer.demo');
 await expect(page.locator('#overview-tenant-kpis')).toContainText('Всего (демо): 4');
 await page.locator('#overview-tenant-kind').selectOption('modules');
 await expect(page.locator('#overview-tenant-body')).toContainText('Maintenance (пример)');
 await page.locator('#overview-tenant-select').selectOption({label:'Delta Offshore (demo) · delta'});
 await expect(page.locator('#overview-tenant-kpis')).toContainText('не назначено модулей');
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2)).toBe(false);
 expect(errors).toEqual([]);
});


test('VDMS role navigation and feature flags are enforced on real routes',async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await signIn(page,'owner','success','standard');
 
 await expect(page.locator('#screen-overview')).toBeVisible();
 await expect(page.locator('#concept-nav a[data-page="activation"]')).toBeHidden();
 await expect(page.locator('#concept-nav a[data-page="mail"]')).toBeHidden();
 await expect(page.locator('#concept-nav a[data-page="p4"]')).toBeHidden();
 await page.locator('#concept-nav a[data-page="reviewer"]').click();
 await expect(page.locator('#screen-reviewer')).toBeVisible();
 await page.locator('#concept-nav a[data-page="login"]').click();
 await fillIdentity(page,'reviewer');
 await fillIdentity(page,(await page.locator('#platform-login-name').inputValue()).includes('reviewer')?'reviewer':'owner','standard');
 await page.locator('#mock-login').click();
 await expect(page.locator('#screen-activation')).toBeVisible();
 await expect(page.locator('#concept-nav a[data-page="companies"]')).toBeHidden();
 await expect(page.locator('#concept-nav a[data-page="logs"]')).toBeHidden();
 await page.locator('#review-seed-demo').click();
 await expect(page.locator('#review-count')).toHaveText('2');
 await expect(page.locator('#activation-queue')).toContainText('North Shipping');
 await expect(page.locator('#activation-queue').getByRole('button',{name:'Одобрить (mock)'})).toHaveCount(0);
 await expect(page.locator('#review-approval-text')).toContainText('выключены серверным флагом');
 expect(errors).toEqual([]);
});
test('linked Owner draft requests are visible to Reviewer and history stays personal',async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await signIn(page,'owner','success','restricted');
 await page.locator('#concept-nav a[data-page="companies"]').click();
 await page.locator('#companies-body button').first().click();
 await page.getByRole('button',{name:'Запросить активацию'}).click();
 await page.getByRole('button',{name:'Подтвердить запрос'}).click();
 await page.locator('#company-dialog-close').click();
 await page.locator('#concept-nav a[data-page="login"]').click();
 await fillIdentity(page,'reviewer');
 await page.locator('#mock-login').click();
 await expect(page.locator('#screen-activation')).toBeVisible();
 await expect(page.locator('#review-count')).toHaveText('1');
 await page.getByRole('button',{name:'Одобрить (mock)'}).click();
 await page.locator('#review-decision-consent').check();
 await page.locator('#review-submit').click();
 await expect(page.locator('#review-count')).toHaveText('0');
 await page.locator('[data-review-mode="approved"]').click();
 await expect(page.locator('#review-count')).toHaveText('1');
 await expect(page.locator('#activation-queue')).toContainText('North Shipping');
 await page.locator('#concept-nav a[data-page="login"]').click();
 await fillIdentity(page,'owner');
 await page.locator('#mock-login').click();
 await page.locator('#concept-nav a[data-page="companies"]').click();
 await page.locator('#companies-body button').first().click();
 await expect(page.locator('#company-detail')).toContainText('draft');
 await expect(page.locator('#concept-nav a[data-page="activation"]')).toBeHidden();
 expect(errors).toEqual([]);
});
test('LAB-only route toggles and active Reviewer permissions are independent',async ({page})=>{
 await signIn(page,'owner','success','lab');
 
 await expect(page.locator('#concept-nav a[data-page="mail"]')).toBeVisible();
 await expect(page.locator('#screen-companies')).toBeHidden();
 
 await expect(page.locator('#concept-nav a[data-page="p4"]')).toBeVisible();
 await page.locator('#concept-nav a[data-page="p4"]').click();
 await expect(page.locator('#screen-p4')).toBeVisible();
 await expect(page.locator('#screen-p4')).toContainText('Не проверено');
 await page.locator('#concept-nav a[data-page="login"]').click();
 await fillIdentity(page,'reviewer');
 await page.locator('#mock-login').click();
 await expect(page.locator('#concept-nav a[data-page="p4"]')).toBeHidden();
 await expect(page.locator('#concept-nav a[data-page="mail"]')).toBeHidden();
});

test('company list follows catalog pagination with ten rows per page',async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await signIn(page,'owner');
 await page.locator('#concept-nav a[data-page="companies"]').click();
 const rows=page.locator('#companies-body tr'),prev=page.locator('#company-prev'),next=page.locator('#company-next'),counter=page.locator('#company-page');
 await expect(rows).toHaveCount(10);await expect(counter).toHaveText('1 / 2');await expect(prev).toBeDisabled();
 await next.click();await expect(counter).toHaveText('2 / 2');await expect(rows).toHaveCount(8);await expect(next).toBeDisabled();
 await expect(page.locator('#companies-body')).not.toContainText('North Shipping');
 await prev.click();await expect(rows).toHaveCount(10);
 await page.locator('#company-status').selectOption('draft');await expect(counter).toHaveText('1 / 1');await expect(rows).toHaveCount(5);await expect(next).toBeDisabled();
 await page.locator('#company-status').selectOption('all');await next.click();
 await page.locator('#company-search').fill('harbor');await expect(counter).toHaveText('1 / 1');await expect(rows).toHaveCount(1);
 await expect(prev).toBeDisabled();await expect(next).toBeDisabled();
 await page.locator('#company-search').fill('');await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2)).toBe(false);expect(errors).toEqual([]);
});
test('company list empty state does not offer additional entries',async ({page})=>{
 await signIn(page,'owner');
 await page.locator('#overview-data-mode').selectOption('empty');
 await page.locator('#overview-open-companies').click();
 await expect(page.locator('#company-range')).toHaveText('Компаний: 0');
 await expect(page.locator('#companies-body')).toContainText('Компаний пока нет');
 await expect(page.locator('#company-next')).toBeDisabled();
 await expect(page.locator('#company-prev')).toBeDisabled();
});
test('audit log uses canonical Data Table and ten-record pages',async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));await signIn(page,'owner');await page.locator('#concept-nav a[data-page="logs"]').click();
 const rows=page.locator('#log-body tr'),next=page.locator('#log-next'),prev=page.locator('#log-prev');
 await expect(page.locator('#log-table .data-table')).toBeVisible();await expect(rows).toHaveCount(10);await expect(page.locator('#log-page')).toHaveText('1 / 2');await expect(prev).toBeDisabled();
 await next.click();await expect(rows).toHaveCount(6);await expect(page.locator('#log-page')).toHaveText('2 / 2');await expect(next).toBeDisabled();
 await prev.click();await expect(rows).toHaveCount(10);await page.locator('#log-category').selectOption('auth');await expect(rows).toHaveCount(5);await expect(page.locator('#log-range')).toHaveText('Показано 5 из 5');
 await page.locator('#log-category').selectOption('all');await page.locator('[data-log-sort="at"]').click();await expect(rows.first()).toContainText('2026-11-22T07:30:00Z');
 await page.setViewportSize({width:390,height:844});await expect(page.locator('#log-mobile-sort')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2)).toBe(false);expect(errors).toEqual([]);
});
test('Owner home is overview, Reviewer home is activation, explicit Company deep links remain intact',async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await signIn(page,'owner');
 await expect(page.locator('#screen-overview')).toBeVisible();
 await expect(page.locator('#overview-companies-body tr')).toHaveCount(18);
 await expect(page.locator('#concept-nav a[data-page="overview"]')).toHaveAttribute('aria-current','page');
 await page.locator('#concept-nav a[data-page="companies"]').click();
 await expect(page.locator('#screen-companies')).toBeVisible();
 await page.locator('#concept-nav a[data-page="login"]').click();
 await fillIdentity(page,'reviewer');
 await page.locator('#mock-login').click();
 
 await expect(page.locator('#screen-activation')).toBeVisible();
 expect(errors).toEqual([]);
});
test('direct Company route still opens Companies after Owner mock login',async ({page})=>{
 await page.goto(url+'#companies');
 await expect(page.locator('#screen-login')).toBeVisible();
 await fillIdentity(page,'owner');
 await page.locator('#mock-login').click();
 
 await expect(page.locator('#screen-companies')).toBeVisible();
 await expect(page.locator('#company-range')).toHaveText('Показано 10 из 18');
});

test('company search finds unloaded rows by name, code, UUID and profile and resets',async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await signIn(page,'owner');
 await page.locator('#concept-nav a[data-page="companies"]').click();
 await expect(page.locator('#companies-body tr')).toHaveCount(10);
 await page.locator('#company-search').fill('polar');
 await expect(page.locator('#company-filter-summary')).toContainText('Найдено: 1');
 await expect(page.locator('#companies-body tr')).toHaveCount(1);
 await expect(page.locator('#companies-body')).toContainText('Polar Research');
 await page.locator('#company-search').fill('harbor tech');
 await expect(page.locator('#companies-body')).toContainText('Harbor Engineering');
 await page.locator('#company-search').fill('8f6e-d9dd7b29c808');
 await expect(page.locator('#companies-body')).toContainText('Polar Research');
 await page.locator('#company-search').fill('no-such-company');
 await expect(page.locator('#companies-body')).toContainText('Нет компаний с такими параметрами поиска');
 await expect(page.locator('#company-next')).toBeDisabled();
 await expect(page.locator('#company-prev')).toBeDisabled();
 await page.locator('#company-reset').click();
 await expect(page.locator('#company-search')).toHaveValue('');
 await expect(page.locator('#company-filter-summary')).toContainText('Все загруженные компании: 18');
 await expect(page.locator('#companies-body tr')).toHaveCount(10);
 await page.locator('#company-status').selectOption('draft');
 await page.locator('#company-search').fill('north');
 await expect(page.locator('#companies-body tr')).toHaveCount(1);
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2)).toBe(false);
 expect(errors).toEqual([]);
});
test('audit date range, hours, search and pagination interact without duplicates',async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await signIn(page,'owner');
 await page.locator('#concept-nav a[data-page="logs"]').click();
 await page.locator('#log-date-from').fill('2026-11-22');
 await page.locator('#log-date-to').fill('2026-11-22');
 await expect(page.locator('#log-range')).toHaveText('Показано 10 из 13');
 await page.locator('#log-time-from').fill('10:00');
 await page.locator('#log-time-to').fill('12:00');
 await expect(page.locator('#log-range')).toHaveText('Показано 5 из 5');
 await expect(page.locator('#log-body')).toContainText('harbor');
 await expect(page.locator('#log-body')).not.toContainText('fixture-reviewer');
 await page.locator('#log-search').fill('company');
 await expect(page.locator('#log-range')).toHaveText('Показано 3 из 3');
 await page.locator('#log-search').fill('missing');
 await expect(page.locator('#log-body')).toContainText('Нет событий по выбранным условиям');
 await expect(page.locator('#log-next')).toBeDisabled();
 await page.locator('#log-reset').click();
 await expect(page.locator('#log-date-from')).toHaveValue('');
 await expect(page.locator('#log-time-to')).toHaveValue('');
 await expect(page.locator('#log-range')).toHaveText('Показано 10 из 16');
 await page.locator('#log-next').click();
 await expect(page.locator('#log-body tr')).toHaveCount(6);
 await page.locator('#log-date-from').fill('2026-11-23');
 await expect(page.locator('#log-range')).toHaveText('Показано 3 из 3');
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2)).toBe(false);
 expect(errors).toEqual([]);
});
test('audit invalid UTC date/time ranges are explicit and recoverable',async ({page})=>{
 await signIn(page,'owner');
 await page.locator('#concept-nav a[data-page="logs"]').click();
 await page.locator('#log-date-from').fill('2026-11-23');
 await page.locator('#log-date-to').fill('2026-11-22');
 await expect(page.locator('#log-filter-error')).toContainText('Начальная дата позже конечной');
 await expect(page.locator('#log-next')).toBeDisabled();
 await page.locator('#log-reset').click();
 await page.locator('#log-time-from').fill('18:00');
 await page.locator('#log-time-to').fill('08:00');
 await expect(page.locator('#log-filter-error')).toContainText('Начальное время позже конечного');
 await page.locator('#log-time-to').fill('19:00');
 await expect(page.locator('#log-filter-error')).toHaveText('');
 await expect(page.locator('#log-range')).toHaveText('Записей: 0');
});


test('18 demo companies have unique VDMS codes, lifecycle variety and linked Tenant fixtures',async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await signIn(page,'owner');
 await expect(page.locator('#overview-companies-body tr')).toHaveCount(18);
 await expect(page.locator('#overview-company-statuses')).toContainText('active · 7');
 await expect(page.locator('#overview-company-statuses')).toContainText('draft · 5');
 await expect(page.locator('#overview-company-statuses')).toContainText('provisioning · 2');
 await expect(page.locator('#overview-company-statuses')).toContainText('suspended · 2');
 await expect(page.locator('#overview-company-statuses')).toContainText('disabled · 2');
 await page.locator('#overview-tenant-select').selectOption({label:'Atlas Marine (demo) · atlas'});
 await expect(page.locator('#overview-tenant-body')).toContainText('fleet.demo');
 await expect(page.locator('#overview-tenant-kpis')).toContainText('Всего (демо): 3');
 await page.locator('#overview-tenant-kind').selectOption('modules');
 await expect(page.locator('#overview-tenant-body')).toContainText('Fleet (пример)');
 await page.locator('#overview-tenant-select').selectOption({label:'Aurora Data (demo) · aurora'});
 await expect(page.locator('#overview-tenant-kpis')).toContainText('не назначено модулей');
 await page.locator('#overview-tenant-select').selectOption({label:'Vector Services (demo) · vector'});
 await expect(page.locator('#overview-tenant-body')).toContainText('Analytics (пример)');
 await page.locator('#overview-tenant-select').selectOption({label:'Seabird Foods (demo) · seabird'});
 await page.locator('#overview-tenant-kind').selectOption('users');
 await expect(page.locator('#overview-tenant-kpis')).toContainText('Пользователей в этой тестовой компании нет');
 await page.locator('#overview-open-companies').click();
 await page.locator('#company-search').fill('Meridian Energy');
 await expect(page.locator('#companies-body')).toContainText('Meridian Energy');
 await page.locator('#company-search').fill('Nimbus Robotics');
 await expect(page.locator('#companies-body')).toContainText('Nimbus Robotics');
 expect(errors).toEqual([]);
});
test('audit footer controls match companies position under their tables and mobile behavior',async ({page})=>{
 await signIn(page,'owner');
 await page.locator('#concept-nav a[data-page="companies"]').click();
 const companyFooter=page.locator('#screen-companies .table-footer');
 await expect(companyFooter.locator('#company-range')).toBeVisible();
 await expect(companyFooter.locator('#company-prev')).toBeVisible();
 await expect(companyFooter.locator('#company-page')).toBeVisible();
 await expect(companyFooter.locator('#company-next')).toBeVisible();
 const companyTable=page.locator('#screen-companies .table-scroll');
 const companyPositions=await page.evaluate(()=>{
  const footer=document.querySelector('#screen-companies .table-footer');
  const table=document.querySelector('#screen-companies .table-scroll');
  return {below:footer.getBoundingClientRect().top>=table.getBoundingClientRect().bottom};
 });
 expect(companyPositions.below).toBe(true);
 await page.locator('#concept-nav a[data-page="logs"]').click();
 const footer=page.locator('#screen-logs .table-footer');
 await expect(footer.locator('#log-range')).toBeVisible();
 await expect(footer.locator('#log-prev')).toBeVisible();
 await expect(footer.locator('#log-page')).toBeVisible();
 await expect(footer.locator('#log-next')).toBeVisible();
 const positions=await page.evaluate(()=>{
  const footer=document.querySelector('#screen-logs .table-footer');
  const table=document.querySelector('#screen-logs .table-scroll');
  return {below:footer.getBoundingClientRect().top>=table.getBoundingClientRect().bottom};
 });
 expect(positions.below).toBe(true);
 await expect(page.locator('#log-body tr')).toHaveCount(10);
 await page.locator('#log-next').click();
 await expect(page.locator('#log-body tr')).toHaveCount(6);
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2)).toBe(false);
});


test('Companies adopts catalog Data Table controls and responsive rows',async ({page})=>{
 await page.goto(url+'#companies');
 await page.locator('#platform-login-name').fill('owner.demo');
 await page.locator('#platform-login-password').fill('demo-only');
 await page.locator('#platform-login-totp').fill('000000');
 await page.locator('#mock-login').click();
 const table=page.locator('#screen-companies .data-table');
 await expect(table).toBeVisible();
 await expect(table.locator('input[type=checkbox]')).toHaveCount(0);
 await expect(table.locator('thead th')).toHaveCount(5);
 await expect(table.locator('tbody .table-status-pill')).toHaveCount(10);
 await page.locator('[data-company-sort="name"]').click();
 await expect(page.locator('[data-company-sort="name"]')).toHaveAttribute('aria-pressed','true');
 await expect(table.locator('tbody tr:first-child td[data-label="Компания"]')).toContainText('Atlas Marine');
 await page.locator('#company-search').fill('harbor');
 await expect(table.locator('tbody tr')).toHaveCount(1);
 await table.getByRole('button',{name:'Открыть'}).click();
 await expect(page.locator('#company-dialog')).toBeVisible();
 await expect(page.locator('#company-dialog-title')).toContainText('Harbor Engineering');
 await expect(page.locator('#company-dialog-actions button')).toHaveCount(0);
 await expect(page.locator('#company-dialog').getByRole('button',{name:'Закрыть'})).toBeVisible();
 await expect(page.locator('#company-dialog')).toHaveClass(/vms-dialog/);
 await page.keyboard.press('Escape');
 await expect(page.locator('#company-dialog')).not.toBeVisible();
 await page.setViewportSize({width:390,height:844});
 await table.getByRole('button',{name:'Открыть'}).click();
 await expect(page.locator('#company-dialog')).toBeVisible();
 expect(await page.locator('#company-dialog').evaluate(el=>el.getBoundingClientRect().width<=window.innerWidth)).toBe(true);
 await page.locator('#company-dialog-close').click();
 await expect(page.locator('#company-mobile-sort')).toBeVisible();
 await expect(table.locator('thead')).toBeHidden();
});


test('Tenant overview uses canonical Data Table and alerts without selection controls',async ({page})=>{
 await signIn(page,'owner');
 const table=page.locator('#overview-tenant-table .data-table');await expect(table).toBeVisible();await expect(table.locator('tbody tr')).toHaveCount(3);await expect(table.locator('input[type=checkbox]')).toHaveCount(0);
 await expect(table.locator('.table-status-pill')).toHaveCount(3);
 await page.locator('#tenant-table-search').fill('captain');await expect(table.locator('tbody tr')).toHaveCount(1);await expect(table).toContainText('captain.demo');
 await page.locator('#tenant-table-search').fill('');await page.locator('#tenant-table-status').selectOption('disabled');await expect(table.locator('tbody tr')).toHaveCount(1);await expect(table).toContainText('auditor.demo');
 await page.locator('#overview-tenant-kind').selectOption('modules');await expect(table.locator('tbody tr')).toHaveCount(3);
 await page.locator('#overview-tenant-select').selectOption({label:'South Transport (demo) · south'});await expect(page.locator('#overview-tenant-kpis .vms-alert')).toBeVisible();
 await expect(page.locator('#screen-overview .mp-info-strip')).toHaveCount(0);
});
