import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {setup as mediaSetup,snapshot} from '../w04-media-ui/fixture.ts';
const updates=readFileSync('tests/follow-updates-ui/native-fixture.js','utf8');
const identity=readFileSync('tests/identity-ui/native-fixture.js','utf8').replace('__VARIANT__','normal');
const follow=readFileSync('tests/w04-media-ui/pgc-follow-fixture.js','utf8');
async function setup(page:Page){
  let mode='normal',updateReads=0,pgcReads=0,pgcHold=false,release:()=>void=()=>{};
  const commands:number[]=[];
  await page.route('**/identity/manifest.json',r=>r.fulfill({body:'{}'}));
  await page.route('**/identity/probe.js',r=>r.fulfill({contentType:'text/javascript',body:identity}));
  await page.route('**/recommend/manifest.json',r=>r.fulfill({body:'{}'}));
  await page.route('**/recommend/probe.js',r=>r.fulfill({contentType:'text/javascript',body:readFileSync('tests/recommend-ui/native-fixture.js','utf8').replace('__VARIANT__','normal')}));
  await page.route('**/library/manifest.json',r=>r.fulfill({body:'{}'}));
  await page.route('**/library/probe.js',r=>{updateReads++;return r.fulfill({contentType:'text/javascript',body:updates.replace('__VARIANT__',mode)});});
  await page.route('**/pgc-follow/probe.js',r=>r.fulfill({contentType:'text/javascript',body:follow}));
  await page.route('**/synthetic-pgc-follow',async r=>{
    const {operation,value,uid}=r.request().postDataJSON() as {operation:number;value:string;uid:string};commands.push(operation);
    if(operation===0)return r.fulfill({json:{code:0,data:{isLogin:true,mid:Number(uid),wbi_img:{img_url:'https://i0.hdslb.com/bfs/wbi/'+'a'.repeat(32)+'.png',sub_url:'https://i0.hdslb.com/bfs/wbi/'+'b'.repeat(32)+'.png'}}}});
    if(operation!==6)throw Error('fixture.account_write_or_extra_route_forbidden');
    pgcReads++;if(pgcHold)await new Promise<void>(resolve=>{release=resolve;});
    const [,type,pn]=value.split('|'),pageNumber=Number(pn),total=mode==='empty'?0:type==='1'?6:1;
    const list=Array.from({length:Math.max(0,Math.min(4,total-(pageNumber-1)*4))},(_,i)=>({season_id:pageNumber*10+i+100,title:(type==='1'?'合成追番':'合成追剧')+' '+((pageNumber-1)*4+i+1),new_ep:{index_show:'更新至第12集'},progress:'看到第3集'}));
    return r.fulfill({json:{code:mode==='pgc-error'?-352:0,data:{total,list}}});
  });
  await page.addInitScript(()=>{
    const secret=JSON.stringify({schema:1,id:'bili_101',uid:'101',name:'合成账号',expiresAt:Date.now()+600000,cookieLines:'.bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic-only\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\tsynthetic-csrf\n.bilibili.com\tTRUE\t/\tTRUE\t0\tDedeUserID\t101\n'});
    Object.assign(globalThis,{tizen:{keymanager:{getData({name}:{name:string}){if(name!=='bilisofa.session.v1.slot0')throw {name:'NotFoundError'};return secret;},saveData(){throw Error('fixture.save_forbidden');},removeData(){throw Error('fixture.remove_forbidden');}}}});
    localStorage.setItem('bilisofa.w01.progress-once.v1','unknown');
  });
  const errors=await mediaSetup(page,false);
  const season=readFileSync('tests/w04-media-ui/vod-api-fixture.js','utf8').replace('__PGC__','1').replace("_vod_import_cookies(){throw Error('guest fixture must remain anonymous');}","_vod_import_cookies(){return 1;}").replace("code:-101,data:{isLogin:false","code:0,data:{isLogin:true,mid:101").replace('login:0,area_limit:0,follow:0','login:1,area_limit:0,follow:1');
  await page.route('**/pgc-read/probe.js',r=>r.fulfill({contentType:'text/javascript',body:season}));
  return {mode:(value:string)=>{mode=value;},updates:()=>updateReads,pgcs:()=>pgcReads,commands:()=>commands,errors,hold:(value:boolean)=>{pgcHold=value;},release:()=>release()};
}
async function use(page:Page){await page.getByRole('button',{name:'账号',exact:true}).click();await page.getByRole('button',{name:'使用 合成账号',exact:true}).click();await expect(page.locator('[data-focus-id=nav-home]')).toHaveAttribute('aria-current','page');}
async function open(page:Page,route='following'){await page.locator('[data-focus-id=nav-'+route+']').click();}
const cards=(page:Page)=>page.locator('.tv-following .tv-library-grid button');
const status=(page:Page)=>page.locator('.tv-following .tv-status');
test('guest has useful search and login, private tabs inert and no private reads',async({page})=>{
  const f=await setup(page);await open(page);await expect(page.getByRole('button',{name:'登录查看关注与已追列表',exact:true})).toBeEnabled();
  await expect(page.locator('.tv-following-tabs button')).toHaveCount(3);await expect(page.locator('.tv-following-tabs button:enabled')).toHaveCount(0);
  await page.getByRole('button',{name:'查找UP主',exact:true}).click();await expect(page.locator('[data-focus-id=search-type-up]')).toHaveAttribute('aria-pressed','true');
  await open(page,'catalog');await expect(page.getByRole('button',{name:'搜索番剧影视',exact:true})).toBeFocused();await page.screenshot({path:'.local/u2-following/catalog-guest.png'});
  await page.keyboard.press('ArrowDown');await expect(page.getByRole('button',{name:'登录查看关注与已追列表',exact:true})).toBeFocused();
  await page.getByRole('button',{name:'搜索番剧影视',exact:true}).click();await expect(page.locator('[data-focus-id=search-type-pgc]')).toHaveAttribute('aria-pressed','true');expect(f.updates()).toBe(0);expect(f.pgcs()).toBe(0);expect(f.errors).toEqual([]);
});
test('real update Worker provides text-only summaries, bounded paging/refresh and original card Back',async({page})=>{
  const f=await setup(page);await use(page);await open(page);await expect(cards(page)).toHaveCount(4);
  await expect(page.locator('.tv-source-note')).toContainText('完整动态暂不可用');await cards(page).nth(1).focus();await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toContainText('本页仅提供更新摘要');await expect(page.getByRole('dialog').getByRole('button',{name:'播放',exact:true})).toHaveCount(0);
  await page.keyboard.press('Escape');await expect(cards(page).nth(1)).toBeFocused();
  await page.getByRole('button',{name:'下一页',exact:true}).click();await expect(cards(page)).toHaveCount(1);
  await page.getByRole('button',{name:'下一页',exact:true}).click();await expect(cards(page)).toHaveCount(2);await expect(page.getByRole('button',{name:'下一页',exact:true})).toBeDisabled();expect(f.updates()).toBe(2);
  await page.getByRole('button',{name:'上一页',exact:true}).click();await expect(cards(page)).toHaveCount(1);
  await page.getByRole('button',{name:'刷新',exact:true}).click();await expect(cards(page)).toHaveCount(4);await expect(status(page)).toContainText('第 1 页');
  await page.screenshot({path:'.local/u2-following/following.png'});await expect(page.locator('.tv-following img')).toHaveCount(0);await expect(page.locator('body')).not.toContainText('outside.invalid');expect(f.errors).toEqual([]);
});
test('followed PGC types have separate pages/anchors, normalized counts and season close before play',async({page})=>{
  const f=await setup(page);await use(page);await open(page,'catalog');await expect(cards(page)).toHaveCount(4);await expect(status(page)).toContainText('共 6 项');
  await page.getByRole('button',{name:'下一页',exact:true}).click();await expect(cards(page)).toHaveCount(2);await cards(page).nth(1).focus();
  await page.locator('[data-focus-id=following-tab-drama]').click();await expect(cards(page)).toHaveCount(1);await expect(cards(page).first()).toContainText('合成追剧');await expect(page.getByRole('button',{name:'下一页',exact:true})).toBeDisabled();
  await page.locator('[data-focus-id=following-tab-bangumi]').click();await expect(status(page)).toContainText('第 2 页');await expect(cards(page).nth(1)).toBeFocused();
  await cards(page).nth(1).click();await expect(page.getByRole('dialog')).toContainText('看到第3集');await page.getByRole('button',{name:'查看选集与播放',exact:true}).click();
  await expect(page.locator('.pgc-episode-grid button')).toHaveCount(4);await expect(page.locator('.tv-library-detail')).toHaveCount(0);
  await page.locator('.pgc-episode-grid button').first().click();await expect(page.getByRole('button',{name:'暂停 / 继续',exact:true})).toBeEnabled();await expect(page.locator('.tv-library-detail')).toHaveCount(0);
  await page.getByRole('button',{name:'返回原卡',exact:true}).click();await page.locator('[data-focus-id=pgc-season-back]').click();await expect(cards(page).nth(1)).toBeFocused();
  expect(f.commands().every(c=>c===0||c===6)).toBe(true);expect(f.errors).toEqual([]);
});
test('focus graph and same-card restoration survive root navigation without a page stack',async({page})=>{
  await setup(page);await use(page);await open(page,'catalog');await expect(cards(page)).toHaveCount(4);
  await cards(page).first().focus();await page.keyboard.press('ArrowUp');await expect(page.locator('[data-focus-id=following-tab-bangumi]')).toBeFocused();await page.keyboard.press('ArrowDown');await expect(cards(page).first()).toBeFocused();
  await page.keyboard.press('ArrowRight');await page.keyboard.press('Escape');await expect(page.locator('[data-focus-id=nav-catalog]')).toBeFocused();await page.keyboard.press('ArrowRight');await expect(cards(page).nth(1)).toBeFocused();
  await page.getByRole('button',{name:'首页',exact:true}).click();await open(page,'catalog');await expect(cards(page).nth(1)).toBeFocused();await page.screenshot({path:'.local/u2-following/catalog.png'});
});
test('switch away from a pending update drains close; late old data cannot overwrite followed PGC or rail focus',async({page})=>{
  const f=await setup(page);await use(page);f.mode('hold');await open(page);await expect.poll(()=>f.updates()).toBe(1);
  await page.locator('[data-focus-id=following-tab-bangumi]').click();await page.locator('[data-focus-id=nav-following]').focus();await expect(cards(page)).toHaveCount(4);await expect(cards(page).first()).toContainText('合成追番');await expect(page.locator('[data-focus-id=nav-following]')).toBeFocused();expect(f.errors).toEqual([]);
});
test('ordinary refusal/empty are recoverable and no automatic retry or invented recommendation',async({page})=>{
  const f=await setup(page);await use(page);f.mode('api');await open(page);await expect(status(page)).toContainText('follow.network');expect(f.updates()).toBe(1);await expect(page.getByRole('button',{name:'刷新',exact:true})).toBeEnabled();
  f.mode('empty');await page.getByRole('button',{name:'刷新',exact:true}).click();await expect(status(page)).toContainText('暂无关注更新');await expect(page.getByRole('button',{name:'下一页',exact:true})).toBeDisabled();
  await open(page,'catalog');await expect(status(page)).toContainText('暂无我的追番');await expect(cards(page)).toHaveCount(0);await expect(page.getByRole('button',{name:'搜索番剧影视',exact:true})).toBeEnabled();expect(f.commands().every(c=>c===0||c===6)).toBe(true);
});
test('authority loss removes private cards without an owner/workspace close deadlock',async({page})=>{
  const f=await setup(page);await use(page);f.mode('mismatch');await open(page);
  await expect(page.getByRole('heading',{name:'今天，想看什么？',exact:true})).toBeVisible();await expect(page.locator('.tv-following')).toHaveCount(0);await open(page);await expect(page.getByRole('button',{name:'登录查看关注与已追列表',exact:true})).toBeVisible();await expect(cards(page)).toHaveCount(0);await expect(page.locator('[data-focus-id=following-refresh]')).toBeHidden();expect(f.updates()).toBe(1);expect(f.errors).toEqual([]);
});
test('unconfirmed native close blocks refresh, replacement reads and route reuse',async({page})=>{
  const f=await setup(page);await use(page);f.mode('unclosed');await open(page);await expect(status(page)).toContainText('资源关闭未确认');await expect(page.getByRole('button',{name:'刷新',exact:true})).toBeDisabled();await expect(page.locator('.tv-following-tabs button:enabled')).toHaveCount(0);await expect(page.getByRole('button',{name:'查找UP主',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'首页',exact:true}).click();await expect(page.locator('#pages')).toContainText('请重新打开应用');expect(f.updates()).toBe(1);expect(f.pgcs()).toBe(0);
});
test('Home cancels PGC native lane, revalidates account and resets old private page cursor',async({page})=>{
  const f=await setup(page);await use(page);await open(page,'catalog');await expect(cards(page)).toHaveCount(4);await page.getByRole('button',{name:'下一页',exact:true}).click();await expect(status(page)).toContainText('第 2 页');
  f.hold(true);await page.getByRole('button',{name:'上一页',exact:true}).click();await expect.poll(()=>f.pgcs()).toBe(3);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.locator('#pages')).toBeEmpty();f.hold(false);f.release();
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await expect(status(page)).toContainText('第 1 页');await expect(cards(page)).toHaveCount(4);expect((await snapshot(page)).state).toBe('NONE');expect(await page.evaluate(()=>localStorage.getItem('bilisofa.w01.progress-once.v1'))).toBe('unknown');expect(f.errors).toEqual([]);
});
