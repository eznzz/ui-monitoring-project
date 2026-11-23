const { test, expect } = require('@playwright/test');
test('preview landing links and theme work', async ({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(String(error)));
 await page.goto('http://127.0.0.1:8765/preview/');
 await expect(page).toHaveTitle('Monitoring Project — UI Preview');
 await expect(page.getByRole('heading',{name:'Интерактивное демо интерфейса'})).toBeVisible();
 await expect(page.locator('[data-preview="platform"]')).toHaveAttribute('href','../modules/platform/contract-demo/index.html#login');
 await page.locator('#userTrigger').click();
 await page.locator('#themeToggle').click();
 await expect(page.locator('body')).toHaveClass(/dark/);
 await page.locator('[data-preview="reviewer"]').click();
 await expect(page).toHaveURL(/\/modules\/platform\/contract-demo\/index\.html#login$/);
 await expect(page.locator('#screen-login')).toBeVisible();
 await expect(page.locator('#session-panel')).toContainText('Активация');
 await page.locator('#demo-actor').selectOption('reviewer');
 await page.locator('#mock-login').click();
 await page.locator('#open-platform').click();
 await expect(page.locator('#screen-activation')).toBeVisible();
 expect(errors).toEqual([]);
});

test('design-system markup is canonical on Platform and Login',async ({page})=>{
 await page.goto('http://127.0.0.1:8765/modules/platform/contract-demo/index.html#login');
 await expect(page.locator('#screen-login')).toHaveClass(/mp-login--split/);
 await expect(page.locator('.mp-login-form-card')).toBeVisible();
 await page.locator('#demo-actor').selectOption('owner');
 await page.locator('#mock-login').click();
 await page.locator('#open-platform').click();
 await expect(page.locator('.app.mp-template-app')).toBeVisible();
 await expect(page.locator('#sidebar .sidebar__nav')).toBeVisible();
 await expect(page.locator('#userMenu .user-menu__trigger')).toBeVisible();
 await expect(page.locator('#screen-companies')).toHaveClass(/mp-card/);
 await expect(page.locator('#screen-companies .mp-basic-table')).toBeVisible();
 await expect(page.locator('#companies-body tr:first-child td[data-label="Компания"]')).toHaveCount(1);
 expect(await page.locator('link[href*="concept.css"]').count()).toBe(0);
});


test('API rules have canonical inset on desktop and mobile',async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:8765/modules/platform/contract-demo/index.html#login');
 await page.locator('#demo-actor').selectOption('owner');
 await page.locator('#mock-login').click();
 await page.locator('#open-platform').click();
 await page.locator('#concept-nav a[data-page="contract"]').click();
 const card=page.locator('#screen-contract');
 await expect(card).toBeVisible();
 await expect(card.locator('.mp-info-strip')).toHaveCount(6);
 async function assertInset(){
  const result=await card.evaluate(el=>{
   const bounds=el.getBoundingClientRect();
   const child=el.querySelector('.mp-info-strip');
   const rect=child.getBoundingClientRect();
   const p=child.querySelector('p').getBoundingClientRect();
   return {left:rect.left-bounds.left, inner:p.left-rect.left,right:bounds.right-rect.right};
  });
  expect(result.left).toBeGreaterThan(10);
  expect(result.inner).toBeGreaterThan(15);
  expect(result.right).toBeGreaterThan(10);
 }
 await assertInset();
 await page.setViewportSize({width:390,height:844});
 await assertInset();
 expect(errors).toEqual([]);
});

test('Preview deep link to overview opens contextual login and visible companies', async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:8765/preview/');
 await page.getByRole('link',{name:/Обзор Owner/}).click();
 await expect(page.locator('#screen-login')).toBeVisible();
 await expect(page.locator('#session-panel')).toContainText('Обзор платформы');
 await expect(page.locator('#open-platform')).toContainText('Обзор платформы');
 await page.locator('#demo-actor').selectOption('owner');
 await page.locator('#mock-login').click();
 await page.locator('#open-platform').click();
 await expect(page.locator('#screen-overview')).toBeVisible();
 await expect(page.locator('#overview-data-mode')).toHaveValue('demo');
 await expect(page.locator('#overview-companies-body tr:visible')).toHaveCount(8);
 await expect(page.locator('#overview-companies-body')).toContainText('North Shipping');
 await expect(page.locator('#overview-companies-body')).toContainText('Polar Research');
 await expect(page.locator('#overview-tenant-body tr:visible')).toHaveCount(3);
 expect(errors).toEqual([]);
});
test('direct overview link never implies authorization before demo login', async ({page})=>{
 await page.goto('http://127.0.0.1:8765/modules/platform/contract-demo/index.html#overview');
 await expect(page.locator('#screen-login')).toBeVisible();
 await expect(page.locator('#screen-overview')).toBeHidden();
 await page.locator('#open-platform').click();
 await expect(page.locator('#feedback')).toContainText('Сначала выполните демонстрационный вход');
 await page.locator('#mock-login').click();
 await page.locator('#open-platform').click();
 await expect(page.locator('#overview-companies-body tr:visible')).toHaveCount(8);
 await page.locator('#overview-data-mode').selectOption('empty');
 await expect(page.locator('#overview-companies-body')).toContainText('Компаний пока нет');
 await page.locator('#overview-load-demo').click();
 await expect(page.locator('#overview-data-mode')).toHaveValue('demo');
 await expect(page.locator('#overview-companies-body tr:visible')).toHaveCount(8);
 await page.locator('#overview-load-demo').click();
 await expect(page.locator('#overview-companies-body tr:visible')).toHaveCount(8);
});

test('Preview has only the VDMS Owner and independent Reviewer entry points',async ({page})=>{
 await page.goto('http://127.0.0.1:8765/preview/');
 await expect(page.locator('.mp-dashboard-grid .mp-dashboard-tile')).toHaveCount(4);
 await expect(page.locator('[data-preview="reviewer"]')).toHaveAttribute('href','../modules/platform/contract-demo/index.html#activation');
 await expect(page.getByRole('link',{name:/Обзор Owner/})).toHaveCount(1);
 await expect(page.getByText('Platform Reader',{exact:true})).toHaveCount(0);
});
