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
 await expect(page).toHaveURL(/\/modules\/platform\/contract-demo\/index\.html#reviewer$/);
 await expect(page.locator('#screen-reviewer')).toBeVisible();
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
 expect(await page.locator('link[href*="concept.css"]').count()).toBe(0);
});
