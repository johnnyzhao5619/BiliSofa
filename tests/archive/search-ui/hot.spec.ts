import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const hotNative=readFileSync('tests/archive/search-ui/hot-native-fixture.js','utf8'),searchNative=readFileSync('tests/search-ui/native-fixture.js','utf8');
async function setup(page:Page,disabled=false){
 let mode='normal',hotReads=0,searchReads=0;
 await page.route('**/hot-search/manifest.json',r=>r.fulfill({contentType:'application/json',body:'{}'}));
 await page.route('**/hot-search/probe.js',r=>{hotReads++;return r.fulfill({contentType:'text/javascript',body:hotNative.replace('__VARIANT__',mode)});});
 await page.route('**/search/manifest.json',r=>r.fulfill({contentType:'application/json',body:'{}'}));
 await page.route('**/search/probe.js',r=>{searchReads++;return r.fulfill({contentType:'text/javascript',body:searchNative.replace('__VARIANT__','normal')});});
 if(disabled)await page.addInitScript(()=>localStorage.setItem('bilisofa.search.v1.guest',JSON.stringify({schema:1,enabled:false,terms:[]})));
 await page.goto('/');await expect(page.getByRole('button',{name:'管理账号'})).toBeFocused();
 return {mode:(value:string)=>{mode=value;},hotReads:()=>hotReads,searchReads:()=>searchReads};
}
const terms=(page:Page)=>page.locator('.hot-search-terms button');
const open=async(page:Page)=>{await page.getByRole('button',{name:'热搜',exact:true}).click();await expect(terms(page)).toHaveCount(6);};
test('W03 hot words explicit entry, two bounded pages, first-column focus and Back restore with inert markup',async({page},info)=>{
 const f=await setup(page);expect(f.hotReads()).toBe(0);await open(page);await expect(terms(page).first()).toBeFocused();await expect(terms(page).first()).toContainText('<img src=x');await expect(page.locator('img')).toHaveCount(0);
 await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowLeft');await expect(terms(page).first()).toBeFocused();await page.keyboard.press('ArrowDown');await expect(terms(page).nth(2)).toBeFocused();await page.keyboard.press('ArrowUp');await expect(terms(page).first()).toBeFocused();
 await expect(terms(page).last()).toBeInViewport({ratio:1});await page.screenshot({path:info.outputPath('hot-search.png')});await page.getByRole('button',{name:'下一组',exact:true}).click();await expect(terms(page)).toHaveCount(4);await expect(terms(page).first()).toContainText('第 7 名');await expect(page.getByRole('button',{name:'下一组',exact:true})).toBeDisabled();await page.getByRole('button',{name:'上一组',exact:true}).click();await expect(terms(page)).toHaveCount(6);expect(f.hotReads()).toBe(1);expect(f.searchReads()).toBe(0);expect(await page.evaluate(()=>Object.keys(localStorage))).toEqual([]);
 await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'热搜',exact:true})).toBeFocused();await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('W03 choosing hot word searches its keyword rather than display label and uses existing history partition',async({page})=>{
 const f=await setup(page);await open(page);expect(f.searchReads()).toBe(0);await terms(page).first().click();await expect(page.getByRole('heading',{name:'视频搜索：热词搜索0',exact:true})).toBeVisible();await expect(page.locator('.popular-grid button')).toHaveCount(4);expect(f.searchReads()).toBe(1);await expect(page.getByRole('dialog')).toHaveCount(0);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('bilisofa.search.v1.guest')!).terms)).toEqual(['热词搜索0']);await page.getByRole('button',{name:'搜索历史',exact:true}).click();await expect(page.getByRole('button',{name:'搜索：热词搜索0',exact:true})).toBeVisible();
});
test('W03 hot-word selection honors persisted recording-off state',async({page})=>{
 const f=await setup(page,true);await open(page);await terms(page).nth(1).click();await expect(page.locator('.popular-grid button')).toHaveCount(4);expect(f.searchReads()).toBe(1);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('bilisofa.search.v1.guest')!))).toEqual({schema:1,enabled:false,terms:[]});
});
test('W03 hot errors remove stale terms and only explicit refresh retries; API, malformed and empty remain bounded',async({page})=>{
 const f=await setup(page);await open(page);
 for(const [mode,message]of [['http','热搜读取失败（hot.http_412），可手动刷新'],['api','热搜接口暂不可用（API -352），可手动刷新'],['invalid','热搜读取失败（hot.invalid_response），可手动刷新'],['invalid-status','热搜读取失败（hot.invalid_response），可手动刷新'],['empty','暂无可搜索热词']]){
  f.mode(mode!);const before=f.hotReads();await page.getByRole('button',{name:'刷新热搜',exact:true}).click();await expect(page.getByRole('dialog').getByRole('status')).toHaveText(message!);await expect(terms(page)).toHaveCount(0);await expect(page.getByRole('button',{name:'刷新热搜',exact:true})).toBeFocused();await page.waitForTimeout(100);expect(f.hotReads()).toBe(before+1);
 }expect(f.searchReads()).toBe(0);expect(await page.evaluate(()=>Object.keys(localStorage))).toEqual([]);
});
test('W03 Back during hot-word native read waits for closure and rejects late terms without searching',async({page})=>{
 const f=await setup(page);f.mode('slow');await page.getByRole('button',{name:'热搜',exact:true}).click();await expect.poll(()=>f.hotReads()).toBe(1);await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('button',{name:'热搜',exact:true})).toBeFocused();expect(f.searchReads()).toBe(0);f.mode('normal');await open(page);expect(f.hotReads()).toBe(2);
});
test('W03 Home cancels hot-word read and foreground cannot consume stale selection',async({page})=>{
 const f=await setup(page);f.mode('slow');await page.getByRole('button',{name:'热搜',exact:true}).click();await expect.poll(()=>f.hotReads()).toBe(1);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.locator('#pages')).toBeEmpty();await page.waitForTimeout(800);await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.getByRole('button',{name:'热搜',exact:true})).toBeFocused();await expect(terms(page)).toHaveCount(0);expect(f.searchReads()).toBe(0);f.mode('normal');await open(page);expect(f.hotReads()).toBe(2);
});
