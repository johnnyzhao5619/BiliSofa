import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {setup as mediaSetup} from '../w04-media-ui/fixture.ts';
// ADR-098: 热门番剧 filters type (国创 / 番剧) and time span (近三日 / 近一周 / 累计热门); 国创 first; remembered.
const catalog=readFileSync('tests/catalog-ui/native-fixture.js','utf8').replace('__VARIANT__','normal');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');
async function open(page:Page){
 await page.route('**/catalog/manifest.json',r=>r.fulfill({body:'{}'}));await page.route('**/catalog/probe.js',r=>r.fulfill({contentType:'text/javascript',body:catalog}));
 await page.route('https://i0.hdslb.com/**',r=>r.fulfill({contentType:'image/png',body:png,headers:{'Access-Control-Allow-Origin':'*'}}));
 const errors=await mediaSetup(page,false);await page.locator('[data-focus-id=nav-catalog]').click();return errors;
}
const cards=(page:Page)=>page.locator('.tv-following .tv-library-grid button');
const pressed=(page:Page,id:string)=>expect(page.locator(`[data-focus-id=${id}]`)).toHaveAttribute('aria-pressed','true');
test('ADR-098 热门番剧 opens on 国创 · 近三日 and names the list it shows',async({page})=>{
 const errors=await open(page);await pressed(page,'hot-type-4');await pressed(page,'hot-span-day3');
 await expect(cards(page).first()).toContainText('合成国创 三日 1');await expect(page.locator('.tv-following .tv-source-note')).toContainText('国创 · 公开排行近三日');expect(errors).toEqual([]);
});
test('ADR-098 type and span switch the list; 累计热门 pages by followers; the choice is remembered',async({page})=>{
 const errors=await open(page);await page.locator('[data-focus-id=hot-type-1]').click();await expect(cards(page).first()).toContainText('合成番剧 三日 1');
 await page.locator('[data-focus-id=hot-span-week]').click();await expect(cards(page).first()).toContainText('合成番剧 一周 1');
 await page.locator('[data-focus-id=hot-span-all]').click();await expect(cards(page).first()).toContainText('合成番剧 累计 1');await expect(page.locator('.tv-following .tv-source-note')).toContainText('按追番人数累计');
 await cards(page).last().focus();await page.keyboard.press('ArrowDown');await expect(page.locator('.tv-following .tv-library-grid button',{hasText:'合成番剧 累计 21'})).toHaveCount(1);
 await page.reload();await page.locator('[data-focus-id=nav-catalog]').click();await pressed(page,'hot-type-1');await pressed(page,'hot-span-all');expect(errors).toEqual([]);
});
test('ADR-098 Down from the tabs reaches the filters, and Up from the first card returns to them',async({page})=>{
 const errors=await open(page);await expect(cards(page).first()).toBeVisible();await page.locator('[data-focus-id=following-tab-hot]').focus();
 await page.keyboard.press('ArrowDown');await expect(page.locator('[data-focus-id=hot-type-4]')).toBeFocused();
 await page.keyboard.press('ArrowDown');await expect(cards(page).first()).toBeFocused();await page.keyboard.press('ArrowUp');await expect(page.locator('[data-focus-id=hot-type-4]')).toBeFocused();expect(errors).toEqual([]);
});
