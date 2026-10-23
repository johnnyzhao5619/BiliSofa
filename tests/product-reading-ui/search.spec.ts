import {test,expect} from '@playwright/test';
import {setup} from '../w04-media-ui/fixture.ts';
const focused=(page:import('@playwright/test').Page)=>page.evaluate(()=>(document.activeElement as HTMLElement)?.dataset.focusId??'');
test('ADR-092 one-page search: choosing a candidate searches at once and focuses the first result; Left returns to the pad',async({page})=>{
 const errors=await setup(page,false);await page.locator('[data-focus-id=nav-search]').click();await expect(page.locator('[data-focus-id=keyword-key-a]')).toBeFocused();
 await page.locator('[data-focus-id=keyword-key-n]').click();await page.locator('[data-focus-id=keyword-key-h]').click();await expect(page.locator('[data-focus-id=keyword-candidate-0]')).toBeEnabled();
 await page.locator('[data-focus-id=keyword-candidate-0]').click();await expect(page.locator('[data-focus-id=search-card-0]')).toBeFocused();await expect(page.locator('.tv-search .tv-status')).toContainText('你好');
 await expect(page.locator('[data-focus-id=keyword-done]')).toHaveCount(0);await expect(page.locator('.search-panel')).toHaveCount(0);
 await page.keyboard.press('ArrowLeft');expect(await focused(page)).toMatch(/^keyword-/);
 await page.locator('[data-focus-id=search-type-up]').click();await expect(page.locator('.tv-search .tv-status')).toContainText('你好');expect(errors).toEqual([]);
});
test('ADR-092 Back clears typed letters, then the keyword (showing recent searches), then leaves to the rail',async({page})=>{
 const errors=await setup(page,false);await page.locator('[data-focus-id=nav-search]').click();
 await page.locator('[data-focus-id=keyword-key-n]').click();await page.locator('[data-focus-id=keyword-key-h]').click();await page.locator('[data-focus-id=keyword-candidate-0]').click();await expect(page.locator('[data-focus-id=search-card-0]')).toBeFocused();
 await page.locator('[data-focus-id=keyword-key-x]').click();await expect(page.locator('.tv-keyword-buffer')).toHaveText('X');
 await page.keyboard.press('Escape');await expect(page.locator('.tv-keyword-buffer')).not.toHaveText('X');await expect(page.locator('.tv-keyword-preview')).toContainText('你好');
 await page.keyboard.press('Escape');await expect(page.locator('.tv-keyword-preview')).not.toContainText('你好');await expect(page.locator('[data-focus-id=search-recent-0]')).toHaveText('你好');
 await page.locator('[data-focus-id=keyword-key-a]').focus();await page.keyboard.press('Escape');await expect(page.locator('[data-focus-id=nav-search]')).toBeFocused();
 await page.locator('[data-focus-id=search-recent-0]').click();await expect(page.locator('[data-focus-id=search-card-0]')).toBeFocused();await expect(page.locator('.tv-keyword-preview')).toContainText('你好');expect(errors).toEqual([]);
});
