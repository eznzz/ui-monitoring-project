const { test, expect } = require('@playwright/test');
test('preview landing links and theme work', async ({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(String(error)));
 await page.goto('http://127.0.0.1:8765/preview/');
 await expect(page).toHaveTitle('Monitoring Project — UI Preview');
 await expect(page.getByRole('heading',{name:'Интерактивное демо интерфейса'})).toBeVisible();
 await expect(page.locator('[data-preview="platform"]')).toHaveAttribute('href','../modules/platform/contract-demo/index.html#login');
 await page.locator('#theme').click();
 await expect(page.locator('body')).toHaveClass(/dark/);
 await page.locator('[data-preview="reviewer"]').click();
 await expect(page).toHaveURL(/\/modules\/platform\/contract-demo\/index\.html#reviewer$/);
 await expect(page.locator('#screen-reviewer')).toBeVisible();
 expect(errors).toEqual([]);
});
