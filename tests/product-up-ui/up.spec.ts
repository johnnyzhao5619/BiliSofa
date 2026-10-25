import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {setup} from '../w04-media-ui/fixture.ts';
// ADR-103: UP主页·投稿 (newest first, 30 per page, read only on request), one shared video detail page, 关注's direct card.
const shared=readFileSync('tests/catalog-ui/native-fixture.js','utf8').replace('__VARIANT__','normal'),route=readFileSync('tests/product-up-ui/up-route.js','utf8');
/** The shared catalog fixture keeps every other route; the UP route is spliced in front of its route check. */
function catalog(variant:string){
 const out=shared.replace('let size=0,printing=false;','let size=0,printing=false,upStatus=0;')
  .replace("_guest_http_status:()=>{outside();return variant==='http'?403:200;}","_guest_http_status:()=>{outside();return upStatus||(variant==='http'?403:200);}")
  .replace('callMain(args){outside();','callMain(args){outside();upStatus=0;'+route.replace('__UP_VARIANT__',variant));
 for(const marker of ['upStatus=0;','return upStatus||','recArchives'.slice(0,0)+"args[0]==='up-archives'"])expect(out).toContain(marker);
 return out;
}
const api=readFileSync('tests/w04-media-ui/vod-api-fixture.js','utf8').replace('__PGC__','0').replace('__FALLBACK__','off').replace("owner:{name:'合成UP'}","owner:{name:'合成UP',mid:777}");
async function begin(page:Page,variant='normal'){
 const errors=await setup(page,false);let reads=0;
 await page.route('**/catalog/manifest.json',r=>r.fulfill({body:'{}'}));
 await page.route('**/catalog/probe.js',r=>{reads++;return r.fulfill({contentType:'text/javascript',body:catalog(variant)});});
 await page.route('**/vod-api/probe.js',r=>r.fulfill({contentType:'text/javascript',body:api}));
 expect(api).toContain('mid:777');
 return {errors,reads:()=>reads};
}
const up=(page:Page)=>page.locator('#overlays section.tv-up-page');
/** ADR-105/106: the code is named, the lane pauses 60 s, and a refused guest read suggests signing in. */
const limitedText=/^B站暂时限制了访问（HTTP 412），约 \d+ 秒后可重试；登录后通常更稳定$/;
async function openUpFromDetail(page:Page,reads:()=>number){
 const card=page.locator('[data-focus-id^=shelf-popular-]').first();await expect(card).toBeVisible();await card.click();
 await page.locator('[data-focus-id=detail-up]').click();await expect(up(page)).toBeVisible();await expect(up(page).locator('.tv-status')).not.toHaveText('正在读取投稿');
 return reads();
}
test('ADR-103 the detail page opens the UP page: newest uploads first, 30 per page, and a video there has no UP action',async({page})=>{
 const {errors,reads}=await begin(page);const base=await openUpFromDetail(page,reads);
 await expect(up(page).locator('h2')).toHaveText('合成UP');await expect(up(page).locator('.tv-status')).toHaveText('第 1 页 · 共 45 个投稿');
 const cards=up(page).locator('.tv-up-grid button');await expect(cards).toHaveCount(30);await expect(cards.first()).toBeFocused();
 await expect(cards.first()).toContainText('合成投稿 1');
 await page.keyboard.press('ArrowRight');await expect(cards.nth(1)).toBeFocused();await page.keyboard.press('ArrowDown');await expect(cards.nth(5)).toBeFocused();
 await page.locator('[data-focus-id=up-next]').click();await expect(up(page).locator('.tv-status')).toHaveText('第 2 页 · 共 45 个投稿');await expect(cards).toHaveCount(15);expect(reads()).toBe(base+1);
 await expect(page.locator('[data-focus-id=up-next]')).toBeDisabled();
 await cards.first().click();const top=page.locator('#overlays>section').last();await expect(page.locator('#overlays>section')).toHaveCount(3);
 await expect(top.locator('h2')).toHaveText('合成投稿 31');await expect(top.locator('[data-focus-id=detail-play]')).toBeVisible();
 // The UP action would appear with the part list; wait for that read before checking it is absent.
 await expect(top).toContainText('共 2P');await expect(top.locator('[data-focus-id=detail-up]')).toHaveCount(0);
 await page.keyboard.press('Escape');await expect(page.locator('#overlays>section')).toHaveCount(2);await expect(cards.first()).toBeFocused();expect(errors).toEqual([]);
});
test('ADR-103 search results use the shared detail page; an UP result opens the UP page directly',async({page})=>{
 const {errors}=await begin(page);await page.locator('[data-focus-id=nav-search]').click();
 await page.locator('[data-focus-id=keyword-key-n]').click();await page.locator('[data-focus-id=keyword-key-h]').click();await page.locator('[data-focus-id=keyword-candidate-0]').click();
 await expect(page.locator('[data-focus-id=search-card-0]')).toBeFocused();await page.locator('[data-focus-id=search-card-0]').click();
 await expect(page.locator('[data-focus-id=detail-play]')).toBeVisible();await expect(page.locator('[data-focus-id=search-detail-play]')).toHaveCount(0);
 await expect(page.locator('[data-focus-id=detail-up]')).toBeVisible();
 await page.keyboard.press('Escape');await page.locator('[data-focus-id=search-type-up]').click();
 await expect(page.locator('[data-focus-id=search-card-0]')).toBeVisible();await page.locator('[data-focus-id=search-card-0]').click();
 await expect(up(page)).toBeVisible();await expect(up(page).locator('h2')).toHaveText('合成UP');await expect(up(page).locator('.tv-detail-meta')).toContainText('45 个投稿');
 await expect(up(page).locator('.tv-up-grid button')).toHaveCount(30);expect(errors).toEqual([]);
});
test('ADR-103 rate limiting is named and never retried on its own; 重新读取 asks once more',async({page})=>{
 const {errors,reads}=await begin(page,'limited');const base=await openUpFromDetail(page,reads);
 await expect(up(page).locator('.tv-status')).toHaveText(limitedText);await expect(page.locator('[data-focus-id=up-retry]')).toBeFocused();
 await page.waitForTimeout(2000);expect(reads()).toBe(base);
 await page.locator('[data-focus-id=up-retry]').click();
 // During the 0.51.2 pause 重新读取 asks nothing; earlier builds ask exactly once.
 await page.waitForTimeout(1000);expect(reads()).toBe(base);
 await expect(up(page).locator('.tv-status')).toHaveText(limitedText);
 expect(errors).toEqual([]);
});
test('ADR-103 关注 keeps 关注更新 and links to 番剧影视 for 追番/追剧 instead of repeating them',async({page})=>{
 const {errors}=await begin(page);await page.locator('[data-focus-id=nav-following]').click();
 await expect(page.locator('[data-focus-id=following-tab-updates]')).toBeVisible();
 await expect(page.locator('[data-focus-id=following-tab-bangumi]')).toHaveCount(0);await expect(page.locator('[data-focus-id=following-tab-drama]')).toHaveCount(0);
 const shortcut=page.locator('[data-focus-id=following-to-catalog]');await expect(shortcut).toHaveText('我的追番 · 我的追剧 → 番剧影视');
 await shortcut.click();await expect(page.locator('#following-title')).toHaveText('番剧影视');
 await expect(page.locator('[data-focus-id=following-tab-bangumi]')).toHaveAttribute('aria-pressed','true');expect(errors).toEqual([]);
});
