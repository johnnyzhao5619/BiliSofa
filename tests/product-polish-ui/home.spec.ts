import {test,expect} from '@playwright/test';
import {setup} from '../w04-media-ui/fixture.ts';
test('ADR-091 home opens on shelves with play counts; a failed row is isolated with its own retry; Down keeps the nearest column',async({page})=>{
 const errors=await setup(page,false);const first=page.locator('[data-focus-id^=shelf-popular-]').first();await expect(first).toBeFocused();
 await expect(first).toContainText('播放');await expect(page.locator('.tv-grid')).toBeHidden();
 await expect(page.locator('[data-focus-id=shelf-retry-ranking]')).toBeVisible();await expect(page.locator('[data-focus-id^=shelf-popular-]')).toHaveCount(8);
 await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowDown');await expect(page.locator('[data-focus-id=shelf-more-ranking]')).toBeFocused();
 await page.keyboard.press('ArrowLeft');await expect(page.locator('[data-focus-id=shelf-retry-ranking]')).toBeFocused();expect(errors).toEqual([]);
});
test('ADR-091 查看更多 opens the full grid on its first card and Back returns to the shelf',async({page})=>{
 const errors=await setup(page,false);await expect(page.locator('[data-focus-id^=shelf-popular-]').first()).toBeFocused();
 await page.locator('[data-focus-id=shelf-more-popular]').click();await expect(page.locator('.tv-grid')).toBeVisible();await expect(page.locator('.tv-grid .tv-card').first()).toBeFocused();await expect(page.locator('.tv-shelves')).toBeHidden();
 await page.keyboard.press('Escape');await expect(page.locator('[data-focus-id=shelf-more-popular]')).toBeFocused();await expect(page.locator('.tv-grid')).toBeHidden();expect(errors).toEqual([]);
});
test('ADR-091 a focused card lifts, except when reduced motion is requested',async({page})=>{
 const errors=await setup(page,false);const first=page.locator('[data-focus-id^=shelf-popular-]').first();await expect(first).toBeFocused();await page.waitForTimeout(250);
 expect(await first.evaluate(n=>getComputedStyle(n).transform)).not.toBe('none');await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(50);
 expect(await first.evaluate(n=>getComputedStyle(n).transform)).toBe('none');expect(errors).toEqual([]);
});
test('ADR-091 full-page detail shows play count and a part list; choosing P2 starts that part',async({page})=>{
 const errors=await setup(page,false);await page.locator('[data-focus-id^=shelf-popular-]').first().click();await expect(page.locator('.tv-detail.tv-detail-page')).toBeVisible();
 await expect(page.locator('.tv-detail-page')).toContainText('播放');const parts=page.locator('.tv-detail-parts button');await expect(parts).toHaveCount(2);
 await page.keyboard.press('ArrowDown');await expect(parts.first()).toBeFocused();await parts.nth(1).click();await expect(page.getByRole('button',{name:'暂停 / 继续',exact:true})).toBeEnabled();await expect(page.locator('.tv-player-title')).toContainText('P2');expect(errors).toEqual([]);
});
