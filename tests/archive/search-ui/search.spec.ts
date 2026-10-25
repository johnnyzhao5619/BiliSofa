import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const searchNative=readFileSync('tests/search-ui/native-fixture.js','utf8'),media=readFileSync('tests/media-ui/native-fixture.js','utf8');
async function setup(page:Page){
 let variant='normal',reads=0;
 await page.route('**/search/manifest.json',r=>r.fulfill({contentType:'application/json',body:'{}'}));
 await page.route('**/search/probe.js',r=>{reads++;return r.fulfill({contentType:'text/javascript',body:searchNative.replace('__VARIANT__',variant)});});
 await page.route('**/native/manifest.json',r=>r.fulfill({contentType:'application/json',body:'{}'}));
 await page.route('**/native/probe.js',r=>r.fulfill({contentType:'text/javascript',body:media.replace('__VARIANT__','normal')}));
 await page.addInitScript(()=>{
  let state='NONE',listener:{oncurrentplaytime?:(time:number)=>void}={},time=0;
  setInterval(()=>{if(state==='PLAYING'){time+=100;listener.oncurrentplaytime?.(time);}},100);
  Object.assign(globalThis,{webapis:{avplay:{getState:()=>state,getDuration:()=>80000,open(){if(state!=='NONE')throw Error('fixture.overlap');state='IDLE';},setListener(v:typeof listener){listener=v;},setDisplayRect(){},prepareAsync(done:()=>void){state='READY';setTimeout(done,0);},play(){state='PLAYING';},pause(){state='PAUSED';},seekTo(ms:number,done:()=>void){time=ms;listener.oncurrentplaytime?.(time);done();},stop(){state='IDLE';},close(){state='NONE';}},appcommon:{AppCommonScreenSaverState:{SCREEN_SAVER_ON:1,SCREEN_SAVER_OFF:0},setScreenSaver(_v:number,done:()=>void){done();}}}});
 });
 await page.goto('/');await expect(page.getByRole('button',{name:'管理账号'})).toBeFocused();
 return {mode:(value:string)=>{variant=value;},reads:()=>reads};
}
const cards=(page:Page)=>page.locator('.popular-grid button');
const status=(page:Page)=>page.locator('#pages [role=status]');
async function input(page:Page){await page.getByRole('button',{name:'搜索视频 · 首字母输入'}).click();await expect(page.locator('[data-focus-id="keyword-key-a"]')).toBeFocused();}
async function choose(page:Page){await input(page);await page.keyboard.type('nh');await expect(page.locator('[data-focus-id="keyword-candidate-0"]')).toHaveText('你好');await page.locator('[data-focus-id="keyword-candidate-0"]').click();await expect(page.locator('[data-keyword-preview]')).toHaveText('你好');}
async function search(page:Page){await choose(page);await page.getByRole('button',{name:'确认关键词并搜索'}).click();await expect(cards(page)).toHaveCount(4);await expect(cards(page).first()).toBeFocused();}
test('W03 NH candidates keep both first columns reachable, selection never searches, explicit confirmation loads real Worker DTOs and pages',async({page},info)=>{
 const fixture=await setup(page);await input(page);await page.locator('[data-focus-id="keyword-key-n"]').click();await page.locator('[data-focus-id="keyword-key-h"]').click();await expect(page.locator('[data-focus-id="keyword-candidate-0"]')).toHaveText('你好');
 await expect(page.getByRole('button',{name:'确认关键词并搜索'})).toBeInViewport({ratio:1});await expect(page.locator('[data-focus-id="keyword-key-9"]')).toBeInViewport({ratio:1});await page.screenshot({path:info.outputPath('input.png')});
 await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');await expect(page.locator('[data-focus-id="keyword-candidate-0"]')).toBeFocused();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowLeft');await expect(page.locator('[data-focus-id="keyword-candidate-0"]')).toBeFocused();await page.keyboard.press('ArrowDown');await expect(page.locator('[data-focus-id="keyword-candidate-4"]')).toBeFocused();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowLeft');await expect(page.locator('[data-focus-id="keyword-candidate-4"]')).toBeFocused();await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');expect(fixture.reads()).toBe(0);await expect(page.locator('[data-keyword-preview]')).toHaveText('你好');
 await page.getByRole('button',{name:'确认关键词并搜索'}).click();await expect(cards(page)).toHaveCount(4);await expect(page.getByRole('heading',{name:'视频搜索：你好'})).toBeVisible();await expect(cards(page).first()).toContainText('你好合成视频');await expect(page.locator('em')).toHaveCount(0);await expect(page.locator('img')).toHaveCount(0);await expect(cards(page).last()).toBeInViewport({ratio:1});await page.screenshot({path:info.outputPath('results.png')});
 await page.getByRole('button',{name:'下一页',exact:true}).click();await expect(status(page)).toHaveText('第 2 页');await expect(page.getByRole('button',{name:'下一页',exact:true})).toBeDisabled();await page.getByRole('button',{name:'上一页',exact:true}).click();await expect(status(page)).toHaveText('第 1 页');expect(fixture.reads()).toBe(3);expect(await page.evaluate(()=>Object.keys(localStorage))).toEqual(['bilisofa.search.v1.guest']);
});
test('W03 Back clears letters before closing input, restores entry, and composition cannot trigger search',async({page})=>{
 const fixture=await setup(page);await input(page);await page.keyboard.type('zg');await expect(page.locator('[data-keyword-buffer]')).toHaveText('ZG');await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toBeVisible();await expect(page.locator('[data-keyword-buffer]')).toContainText('输入词语首字母');await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'搜索视频 · 首字母输入'})).toBeFocused();
 await choose(page);await page.getByRole('button',{name:'确认关键词并搜索'}).focus();await page.evaluate(()=>document.dispatchEvent(new CompositionEvent('compositionstart')));await page.keyboard.press('Enter');expect(fixture.reads()).toBe(0);await expect(page.getByRole('dialog')).toBeVisible();await page.evaluate(()=>document.dispatchEvent(new CompositionEvent('compositionend')));await page.waitForTimeout(150);await page.getByRole('button',{name:'取消',exact:true}).click();await expect(page.getByRole('button',{name:'搜索视频 · 首字母输入'})).toBeFocused();expect(fixture.reads()).toBe(0);
});
test('W03 video result plays through old media lane and Back returns to the same search card',async({page})=>{
 await setup(page);await search(page);await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'暂停 / 继续'})).toBeEnabled();await expect(page.getByRole('timer')).toContainText('80.0');await page.keyboard.press('Escape');await expect(cards(page).nth(1)).toBeFocused();await expect(page.getByRole('heading',{name:'视频搜索：你好'})).toBeVisible();
});
test('W03 API rejection and empty results clear stale cards and keep input retry reachable',async({page})=>{
 const fixture=await setup(page);await search(page);fixture.mode('api');await choose(page);await page.getByRole('button',{name:'确认关键词并搜索'}).click();await expect(status(page)).toHaveText('视频搜索接口暂不可用（API -352），请稍后重试');await expect(cards(page)).toHaveCount(0);await expect(page.getByRole('button',{name:'重试当前搜索'})).toBeFocused();await expect(page.getByRole('button',{name:'下一页',exact:true})).toBeDisabled();
 fixture.mode('http');await choose(page);await page.getByRole('button',{name:'确认关键词并搜索'}).click();await expect(status(page)).toHaveText('视频搜索读取失败（search.http_412），请重试');await expect(cards(page)).toHaveCount(0);fixture.mode('empty');await choose(page);await page.getByRole('button',{name:'确认关键词并搜索'}).click();await expect(status(page)).toHaveText('暂无内容');await expect(cards(page)).toHaveCount(0);
});
test('W03 Home cancels native search, rejects late results and does not retain keyword on foreground',async({page})=>{
 const fixture=await setup(page);fixture.mode('slow');await choose(page);await page.getByRole('button',{name:'确认关键词并搜索'}).click();await expect(status(page)).toHaveText('正在读取');await expect.poll(()=>fixture.reads()).toBe(1);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.locator('#pages')).toBeEmpty();await page.waitForTimeout(750);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.getByRole('button',{name:'管理账号'})).toBeFocused();await expect(cards(page)).toHaveCount(0);await input(page);await expect(page.locator('[data-keyword-preview]')).toHaveText('尚未选择关键词');await expect(page.locator('[data-keyword-buffer]')).toContainText('输入词语首字母');
});
test('W03 real search Worker accepts official unpadded duration and returns a normal four-card page',async({page})=>{
 const fixture=await setup(page);fixture.mode('unpadded');await search(page);await expect(cards(page).first()).toContainText('308 秒');await expect(status(page)).toHaveText('第 1 页');expect(fixture.reads()).toBe(1);await expect(page.getByRole('button',{name:'重试当前搜索'})).toBeHidden();
});
test('W03 real search Worker emits closed fixed field reasons and never exposes raw data or auto retries',async({page})=>{
 const fixture=await setup(page);
 for(const [mode,issue]of [['wrong-page','pagination'],['bad-duration','duration'],['bad-views','views'],['invalid-status','native'],['invalid-bounds','native'],['invalid-utf8','utf8'],['invalid-json','json']]){
  fixture.mode(mode!);const before=fixture.reads();await choose(page);await page.getByRole('button',{name:'确认关键词并搜索'}).click();await expect(status(page)).toHaveText(`视频搜索读取失败（search.invalid_response_${issue}），请重试`);await expect(cards(page)).toHaveCount(0);await expect(page.getByRole('button',{name:'重试当前搜索'})).toBeFocused();await page.waitForTimeout(75);expect(fixture.reads()).toBe(before+1);await expect(status(page)).not.toContainText('outside');
 }
 fixture.mode('normal');await page.getByRole('button',{name:'重试当前搜索'}).click();await expect(cards(page)).toHaveCount(4);
});
test('W03 anonymous WBI setup stops on nav HTTP/TLS/identity or invalid public material without querying or falling back',async({page})=>{
 const fixture=await setup(page);
 for(const [mode,code]of [['nav-http','search.nav_http_412'],['nav-tls','search.nav_transport_60'],['nav-invalid','search.invalid_response_public_keys'],['nav-login','search.invalid_response_public_keys']]){
  fixture.mode(mode!);const before=fixture.reads();await choose(page);await page.getByRole('button',{name:'确认关键词并搜索'}).click();await expect(status(page)).toHaveText(`视频搜索读取失败（${code}），请重试`);await expect(cards(page)).toHaveCount(0);await expect(page.getByRole('button',{name:'重试当前搜索'})).toBeFocused();await page.waitForTimeout(80);expect(fixture.reads()).toBe(before+1);
 }
 fixture.mode('normal');await page.getByRole('button',{name:'重试当前搜索'}).click();await expect(cards(page)).toHaveCount(4);
});
