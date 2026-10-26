import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {setup as mediaSetup} from '../w04-media-ui/fixture.ts';
import {setup as librarySetup,library,cards} from '../product-library-ui/fixture.ts';
import {openDetail} from '../product-polish-ui/polish-helpers.ts';
// ADR-105: signed-in public lists use the viewer's own session; risk-control refusals are named and paused; local records and the queue open the full detail page.
const publicRead=(variant:string)=>readFileSync('tests/product-up-fix2-ui/public-read-fixture.js','utf8').replace('__VARIANT__',variant);
const catalog=readFileSync('tests/catalog-ui/native-fixture.js','utf8').replace('__VARIANT__','normal');
const chooser=(page:Page)=>page.locator('#overlays section.tv-launch');
async function counted(page:Page,variant='normal'){
 let publicReads=0,catalogReads=0;
 await page.route('**/public-read/probe.js',r=>{publicReads++;return r.fulfill({contentType:'text/javascript',body:publicRead(variant)});});
 await page.route('**/catalog/manifest.json',r=>r.fulfill({body:'{}'}));await page.route('**/catalog/probe.js',r=>{catalogReads++;return r.fulfill({contentType:'text/javascript',body:catalog});});
 return {publicReads:()=>publicReads,catalogReads:()=>catalogReads};
}
async function signedIn(page:Page,variant='normal'){
 const f=await librarySetup(page);const c=await counted(page,variant);
 await expect(chooser(page)).toBeVisible();await page.locator('[data-focus-id=launch-account-bili_101]').click();await expect(chooser(page)).toHaveCount(0);
 return {...c,errors:f.errors};
}
async function category(page:Page,id='1005',fromGrid=false){
 if(fromGrid){await page.locator('[data-focus-id=source-category]').click();await page.locator('[data-focus-id=category-'+id+']').click();}else await page.locator('[data-focus-id=shelf-category-'+id+']').click(); // ADR-116: home categories are direct entries
}
async function help(page:Page){
 for(let i=0;i<4&&!(await page.locator('[data-focus-id=nav-settings]').isVisible());i++)await page.keyboard.press('Escape');
 await page.locator('[data-focus-id=nav-settings]').click();await page.locator('[data-focus-id=settings-section-help]').click();return page.locator('.tv-public-note');
}
const status=(page:Page)=>page.locator('.tv-home .tv-status').first();
// ADR-117: the signed home reads its 排行榜 row with the same session first; wait until that row has settled.
const rankingSettled=(page:Page)=>expect(page.locator('[data-focus-id^=shelf-ranking-],[data-focus-id=shelf-retry-ranking]:not([hidden])').first()).toBeVisible();
test('ADR-105 signed in, a category ranking is read with the account session (not the anonymous lane) and help names it',async({page})=>{
 const c=await signedIn(page);await rankingSettled(page);const before=c.catalogReads(),reads=c.publicReads();await category(page);
 await expect(page.locator('#pages [data-focus-id^=home-card-]').first()).toContainText('会话分区 1');await expect(status(page)).toContainText('分区排行榜');
 expect(c.publicReads()-reads).toBe(1);expect(c.catalogReads()).toBe(before);
 await expect(await help(page)).toHaveText('最近一次分区读取：账号会话 · 成功');expect(c.errors).toEqual([]);
});
test('ADR-105 a -352 refusal is named with its code, then nothing is requested during the pause',async({page})=>{
 // ADR-117: here the home's 排行榜 row is the first refused read; the categories opened in the pause send nothing.
 const c=await signedIn(page,'limited');await rankingSettled(page);expect(c.publicReads()).toBe(1);await category(page);
 await expect(status(page)).toHaveText(/^B站暂时限制了访问（风控 -352），约 \d+ 秒后可重试$/);expect(c.publicReads()).toBe(1);
 await category(page,'1004',true);await expect(status(page)).toContainText('风控 -352');expect(c.publicReads()).toBe(1);
 await expect(await help(page)).toHaveText('最近一次全站排行读取：账号会话 · B站返回 -352');expect(c.errors).toEqual([]);
});
test('ADR-105 as a guest, the same category within ten minutes is read once',async({page})=>{
 const errors=await mediaSetup(page,false);const c=await counted(page);const before=c.catalogReads();
 await category(page);await expect(page.locator('#pages [data-focus-id^=home-card-]').first()).toBeVisible();const once=c.catalogReads();expect(once).toBeGreaterThan(before);
 // Opening a new category costs one more native load than reopening a cached one (other catalog reads may ride along).
 await category(page,'1004',true);await expect(page.locator('#pages [data-focus-id^=home-card-]').first()).toBeVisible();const fresh=c.catalogReads()-once;expect(fresh).toBeGreaterThan(0);
 await category(page,'1005',true);await expect(page.locator('#pages [data-focus-id^=home-card-]').first()).toBeVisible();expect(c.catalogReads()-once-fresh).toBe(fresh-1);
 expect(c.publicReads()).toBe(0);expect(errors).toEqual([]);
});
test('ADR-105 继续观看 and 本机播放队列 open the full detail page with their own actions',async({page})=>{
 const f=await librarySetup(page);await expect(chooser(page)).toBeVisible();await page.keyboard.press('Escape');await library(page);
 await page.getByRole('button',{name:'继续观看',exact:true}).click();await expect(cards(page).first()).toContainText('P2');await openDetail(page,cards(page).first());
 let top=page.locator('#overlays>section').last();await expect(top.locator('[data-focus-id=detail-play]')).toHaveText('继续观看 · P2 0:03');
 await expect(top.locator('[data-focus-id=library-detail-remove]')).toHaveText('删除本机此项');await expect(top.locator('[data-focus-id=library-detail-play]')).toHaveCount(0);
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'本机播放队列',exact:true}).click();await expect(cards(page)).toHaveCount(2);await openDetail(page,cards(page).nth(1));
 top=page.locator('#overlays>section').last();await expect(top.locator('[data-focus-id=detail-play]')).toHaveText('从本项开始播放队列');
 await expect(top.locator('[data-focus-id=detail-play-single]')).toBeVisible();await expect(top.locator('[data-focus-id=detail-enqueue]')).toHaveCount(0);
 await expect(top.locator('[data-focus-id=library-detail-move-up]')).toBeEnabled();await expect(top.locator('[data-focus-id=library-detail-move-down]')).toBeDisabled();
 await expect(top.locator('[data-focus-id=library-detail-remove]')).toBeVisible();expect(f.errors).toEqual([]);
});
