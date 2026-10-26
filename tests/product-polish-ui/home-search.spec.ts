import {test,expect,type Page} from '@playwright/test';
import {setup} from '../w04-media-ui/fixture.ts';
// ADR-116: the home shows its last snapshot first, categories are direct entries, search opens on 综合 and the
// dictionary Worker is made once for the app.
const card=(i:number)=>({bvid:'BVS'+String(i).padStart(9,'0'),title:'上次的视频'+i,owner:'合成UP',durationSec:60,views:10});
async function seed(page:Page,shelves:Record<string,number>){
 await page.addInitScript(s=>{try{const at=Date.now(),doc:{schema:1;shelves:Record<string,unknown>}={schema:1,shelves:{}};
  for(const [key,n] of Object.entries(s))doc.shelves[key]={at,cards:Array.from({length:n},(_,i)=>({bvid:'BVS'+String(i).padStart(9,'0'),title:'上次的视频'+i,owner:'合成UP',durationSec:60,views:10}))};
  if(!sessionStorage.getItem('seeded')){localStorage.setItem('bilisofa.home-snapshot.v1',JSON.stringify(doc));sessionStorage.setItem('seeded','1');}}catch{}},shelves);
}
/** Holds the public kernel's messages until released, so a row stays on its snapshot. */
async function holdKernel(page:Page){
 await page.addInitScript(()=>{const Native=window.Worker,post=Native.prototype.postMessage,held:[Worker,unknown[]][]=[],lanes=new WeakSet<Worker>();let open=false;
  (window as unknown as {releaseLanes():void}).releaseLanes=()=>{open=true;for(const [w,a] of held.splice(0))post.apply(w,a as [unknown]);};
  window.Worker=class extends Native{constructor(url:string|URL,options?:WorkerOptions){super(url,options);if(/public-kernel-worker/.test(String(url)))lanes.add(this);}} as typeof Worker;
  Native.prototype.postMessage=function(this:Worker,...args:unknown[]){if(!open&&lanes.has(this)){held.push([this,args]);return;}return post.apply(this,args as [unknown]);};});
}
test('ADR-116 a snapshot shows at once without skeletons, then the fresh row replaces it in place and keeps the focus',async({page})=>{
 await seed(page,{popular:6});await holdKernel(page);const errors=await setup(page,false);
 const first=page.locator('.tv-shelf').first();await expect(page.locator(`[data-focus-id=shelf-popular-${card(0).bvid}]`)).toBeFocused();
 await expect(first.locator('.tv-card-skeleton')).toHaveCount(0);await expect(first.locator('.tv-card')).toHaveCount(6);
 await page.evaluate(()=>(window as unknown as {releaseLanes():void}).releaseLanes());
 await expect(page.locator(`[data-focus-id=shelf-popular-${card(0).bvid}]`)).toHaveCount(0);
 await expect(first.locator('.tv-card').first()).toBeFocused();await expect(first.locator('.tv-card').first()).not.toContainText('上次的视频');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('bilisofa.home-snapshot.v1')??'{}'));
 expect(saved.shelves.popular.cards.length).toBeGreaterThan(0);expect(JSON.stringify(saved)).not.toContain('上次的视频');expect(errors).toEqual([]);
});
test('ADR-116 a row whose refresh fails keeps its snapshot and says it is the last one',async({page})=>{
 // The synthetic ranking read fails (see home.spec.ts); with a snapshot the row stays and is labelled.
 await seed(page,{ranking:4});const errors=await setup(page,false);await expect(page.locator('[data-focus-id^=shelf-popular-]').first()).toBeFocused();
 const ranking=page.locator('.tv-shelf').filter({has:page.locator('[data-focus-id=shelf-more-ranking]')});
 await expect(ranking.locator('.tv-shelf-status')).toHaveText('显示的是上次的内容');await expect(ranking.locator('.tv-card')).toHaveCount(4);
 await expect(page.locator('[data-focus-id=shelf-retry-ranking]')).toBeHidden();expect(errors).toEqual([]);
});
test('ADR-116 the categories are one row of direct entries under the rankings',async({page})=>{
 const errors=await setup(page,false);await expect(page.locator('[data-focus-id^=shelf-popular-]').first()).toBeFocused();
 await expect(page.locator('.tv-category-row button')).toHaveCount(14);await expect(page.locator('[data-focus-id=shelf-categories]')).toHaveCount(0);
 await page.locator('[data-focus-id=shelf-category-1005]').click();await expect(page.locator('.tv-grid')).toBeVisible();
 await expect(page.locator('#overlays>section')).toHaveCount(0);await expect(page.locator('[data-focus-id=source-category]')).toHaveAttribute('aria-pressed','true');
 await page.keyboard.press('Escape');await expect(page.locator('[data-focus-id=shelf-category-1005]')).toBeFocused();expect(errors).toEqual([]);
});
test('ADR-116 search opens on 综合 with an UP row and a 番剧影视 row; “全部” opens that tab; the dictionary Worker is made once',async({page})=>{
 await page.addInitScript(()=>{const Native=window.Worker;(window as unknown as {dictionaries:number}).dictionaries=0;
  window.Worker=class extends Native{constructor(url:string|URL,options?:WorkerOptions){super(url,options);if(/initials-worker/.test(String(url)))(window as unknown as {dictionaries:number}).dictionaries++;}} as typeof Worker;});
 const errors=await setup(page,false);
 const type=async()=>{await page.locator('[data-focus-id=nav-search]').click();await page.locator('[data-focus-id=keyword-key-n]').click();await page.locator('[data-focus-id=keyword-key-h]').click();await expect(page.locator('[data-focus-id=keyword-candidate-0]')).toBeEnabled();};
 await type();await page.locator('[data-focus-id=keyword-candidate-0]').click();await expect(page.locator('[data-focus-id=search-card-0]')).toBeFocused();
 await expect(page.locator('[data-focus-id=search-type-all]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.tv-search-mixed-row')).toHaveCount(2);await expect(page.locator('.tv-search-mixed-row h3')).toHaveText(['UP主','番剧影视']);
 await page.locator('[data-focus-id=search-mixed-up-all]').click();await expect(page.locator('[data-focus-id=search-type-up]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('.tv-search-mixed-row')).toHaveCount(0);
 await page.locator('[data-focus-id=nav-home]').click();await expect(page.locator('[data-focus-id^=shelf-popular-]').first()).toBeVisible();
 await page.locator('[data-focus-id=nav-search]').click();await page.locator('[data-focus-id=keyword-clear]').click();await type();
 expect(await page.evaluate(()=>(window as unknown as {dictionaries:number}).dictionaries)).toBe(1);expect(errors).toEqual([]);
});
test('ADR-116 a row still loading is passed over: Up from 分区 reaches 热门, Down from 热门 reaches 分区',async({page})=>{
 // Hold only the ranking read, so 排行榜 stays on its skeletons.
 await page.addInitScript(()=>{const Native=window.Worker,post=Native.prototype.postMessage,lanes=new WeakSet<Worker>();
  window.Worker=class extends Native{constructor(url:string|URL,options?:WorkerOptions){super(url,options);if(/public-kernel-worker/.test(String(url)))lanes.add(this);}} as typeof Worker;
  Native.prototype.postMessage=function(this:Worker,...args:unknown[]){if(lanes.has(this)&&/ranking/.test(JSON.stringify(args[0]??'')))return;return post.apply(this,args as [unknown]);};});
 const errors=await setup(page,false);const popular=page.locator('[data-focus-id^=shelf-popular-]').first();await expect(popular).toBeFocused();
 const ranking=page.locator('.tv-shelf').nth(1); // a loading row has no 查看更多 yet
 await expect(ranking.locator('h2')).toHaveText('排行榜');await expect(ranking.locator('.tv-card-skeleton')).toHaveCount(5);await expect(ranking.locator('button')).toHaveCount(0);
 await page.locator('[data-focus-id=shelf-category-1005]').focus();await page.keyboard.press('ArrowUp');await expect(popular).toBeFocused();
 await page.keyboard.press('ArrowDown');await expect(page.locator('[data-focus-id=shelf-category-1005]')).toBeFocused();expect(errors).toEqual([]);
});
