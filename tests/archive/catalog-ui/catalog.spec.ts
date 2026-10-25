import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const catalog=readFileSync('tests/catalog-ui/native-fixture.js','utf8'),media=readFileSync('tests/media-ui/native-fixture.js','utf8');
async function setup(page:Page){
 let variant='normal',reads=0;
 await page.route('**/catalog/manifest.json',r=>r.fulfill({contentType:'application/json',body:'{}'}));
 await page.route('**/catalog/probe.js',r=>{reads++;return r.fulfill({contentType:'text/javascript',body:catalog.replace('__VARIANT__',variant)});});
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
async function load(page:Page){await page.getByRole('button',{name:'读取全站排行榜'}).click();await expect(cards(page)).toHaveCount(4);await expect(cards(page).first()).toBeFocused();}
test('W03 actual catalog Worker displays safe ranked cards, caches all 25 pages, returns to page1 without refetch, refreshes explicitly',async({page},info)=>{
 const fixture=await setup(page);await load(page);await expect(cards(page).first()).toContainText('第 1 名');await expect(cards(page).first()).toContainText('<img src=x>');await expect(page.locator('img')).toHaveCount(0);await expect(page.getByRole('button',{name:'上一页'})).toBeDisabled();
 await expect(cards(page).last()).toBeInViewport({ratio:1});await expect(page.getByRole('button',{name:'下一页'})).toBeInViewport({ratio:1});await page.screenshot({path:info.outputPath('ranking.png')});
 await page.keyboard.press('ArrowRight');await expect(cards(page).nth(1)).toBeFocused();await page.keyboard.press('ArrowDown');await expect(cards(page).nth(3)).toBeFocused();await page.keyboard.press('ArrowLeft');await expect(cards(page).nth(2)).toBeFocused();
 for(let p=2;p<=25;p++){await page.getByRole('button',{name:'下一页'}).click();await expect(status(page)).toHaveText(`排行榜快照 · 第 ${p} 页`);await expect(cards(page).first()).toContainText(`第 ${(p-1)*4+1} 名`);}
 await expect(page.getByRole('button',{name:'下一页'})).toBeDisabled();expect(fixture.reads()).toBe(1);
 for(let p=24;p>=1;p--){await page.getByRole('button',{name:'上一页'}).click();await expect(status(page)).toHaveText(`排行榜快照 · 第 ${p} 页`);}
 expect(fixture.reads()).toBe(1);await load(page);expect(fixture.reads()).toBe(2);expect(await page.evaluate(()=>Object.keys(localStorage))).toHaveLength(0);
});
test('W03 failed explicit refresh removes stale cards and paging, empty result and retry remain operable',async({page})=>{
 const fixture=await setup(page);await load(page);fixture.mode('http');await page.getByRole('button',{name:'读取全站排行榜'}).click();await expect(status(page)).toHaveText('排行榜读取失败，请重试');await expect(cards(page)).toHaveCount(0);await expect(page.getByRole('button',{name:'下一页'})).toBeDisabled();await expect(page.getByRole('button',{name:'读取全站排行榜'})).toBeFocused();
 fixture.mode('api');await page.keyboard.press('Enter');await expect(status(page)).toHaveText('排行榜接口暂不可用（API -352），请稍后重试');await expect(cards(page)).toHaveCount(0);expect(fixture.reads()).toBe(3);fixture.mode('empty');await page.keyboard.press('Enter');await expect(status(page)).toHaveText('暂无内容');await expect(cards(page)).toHaveCount(0);fixture.mode('normal');await load(page);
});
test('W03 ranking card plays through existing media owner and Back restores exact card and ranking snapshot',async({page})=>{
 const fixture=await setup(page);await load(page);await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'暂停 / 继续'})).toBeEnabled();await expect(page.getByRole('timer')).toContainText('80.0');await page.keyboard.press('Escape');await expect(cards(page).nth(1)).toBeFocused();await expect(status(page)).toHaveText('排行榜快照 · 第 1 页');expect(fixture.reads()).toBe(1);
});
test('W03 Home cancels pending catalog, waits closure and rejects old response on foreground',async({page})=>{
 const fixture=await setup(page);fixture.mode('slow');await page.getByRole('button',{name:'读取全站排行榜'}).click();await expect(status(page)).toHaveText('正在读取');await expect.poll(()=>fixture.reads()).toBe(1);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.locator('#pages')).toBeEmpty();await page.waitForTimeout(650);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.getByRole('button',{name:'管理账号'})).toBeFocused();await expect(cards(page)).toHaveCount(0);fixture.mode('normal');await load(page);expect(fixture.reads()).toBe(2);
});

async function choose(page:Page,label='动画'){
 await page.getByRole('button',{name:'选择排行分区'}).click();await page.getByRole('button',{name:label,exact:true}).click();await expect(cards(page)).toHaveCount(4);
}
test('W03 category picker is remote-owned, bounded to three groups, Back preserves old list and selected anchor',async({page},info)=>{
 const fixture=await setup(page);await load(page);await page.getByRole('button',{name:'选择排行分区'}).click();await expect(page.getByRole('button',{name:'动画',exact:true})).toBeFocused();
 await page.keyboard.press('ArrowRight');await expect(page.getByRole('button',{name:'游戏',exact:true})).toBeFocused();await page.keyboard.press('ArrowDown');await expect(page.getByRole('button',{name:'音乐',exact:true})).toBeFocused();
 for(let i=0;i<2;i++)await page.getByRole('button',{name:'下一组',exact:true}).click();await expect(page.getByRole('button',{name:'下一组',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'动物',exact:true})).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'选择排行分区'})).toBeFocused();await expect(status(page)).toHaveText('排行榜快照 · 第 1 页');expect(fixture.reads()).toBe(1);
 await choose(page);await expect(page.getByRole('heading',{name:'动画 · 分区排行榜'})).toBeVisible();await page.getByRole('button',{name:'选择排行分区'}).click();await expect(page.getByRole('button',{name:'动画',exact:true})).toBeFocused();await page.screenshot({path:info.outputPath('category-picker.png')});
});
test('W03 category selection/page/refresh uses keyed snapshot and same media Back; footer remains visible',async({page},info)=>{
 const fixture=await setup(page);await choose(page);await expect(page.getByRole('button',{name:'刷新当前排行'})).toBeInViewport({ratio:1});await expect(page.getByRole('button',{name:'下一页'})).toBeInViewport({ratio:1});await page.screenshot({path:info.outputPath('category-results.png')});
 await page.getByRole('button',{name:'下一页'}).click();await expect(cards(page).first()).toContainText('第 5 名');await page.getByRole('button',{name:'上一页'}).click();expect(fixture.reads()).toBe(1);
 await cards(page).nth(1).click();await expect(page.getByRole('button',{name:'暂停 / 继续'})).toBeEnabled();await page.keyboard.press('Escape');await expect(cards(page).nth(1)).toBeFocused();await expect(page.getByRole('heading',{name:'动画 · 分区排行榜'})).toBeVisible();
 await page.getByRole('button',{name:'刷新当前排行'}).click();await expect(cards(page).first()).toBeFocused();expect(fixture.reads()).toBe(2);await choose(page,'游戏');await expect(page.getByRole('heading',{name:'游戏 · 分区排行榜'})).toBeVisible();expect(fixture.reads()).toBe(3);await load(page);expect(fixture.reads()).toBe(4);
});
test('W03 category external refusal clears cards, never retries; selection and explicit refresh remain recovery paths',async({page})=>{
 const fixture=await setup(page);await choose(page);fixture.mode('api');await page.getByRole('button',{name:'刷新当前排行'}).click();await expect(status(page)).toHaveText('排行榜接口暂不可用（API -352），请稍后重试');await expect(cards(page)).toHaveCount(0);await expect(page.getByRole('button',{name:'下一页'})).toBeDisabled();await expect(page.getByRole('button',{name:'选择排行分区'})).toBeFocused();expect(fixture.reads()).toBe(2);
 fixture.mode('empty');await page.getByRole('button',{name:'刷新当前排行'}).click();await expect(status(page)).toHaveText('暂无内容');fixture.mode('normal');await page.getByRole('button',{name:'刷新当前排行'}).click();await expect(cards(page)).toHaveCount(4);expect(fixture.reads()).toBe(4);
});
test('W03 category Home cancels native read and leaves no stale category cards on return',async({page})=>{
 const fixture=await setup(page);fixture.mode('slow');await page.getByRole('button',{name:'选择排行分区'}).click();await page.getByRole('button',{name:'动画',exact:true}).click();await expect(status(page)).toHaveText('正在读取');await expect.poll(()=>fixture.reads()).toBe(1);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.locator('#pages')).toBeEmpty();await page.waitForTimeout(650);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.getByRole('button',{name:'管理账号'})).toBeFocused();await expect(cards(page)).toHaveCount(0);fixture.mode('normal');await choose(page);expect(fixture.reads()).toBe(2);
});
