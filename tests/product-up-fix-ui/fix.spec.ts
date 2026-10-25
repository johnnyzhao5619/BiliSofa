import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {setup as mediaSetup} from '../w04-media-ui/fixture.ts';
import {setup as librarySetup,library,cards} from '../product-library-ui/fixture.ts';
/** The library fixture seeds a saved account, so the 0.50.0 chooser opens first. */
const chooser=(page:Page)=>page.locator('#overlays section.tv-launch');
// ADR-104: catalog reads carry the TV runtime User-Agent; a failed read keeps the remote on a control; every video entry opens the shared detail page.
const shared=readFileSync('tests/catalog-ui/native-fixture.js','utf8');
/** Like B站 on the device: category rankings answer -352 unless the runtime User-Agent comes first. */
function catalog(mode:'agent-required'|'api'){
 const out=shared.replace("const m=self.Module,variant='__VARIANT__',heap=new Uint8Array(600000);let size=0,printing=false;","const m=self.Module,heap=new Uint8Array(600000);let size=0,printing=false,variant='normal';")
  .replace('callMain(args){outside();',`callMain(args){outside();variant='${mode}'==='api'?'api':args.some(a=>typeof a==='string'&&a.startsWith('--ua='))?'normal':'api';`);
 for(const marker of ["variant='normal'","startsWith('--ua='))?'normal':'api'"])expect(out).toContain(marker);
 return out;
}
const api=readFileSync('tests/w04-media-ui/vod-api-fixture.js','utf8').replace('__PGC__','0').replace('__FALLBACK__','off').replace("owner:{name:'合成UP'}","owner:{name:'合成UP',mid:777}");
async function routes(page:Page,mode:'agent-required'|'api'){
 await page.route('**/catalog/manifest.json',r=>r.fulfill({body:'{}'}));await page.route('**/catalog/probe.js',r=>r.fulfill({contentType:'text/javascript',body:catalog(mode)}));
 await page.route('**/vod-api/probe.js',r=>r.fulfill({contentType:'text/javascript',body:api}));
}
async function category(page:Page){
 await page.locator('[data-focus-id=shelf-categories]').click();await page.locator('[data-focus-id=category-1005]').click();
}
/** 0.51.2+ (ADR-105) names a risk-control refusal instead of the generic failure text. */
const failureText=/内容暂时无法加载|B站暂时限制了访问（风控 -352）/;
const focused=(page:Page)=>page.evaluate(()=>{const a=document.activeElement as HTMLElement|null;return a?.dataset.focusId??a?.tagName??'';});
test('ADR-104 a category ranking carries the TV runtime User-Agent and loads',async({page})=>{
 const errors=await mediaSetup(page,false);await routes(page,'agent-required');await category(page);
 await expect(page.locator('.tv-home .tv-status').first()).toContainText('分区排行榜');await expect(page.locator('#pages [data-focus-id^=home-card-]').first()).toBeVisible();expect(errors).toEqual([]);
});
test('ADR-104 after a failed category read, 重试 keeps the remote on a control instead of losing focus',async({page})=>{
 const errors=await mediaSetup(page,false);await routes(page,'api');await category(page);
 await expect(page.locator('.tv-home .tv-status').first()).toContainText(failureText);
 // The device path: switch category from the grid's own 分区 button, then reach 重试 with the remote.
 for(const id of ['1004','1008']){await page.locator('[data-focus-id=source-category]').click();await page.locator('[data-focus-id=category-'+id+']').click();await expect(page.locator('.tv-home .tv-status').first()).toContainText(failureText);}
 await expect.poll(()=>focused(page)).toBe('source-category');
 await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowDown');await expect.poll(()=>focused(page)).toBe('home-refresh');
 // 重试 reloads the last list that loaded (or the failed one); either way the remote keeps a visible control.
 await page.keyboard.press('Enter');await expect(page.locator('.tv-home .tv-status').first()).not.toContainText('正在');
 await page.waitForTimeout(500);expect(await focused(page)).not.toMatch(/^(BODY|)$/);
 await page.locator('[data-focus-id=home-refresh]').focus();await page.keyboard.press('ArrowUp');await expect.poll(()=>focused(page)).toMatch(/^source-/);expect(errors).toEqual([]);
});
test('ADR-104 继续观看 opens the shared detail page on its own part, and the read names the UP',async({page})=>{
 const f=await librarySetup(page);await page.route('**/vod-api/probe.js',r=>r.fulfill({contentType:'text/javascript',body:api}));await page.reload();
 await expect(chooser(page)).toBeVisible();await page.keyboard.press('Escape');await expect(chooser(page)).toHaveCount(0);
 const card=page.locator('.tv-continuing-grid button').first();await expect(card).toContainText('P2');await card.click();
 const top=page.locator('#overlays>section').last();await expect(top.locator('h2')).toHaveText('合成完整视频');
 await expect(top.locator('[data-focus-id=detail-play]')).toHaveText('继续观看 · P2 0:03');await expect(top.locator('[data-focus-id=detail-enqueue]')).toHaveText('加入本机队列 · P2');
 await expect(top).toContainText('共 2P');await expect(top.locator('.tv-detail-header')).toContainText('合成UP');await expect(top.locator('[data-focus-id=detail-up]')).toBeVisible();
 await expect(page.locator('[data-focus-id=continue-play]')).toHaveCount(0);expect(f.errors).toEqual([]);
});
test('ADR-104 我的 → 云端历史 opens the shared detail page on that entry’s part',async({page})=>{
 const f=await librarySetup(page);await page.route('**/vod-api/probe.js',r=>r.fulfill({contentType:'text/javascript',body:api}));
 await expect(chooser(page)).toBeVisible();await page.locator('[data-focus-id=launch-account-bili_101]').click();await expect(chooser(page)).toHaveCount(0);await library(page);
 f.mode('history');await page.getByRole('button',{name:'云端历史',exact:true}).click();
 await expect(cards(page).first()).toContainText('P2');await cards(page).first().click();
 const top=page.locator('#overlays>section').last();await expect(top.locator('[data-focus-id=detail-play]')).toContainText('P2');
 await expect(top.locator('[data-focus-id=library-detail-play]')).toHaveCount(0);
 // The synthetic VOD API stays anonymous, so this signed-in part list read is refused there; the 继续观看 case covers it.
 await top.locator('[data-focus-id=detail-enqueue]').click();await expect(top.getByRole('status').first()).toContainText('已加入本机队列');expect(f.errors).toEqual([]);
});
