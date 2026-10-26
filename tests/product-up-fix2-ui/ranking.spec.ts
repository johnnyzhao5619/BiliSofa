import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {setup as mediaSetup} from '../w04-media-ui/fixture.ts';
import {setup as librarySetup} from '../product-library-ui/fixture.ts';
// ADR-117: signed in, the 全站排行 uses the viewer's own session; a refusal is named and paused; the home rows are read in order without waiting for focus.
const publicRead=(variant:string)=>readFileSync('tests/product-up-fix2-ui/public-read-fixture.js','utf8').replace('__VARIANT__',variant);
const catalog=(variant:string)=>readFileSync('tests/catalog-ui/native-fixture.js','utf8').replace('__VARIANT__',variant);
async function routes(page:Page,signed='normal',anonymous='normal'){
 let publicReads=0,catalogReads=0;
 await page.route('**/public-read/probe.js',r=>{publicReads++;return r.fulfill({contentType:'text/javascript',body:publicRead(signed)});});
 await page.route('**/catalog/manifest.json',r=>r.fulfill({body:'{}'}));await page.route('**/catalog/probe.js',r=>{catalogReads++;return r.fulfill({contentType:'text/javascript',body:catalog(anonymous)});});
 // The kernel requests in the order they were sent (operation names only).
 await page.addInitScript(()=>{const post=Worker.prototype.postMessage,sent:string[]=[];(window as unknown as {sent:string[]}).sent=sent;
  Worker.prototype.postMessage=function(this:Worker,...a:unknown[]){const v=a[0] as {type?:string;request?:{operation?:string}}|undefined;if(v?.type==='request'&&v.request?.operation)sent.push(v.request.operation);return post.apply(this,a as [unknown]);};});
 return {publicReads:()=>publicReads,catalogReads:()=>catalogReads};
}
const sent=(page:Page)=>page.evaluate(()=>(window as unknown as {sent:string[]}).sent);
const ranking=(page:Page)=>page.locator('.tv-shelf').filter({has:page.locator('h2',{hasText:/^排行榜$/})});
async function signedIn(page:Page,variant='normal'){
 const c=await routes(page,variant);const f=await librarySetup(page);
 await expect(page.locator('#overlays section.tv-launch')).toBeVisible();await page.locator('[data-focus-id=launch-account-bili_101]').click();await expect(page.locator('#overlays section.tv-launch')).toHaveCount(0);
 return {...c,errors:f.errors};
}
test('ADR-117 signed in, the home rows are read in order without moving focus and 排行榜 uses the account session',async({page})=>{
 const c=await signedIn(page);
 await expect(ranking(page).locator('.tv-card').first()).toContainText('会话排行 1');
 // Nothing moved focus down the page: it is still on the first row (or the 继续观看 row above it).
 expect(await page.evaluate(()=>(document.activeElement as HTMLElement|null)?.dataset.focusId)).toMatch(/^(shelf-recommend-|home-resume-|continuing-)/);
 // The guest home under 谁在观看 reads only its first row; the signed home then reads its rows in order (热门 may be reused).
 const all=await sent(page),signed=all.slice(all.indexOf('identity-verify')+1).filter(op=>['recommendations-read','guest-popular','public-read','public-ranking'].includes(op));
 expect(all).not.toContain('public-ranking');expect(signed.filter(op=>op!=='guest-popular')).toEqual(['recommendations-read','public-read']);
 expect(c.publicReads()).toBe(1);expect(c.catalogReads()).toBe(0);
 // The full grid behind 查看更多 reuses the same signed list.
 await page.locator('[data-focus-id=shelf-more-ranking]').click();await expect(page.locator('#pages [data-focus-id^=home-card-]').first()).toContainText('会话排行 1');
 expect(c.publicReads()).toBe(1);expect(c.errors).toEqual([]);
});
test('ADR-117 signed in, a refused 排行榜 names the code and 重试 in the pause sends nothing',async({page})=>{
 const c=await signedIn(page,'limited');const row=ranking(page);
 await expect(row.locator('.tv-shelf-status')).toHaveText(/^B站暂时限制了访问（风控 -352），约 (60|59) 秒后可重试$/);await expect(row.locator('.tv-shelf-status')).toHaveAttribute('title','limited');
 expect(c.publicReads()).toBe(1);
 await page.locator('[data-focus-id=shelf-retry-ranking]').click();await expect(row.locator('.tv-shelf-status')).toContainText('风控 -352');
 await expect(page.locator('[data-focus-id=shelf-retry-ranking]')).toBeVisible();expect(c.publicReads()).toBe(1);expect(c.errors).toEqual([]);
});
test('ADR-117 as a guest, 排行榜 is read anonymously after 热门 and a refusal suggests signing in',async({page})=>{
 const c=await routes(page,'normal','api');const errors=await mediaSetup(page,false);
 await expect(ranking(page).locator('.tv-shelf-status')).toHaveText(/^B站暂时限制了访问（风控 -352），约 (60|59) 秒后可重试；登录后通常更稳定$/);
 const order=(await sent(page)).filter(op=>['guest-popular','public-ranking'].includes(op));
 expect(order[0]).toBe('guest-popular');expect(order.filter(op=>op==='public-ranking')).toHaveLength(1);expect(c.publicReads()).toBe(0);expect(errors).toEqual([]);
});
