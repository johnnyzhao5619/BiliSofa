import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {setup as mediaSetup} from '../w04-media-ui/fixture.ts';
import {setup as librarySetup} from '../product-library-ui/fixture.ts';
import {openDetail} from '../product-polish-ui/polish-helpers.ts';
// ADR-106: anonymous category/UP reads carry B站's own visitor identity, kept on this TV and clearable in 设置; a refused guest read suggests signing in.
const shared=readFileSync('tests/catalog-ui/native-fixture.js','utf8'),route=readFileSync('tests/product-up-ui/up-route.js','utf8');
const publicRead=readFileSync('tests/product-up-fix2-ui/public-read-fixture.js','utf8').replace('__VARIANT__','limited');
const KEY='bilisofa.visitor.v1';
const api=readFileSync('tests/w04-media-ui/vod-api-fixture.js','utf8').replace('__PGC__','0').replace('__FALLBACK__','off').replace("owner:{name:'合成UP'}","owner:{name:'合成UP',mid:777}");
/** Like B站 for this TV's exit: 'visitor-required' answers category -352 and UP uploads HTTP 412 unless the visitor identity comes first; 'api' always refuses. */
function catalog(gate:'visitor-required'|'api'){
 const out=shared.replace("const m=self.Module,variant='__VARIANT__',heap=new Uint8Array(600000);let size=0,printing=false;",`const m=self.Module,heap=new Uint8Array(600000);let size=0,printing=false,upStatus=0,variant='normal';const gate='${gate}';`)
  .replace("_guest_http_status:()=>{outside();return variant==='http'?403:200;}","_guest_http_status:()=>{outside();return upStatus||(variant==='http'?403:200);}")
  .replace('callMain(args){outside();','callMain(args){outside();upStatus=0;/* the UP route below strips --visitor first */const upVisited=args.some(a=>typeof a===\'string\'&&a.startsWith(\'--visitor=\'));'+route.replace("'__UP_VARIANT__'==='limited'","(gate==='api'||!upVisited)"))
  .replace('const pgc=(args.length===1',"variant=args[0]==='category-ranking'&&(gate==='api'||!upVisited)?'api':'normal';const pgc=(args.length===1");
 for(const marker of ["const gate=","(gate==='api'||!upVisited)","(gate==='api'||!upVisited)?'api'","args[0]==='visitor-id'","return upStatus||"])expect(out).toContain(marker);
 return out;
}
async function routes(page:Page,gate:'visitor-required'|'api'){
 let loads=0;
 await page.route('**/catalog/manifest.json',r=>r.fulfill({body:'{}'}));await page.route('**/catalog/probe.js',r=>{loads++;return r.fulfill({contentType:'text/javascript',body:catalog(gate)});});
 return ()=>loads;
}
async function category(page:Page,id='1005',fromGrid=false){
 if(fromGrid){await page.locator('[data-focus-id=source-category]').click();await page.locator('[data-focus-id=category-'+id+']').click();}else await page.locator('[data-focus-id=shelf-category-'+id+']').click(); // ADR-116: home categories are direct entries
}
async function settings(page:Page,section:'data'|'help'){
 for(let i=0;i<4&&!(await page.locator('[data-focus-id=nav-settings]').isVisible());i++)await page.keyboard.press('Escape');
 await page.locator('[data-focus-id=nav-settings]').click();await page.locator('[data-focus-id=settings-section-'+section+']').click();
}
const status=(page:Page)=>page.locator('.tv-home .tv-status').first();
const firstCard=(page:Page)=>page.locator('#pages [data-focus-id^=home-card-]').first();
const saved=(page:Page)=>page.evaluate(k=>localStorage.getItem(k),KEY);
test('ADR-106 a guest category read obtains the visitor identity once, keeps it on this TV and passes B站\'s visitor gate',async({page})=>{
 const errors=await mediaSetup(page,false);await routes(page,'visitor-required');
 expect(await saved(page)).toBeNull();
 await category(page);await expect(firstCard(page)).toBeVisible();await expect(status(page)).toContainText('分区排行榜');
 const kept=JSON.parse((await saved(page))!);expect(Object.keys(kept)).toEqual(['version','b3','b4','at']);
 expect(kept.b4).toBe(encodeURIComponent('0F1E2D3C-4B5A-6978-8796-A5B4C3D2E1F012345-102300000-abc+/=='));
 await settings(page,'help');await expect(page.locator('.tv-public-note')).toHaveText('最近一次分区读取：游客（带访客标识） · 成功');
 await settings(page,'data');await expect(page.locator('[data-visitor-status]')).toHaveText('游客浏览分区与UP投稿时使用的B站访客标识：已保存在本机（30天内有效）');
 // A new run reuses the kept identity instead of asking again.
 await page.reload();await routes(page,'visitor-required');await category(page,'1004');await expect(firstCard(page)).toBeVisible();
 expect(JSON.parse((await saved(page))!).at).toBe(kept.at);expect(errors).toEqual([]);
});
test('ADR-106 UP uploads carry the same identity; without it the gate answers HTTP 412',async({page})=>{
 const errors=await mediaSetup(page,false);await routes(page,'visitor-required');
 await page.route('**/vod-api/probe.js',r=>r.fulfill({contentType:'text/javascript',body:api}));
 const card=page.locator('[data-focus-id^=shelf-popular-]').first();await expect(card).toBeVisible();await openDetail(page,card);await page.locator('[data-focus-id=detail-up]').click();
 const up=page.locator('#overlays section.tv-up-page');await expect(up.locator('.tv-status')).toHaveText('第 1 页 · 共 45 个投稿');await expect(up.locator('.tv-up-grid button')).toHaveCount(30);
 expect(await saved(page)).not.toBeNull();expect(errors).toEqual([]);
});
test('ADR-106 设置 → 本机数据 clears the identity with one press, keeps focus, and the next guest read obtains a new one',async({page})=>{
 const errors=await mediaSetup(page,false);await routes(page,'visitor-required');
 await category(page);await expect(firstCard(page)).toBeVisible();const first=JSON.parse((await saved(page))!).at;
 await settings(page,'data');const clear=page.locator('[data-focus-id=visitor-clear]');await expect(clear).toHaveText('清除B站访客标识');
 await clear.focus();await page.keyboard.press('Enter');
 await expect(page.locator('[data-visitor-status]')).toHaveText('已清除B站访客标识，下次游客读取时重新获取');expect(await saved(page)).toBeNull();
 await expect(clear).toBeFocused();await page.keyboard.press('Enter');await expect(page.locator('[data-visitor-status]')).toHaveText('本机没有保存B站访客标识');
 await page.locator('[data-focus-id=nav-home]').click();await category(page,'1004',true);await expect(firstCard(page)).toBeVisible();
 const again=JSON.parse((await saved(page))!).at;expect(again).toBeGreaterThanOrEqual(first);expect(errors).toEqual([]);
});
test('ADR-106 a refused guest read suggests signing in; a refused signed-in read does not',async({page})=>{
 const errors=await mediaSetup(page,false);await routes(page,'api');
 await category(page);await expect(status(page)).toHaveText(/^B站暂时限制了访问（风控 -352），约 (60|59) 秒后可重试；登录后通常更稳定$/);
 await settings(page,'help');await expect(page.locator('.tv-public-note')).toHaveText('最近一次分区读取：游客（带访客标识） · B站返回 -352');expect(errors).toEqual([]);
});
test('ADR-106 signed in, the account session is used: no visitor identity is obtained and the refusal has no sign-in hint',async({page})=>{
 const f=await librarySetup(page);await routes(page,'api');await page.route('**/public-read/probe.js',r=>r.fulfill({contentType:'text/javascript',body:publicRead}));
 await expect(page.locator('#overlays section.tv-launch')).toBeVisible();await page.locator('[data-focus-id=launch-account-bili_101]').click();await expect(page.locator('#overlays section.tv-launch')).toHaveCount(0);
 await category(page);await expect(status(page)).toHaveText(/^B站暂时限制了访问（风控 -352），约 (60|59) 秒后可重试$/);
 expect(await saved(page)).toBeNull();expect(f.errors).toEqual([]);
});
