import {test,expect} from '@playwright/test';
import {setup} from '../w04-media-ui/fixture.ts';
import {overlay} from '../w05-product-ui/overlays-fixture.ts';
import {playFromShelf,start,settings} from '../product-polish-ui/polish-helpers.ts';
const focused=(page:import('@playwright/test').Page)=>page.evaluate(()=>(document.activeElement as HTMLElement)?.dataset.focusId??'');
async function search(page:import('@playwright/test').Page){await page.locator('[data-focus-id=nav-search]').click();await page.locator('[data-focus-id=keyword-key-n]').click();await page.locator('[data-focus-id=keyword-key-h]').click();await page.locator('[data-focus-id=keyword-candidate-0]').click();await expect(page.locator('[data-focus-id=search-card-0]')).toBeFocused();}
test('S1 fix: Left returns to the keyboard from any result row and from 热搜; the grid moves four per row',async({page})=>{
 const errors=await setup(page,false);await search(page);
 await expect(page.locator('[data-focus-id=search-card-4]')).toBeAttached();await page.keyboard.press('ArrowDown');expect(await focused(page)).toBe('search-card-4');await page.keyboard.press('ArrowLeft');expect(await focused(page)).toMatch(/^keyword-/);
 await page.locator('[data-focus-id=search-card-3]').focus();await page.keyboard.press('ArrowRight');expect(await focused(page)).toBe('search-card-3');await page.keyboard.press('ArrowDown');expect(await focused(page)).toBe('search-card-7');
 await page.locator('[data-focus-id=search-type-all]').focus();await page.keyboard.press('ArrowLeft');expect(await focused(page)).toMatch(/^keyword-/); // ADR-116: 综合 is the first tab
 await page.locator('[data-focus-id=keyword-clear]').click();await expect(page.locator('[data-focus-id=search-hot]')).toBeVisible();await page.locator('[data-focus-id=search-hot]').focus();await page.keyboard.press('ArrowLeft');expect(await focused(page)).toMatch(/^keyword-/);expect(errors).toEqual([]);
});
test('S1 fix: a visible 搜索 button searches the chosen keyword or the typed letters as they are',async({page})=>{
 const errors=await setup(page,false);await page.locator('[data-focus-id=nav-search]').click();const go=page.locator('[data-focus-id=keyword-search]');await expect(go).toHaveText('搜索');await expect(go).toBeDisabled();
 await page.locator('[data-focus-id=keyword-key-n]').click();await page.locator('[data-focus-id=keyword-key-h]').click();await expect(go).toBeEnabled();await go.click();
 await expect(page.locator('[data-focus-id=search-card-0]')).toBeFocused();await expect(page.locator('.tv-search .tv-status')).toContainText('nh');expect(errors).toEqual([]);
});
test('S5 fix: in the ⚙ panel Up moves back from 循环 to 连播',async({page})=>{
 const errors=await start(page);await settings(page);const repeat=page.getByRole('button',{name:/^循环/});await repeat.focus();
 await page.keyboard.press('ArrowUp');await expect(page.getByRole('button',{name:/^连播/})).toBeFocused();await page.keyboard.press('ArrowDown');await expect(repeat).toBeFocused();expect(errors).toEqual([]);
});
test('S3 fix: 字幕 opens subtitle settings only, with the subtitle state shown; 弹幕设置 is a separate panel from ⚙',async({page})=>{
 const f=await overlay(page,'normal',false);await playFromShelf(page);await page.getByRole('button',{name:'字幕设置',exact:true}).click();
 await expect(page.locator('.overlay-settings h2')).toHaveText('字幕设置');await expect(page.locator('[data-focus-id=overlay-subtitles]')).toBeFocused();
 await expect(page.locator('[data-focus-id=overlay-size]')).toBeHidden();await expect(page.locator('[data-focus-id=overlay-dm]')).toBeHidden();await expect(page.locator('.overlay-settings [role=status]')).toContainText('字幕：简体中文');
 await expect(page.locator('.subtitle-lines')).toContainText('中文');
 await page.keyboard.press('Escape');await settings(page);await page.getByRole('button',{name:'弹幕设置',exact:true}).click();await expect(page.locator('.overlay-settings h2')).toHaveText('弹幕设置');
 await expect(page.locator('[data-focus-id=overlay-dm]')).toBeFocused();await expect(page.locator('[data-focus-id=overlay-subtitles]')).toBeHidden();expect(f.errors).toEqual([]);
});
test('S3 fix: a video without subtitles says so in the subtitle panel instead of staying silent',async({page})=>{
 const f=await overlay(page,'empty',false);await playFromShelf(page);await page.getByRole('button',{name:'字幕设置',exact:true}).click();
 await expect(page.locator('.overlay-settings [role=status]')).toContainText('这个视频没有可用字幕');expect(f.errors).toEqual([]);
});
