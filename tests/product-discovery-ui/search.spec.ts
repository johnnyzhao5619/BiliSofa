import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {setup as mediaSetup,snapshot} from '../w04-media-ui/fixture.ts';
const native=readFileSync('tests/search-ui/native-fixture.js','utf8');
async function setup(page:Page){
  const errors=await mediaSetup(page,false);
  let mode='normal',reads=0;
  await page.route('**/search/probe.js',r=>{reads++;return r.fulfill({contentType:'text/javascript',body:native.replace('__VARIANT__',mode)});});
  await page.route('**/hot-search/manifest.json',r=>r.fulfill({body:'{}'}));
  await page.route('**/hot-search/probe.js',r=>r.fulfill({contentType:'text/javascript',body:readFileSync('tests/search-ui/hot-native-fixture.js','utf8').replace('__VARIANT__','normal')}));
  await page.getByRole('button',{name:'搜索',exact:true}).click();
  return {errors,mode:(value:string)=>{mode=value;},reads:()=>reads};
}
const cards=(page:Page)=>page.locator('#pages .tv-search .tv-library-grid button');
const status=(page:Page)=>page.locator('.tv-search .tv-status');
async function keyword(page:Page){
  await page.locator('[data-focus-id=search-input]').click();
  await page.keyboard.type('nh');
  await expect(page.locator('[data-focus-id=keyword-candidate-0]')).toHaveText('你好');
  expect(await page.locator('[data-focus-id=keyword-key-a]').evaluate(node=>{const r=node.getBoundingClientRect();return node.contains(document.elementFromPoint(r.left+2,r.top+r.height/2));})).toBe(true);
  await page.screenshot({path:'.local/u2-search/search-keyword.png'});
  await page.locator('[data-focus-id=keyword-candidate-0]').click();
  await page.getByRole('button',{name:'确认关键词并搜索',exact:true}).click();
}
async function search(page:Page){await keyword(page);await expect(cards(page)).toHaveCount(4);}
test('shared keyword and per-type paging; normalized source text and no live type',async({page})=>{
  const fixture=await setup(page);await search(page);
  await expect(status(page)).toContainText('“你好” · 视频 · 第 1 页');
  await page.getByRole('button',{name:'下一页',exact:true}).click();await expect(status(page)).toContainText('第 2 页');
  await page.getByRole('button',{name:'UP主',exact:true}).click();await expect(cards(page).first()).toContainText('1000 粉丝');await expect(status(page)).toContainText('“你好” · UP主 · 第 1 页');
  await page.getByRole('button',{name:'番剧影视',exact:true}).filter({hasNot:page.locator('svg')}).click();
  await expect(cards(page).first()).toContainText('更新至第12话');await expect(status(page)).toContainText('“你好” · 番剧影视');
  await page.screenshot({path:'.local/u2-search/search-pgc.png'});
  await page.getByRole('button',{name:'视频',exact:true}).click();await expect(status(page)).toContainText('第 2 页');await expect(page.getByRole('button',{name:'下一页',exact:true})).toBeDisabled();
  await expect(page.locator('.tv-search-types button')).toHaveCount(3);expect(fixture.errors).toEqual([]);
});
test('remote graph, original-card detail return and rail anchor survive result refresh',async({page})=>{
  await setup(page);await search(page);await cards(page).first().focus();
  await page.keyboard.press('ArrowUp');await expect(page.getByRole('button',{name:'视频',exact:true})).toBeFocused();
  await page.keyboard.press('ArrowDown');await expect(cards(page).first()).toBeFocused();
  await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');await expect(cards(page).nth(1)).toBeFocused();
  await page.keyboard.press('Escape');await expect(page.locator('[data-focus-id=nav-search]')).toBeFocused();
  await page.keyboard.press('ArrowRight');await expect(cards(page).nth(1)).toBeFocused();
  await page.screenshot({path:'.local/u2-search/search-video.png'});
  await page.getByRole('button',{name:'刷新',exact:true}).click();await expect(status(page)).toContainText('第 1 页');
});
test('video and attached UP preview close detail before playing, then return to original card',async({page})=>{
  await setup(page);await search(page);await cards(page).first().click();await page.getByRole('button',{name:'播放',exact:true}).click();
  await expect(page.locator('[data-focus-id=vod-back]')).toBeVisible();await expect(page.locator('.tv-detail')).toHaveCount(0);
  await page.getByRole('button',{name:'返回原卡',exact:true}).click();await expect(cards(page).first()).toBeFocused();
  await page.getByRole('button',{name:'UP主',exact:true}).click();await expect(status(page)).toContainText('UP主 · 第 1 页');
  await cards(page).first().click();await expect(page.getByRole('dialog')).toContainText('没有附带视频预览');await page.keyboard.press('Escape');
  await cards(page).nth(1).click();await expect(page.getByRole('dialog')).toContainText('附带视频预览');await page.getByRole('button',{name:'播放',exact:true}).click();
  await expect(page.getByRole('button',{name:'暂停 / 继续',exact:true})).toBeEnabled();await expect(page.locator('.tv-detail')).toHaveCount(0);
  await page.getByRole('button',{name:'返回原卡',exact:true}).click();await expect(cards(page).nth(1)).toBeFocused();
});
test('PGC summary opens actual season workspace and returns to the same result without stacked summary',async({page})=>{
  await setup(page);await search(page);await page.locator('[data-focus-id=search-type-pgc]').click();await expect(status(page)).toContainText('番剧影视');
  await cards(page).nth(1).click();await expect(page.getByRole('dialog')).toContainText('评分 9.7');await page.getByRole('button',{name:'查看选集与播放',exact:true}).click();
  await expect(page.locator('[data-focus-id=pgc-season-back]')).toBeVisible();await expect(page.locator('.tv-detail')).toHaveCount(0);
  await page.locator('[data-focus-id=pgc-season-back]').click();await expect(cards(page).nth(1)).toBeFocused();
});
test('checked rejection has one read, manual recovery, empty results and no external executable markup',async({page})=>{
  const fixture=await setup(page);fixture.mode('http');await keyword(page);
  await expect(status(page)).toContainText('search.http_412');expect(fixture.reads()).toBe(1);await expect(cards(page)).toHaveCount(0);
  fixture.mode('empty');await page.getByRole('button',{name:'刷新',exact:true}).click();await expect(status(page)).toContainText('暂无结果');await expect(page.getByRole('button',{name:'下一页',exact:true})).toBeDisabled();
  fixture.mode('normal');await page.locator('[data-focus-id=search-type-up]').click();await expect(cards(page)).toHaveCount(4);
  await expect(cards(page).nth(2)).toContainText('<img src=x');await expect(cards(page).locator('img')).toHaveCount(0);expect(fixture.errors).toEqual([]);
});
test('switch during slow native read waits for close; only newest type renders and rail retains focus',async({page})=>{
  const fixture=await setup(page);fixture.mode('slow');await keyword(page);await expect.poll(()=>fixture.reads()).toBe(1);
  await page.locator('[data-focus-id=search-type-up]').click();await page.locator('[data-focus-id=search-type-pgc]').click();
  await page.locator('[data-focus-id=nav-search]').focus();await expect(status(page)).toContainText('“你好” · 番剧影视 · 第 1 页');
  await expect(page.locator('[data-focus-id=nav-search]')).toBeFocused();await expect(cards(page).first()).toContainText('更新至第12话');expect(fixture.reads()).toBe(2);expect(fixture.errors).toEqual([]);
});
test('Home drains pending search and rejects late result without touching local journal',async({page})=>{
  const fixture=await setup(page);await page.evaluate(()=>localStorage.setItem('bilisofa.w01.progress-once.v1','unknown'));
  fixture.mode('slow');await keyword(page);await expect.poll(()=>fixture.reads()).toBe(1);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await expect(page.locator('#pages')).toBeEmpty();
  fixture.mode('empty');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
  await expect(status(page)).toContainText('暂无结果');await expect(cards(page)).toHaveCount(0);expect(fixture.reads()).toBe(2);
  expect(await page.evaluate(()=>localStorage.getItem('bilisofa.w01.progress-once.v1'))).toBe('unknown');expect((await snapshot(page)).state).toBe('NONE');expect(fixture.errors).toEqual([]);
});
test('search history reuses keyword and changing keyword resets all type pages',async({page})=>{
  await setup(page);await search(page);await page.getByRole('button',{name:'下一页',exact:true}).click();await expect(status(page)).toContainText('第 2 页');
  await page.getByRole('button',{name:'搜索历史',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('你好');
  await page.screenshot({path:'.local/u2-search/search-history.png'});
  await page.locator('.history-panel button').filter({hasText:'你好'}).click();
  await expect(status(page)).toContainText('第 1 页');await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button',{name:'热搜',exact:true}).click();await expect(page.locator('[data-focus-id=hot-term-1]')).toBeVisible();await page.locator('[data-focus-id=hot-term-1]').click();
  await expect(status(page)).toContainText('“热词搜索1”');await expect(page.getByRole('dialog')).toHaveCount(0);
});
