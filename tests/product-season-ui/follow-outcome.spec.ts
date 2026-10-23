import {test,expect,type Page} from '@playwright/test';
import {setup,cards} from './season-helpers.ts';
// 0.49.1 (ADR-096 Q3 fix): the per-user status decides, and the page says what the write actually did.
async function season(page:Page){await page.locator('[data-focus-id=nav-catalog]').click();await page.locator('[data-focus-id=following-tab-bangumi]').click();await cards(page).first().click();}
const status=(page:Page)=>page.locator('.tv-season-page [role=status]');
test('Q3 fix: opening the page reads the per-user status, and a confirmed write reads back in that shape',async({page})=>{
 const f=await setup(page,true);f.mode('status');await season(page);const toggle=page.locator('[data-focus-id=season-follow]');
 await expect(toggle).toHaveText('已追番 ✓');expect(f.reads()).toBeGreaterThan(0);
 await toggle.click();await expect(toggle).toHaveText('追番');await expect(status(page)).toHaveText('已取消追番');expect(f.writes()).toBe(1);expect(f.errors).toEqual([]);
});
test('Q3 fix: a write B站 rejects says so with its code and never claims the opposite',async({page})=>{
 const f=await setup(page,true);f.mode('status');await season(page);const toggle=page.locator('[data-focus-id=season-follow]');await expect(toggle).toHaveText('已追番 ✓');
 f.mode('reject');await toggle.click();await expect(status(page)).toContainText('B站拒绝了这次取消追番（代码 -111）');await expect(toggle).toHaveText('已追番 ✓');expect(f.writes()).toBe(1);expect(f.errors).toEqual([]);
});
test('Q3 fix: an accepted write whose read-back has not changed is not shown as done; the next press only queries',async({page})=>{
 const f=await setup(page,true);f.mode('status');await season(page);const toggle=page.locator('[data-focus-id=season-follow]');await expect(toggle).toHaveText('已追番 ✓');
 f.mode('stale');await toggle.click();await expect(status(page)).toContainText('B站已受理取消追番，但回读的状态仍为已追番');await expect(toggle).toHaveText('查询追番状态');
 f.mode('status');await toggle.click();await expect(toggle).toHaveText('已追番 ✓');expect(f.writes()).toBe(1);expect(f.errors).toEqual([]);
});
