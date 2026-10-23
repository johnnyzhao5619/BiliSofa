import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {setup} from '../w04-media-ui/fixture.ts';
import {overlay} from '../w05-product-ui/overlays-fixture.ts';
import {playFromShelf} from '../product-polish-ui/polish-helpers.ts';
// 0.47.2 device feedback (ADR-094): course rows in video search, focus after choosing, AI subtitle files.
const variant=(page:Page,name:string)=>page.route('**/search/probe.js',route=>route.fulfill({contentType:'text/javascript',body:readFileSync('tests/search-ui/native-fixture.js','utf8').replace('__VARIANT__',name)}));
async function choose(page:Page){await page.locator('[data-focus-id=nav-search]').click();await page.locator('[data-focus-id=keyword-key-n]').click();await page.locator('[data-focus-id=keyword-key-h]').click();await page.locator('[data-focus-id=keyword-candidate-0]').click();}
test('S1 a video page with a paid-course row shows the videos instead of failing; focus goes to the first result',async({page})=>{
 const errors=await setup(page,false);await variant(page,'course');await choose(page);
 await expect(page.locator('[data-focus-id=search-card-0]')).toBeFocused();await expect(page.locator('[data-focus-id=search-card-2]')).toBeVisible();await expect(page.locator('[data-focus-id=search-card-3]')).toHaveCount(0);
 await expect(page.locator('.tv-search .tv-status')).not.toContainText('无法完成');expect(errors).toEqual([]);
});
for(const [name,text] of [['empty','暂无结果'],['wrong-page','无法完成']] as const)test(`S1 when the search is ${name}, focus stays on 搜索 next to the chosen word, not on A`,async({page})=>{
 const errors=await setup(page,false);await variant(page,name);await choose(page);
 await expect(page.locator('.tv-search .tv-status')).toContainText(text);await expect(page.locator('[data-focus-id=keyword-search]')).toBeFocused();expect(errors).toEqual([]);
});
test('S3 an AI subtitle file without .json loads; a track outside the scoped hosts is skipped, not fatal',async({page})=>{
 const f=await overlay(page,'ai',false);await playFromShelf(page);await page.getByRole('button',{name:'字幕设置',exact:true}).click();
 await expect(page.locator('.overlay-settings [role=status]')).toContainText('中文（自动生成）');await expect(page.locator('.subtitle-lines')).toContainText('中文');expect(f.errors).toEqual([]);
});
test('S3 when every track is outside the scope the panel names it instead of overlay.permission',async({page})=>{
 const f=await overlay(page,'foreign',false);await playFromShelf(page);await page.getByRole('button',{name:'字幕设置',exact:true}).click();
 await expect(page.locator('.overlay-settings [role=status]')).toContainText('overlay.unsupported');await expect(page.locator('.overlay-settings [role=status]')).not.toContainText('permission');expect(f.errors).toEqual([]);
});
