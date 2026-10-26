import {test,expect} from '@playwright/test';
import {setup} from '../w04-media-ui/fixture.ts';
import {openDetail} from './polish-helpers.ts';
// ADR-114: skeleton rows, one-line failed rows, the card-only "小电视" focus; the backdrop stays off after the device check.
test('ADR-114 a loading row holds card-sized skeletons that its cards replace in place',async({page})=>{
 // Hold the public kernel's messages so the first row stays loading until the test lets it go.
 await page.addInitScript(()=>{const Native=window.Worker,post=Native.prototype.postMessage,held:[Worker,unknown[]][]=[],lanes=new WeakSet<Worker>();let open=false;
  (window as unknown as {releaseLanes():void}).releaseLanes=()=>{open=true;for(const [w,a] of held.splice(0))post.apply(w,a as [unknown]);};
  window.Worker=class extends Native{constructor(url:string|URL,options?:WorkerOptions){super(url,options);if(/public-kernel-worker/.test(String(url)))lanes.add(this);}} as typeof Worker;
  Native.prototype.postMessage=function(this:Worker,...args:unknown[]){if(!open&&lanes.has(this)){held.push([this,args]);return;}return post.apply(this,args as [unknown]);};});
 const errors=await setup(page,false);const shelf=page.locator('.tv-shelf').first();
 await expect(shelf.locator('.tv-card-skeleton')).toHaveCount(5);await expect(shelf).toHaveClass(/tv-shelf-loading/);
 await expect(shelf.locator('.tv-shelf-status')).toHaveText('正在加载');await expect(shelf.locator('.tv-card-skeleton [data-focus-id]')).toHaveCount(0);
 await page.waitForTimeout(300);await expect(shelf.locator('.tv-card-skeleton')).toHaveCount(5);
 const width=await shelf.locator('.tv-card-skeleton').first().evaluate(n=>(n as HTMLElement).offsetWidth);expect(width).toBeGreaterThan(0);
 await page.evaluate(()=>(window as unknown as {releaseLanes():void}).releaseLanes());const card=page.locator('[data-focus-id^=shelf-popular-]').first();await expect(card).toBeFocused();
 await expect(shelf.locator('.tv-card-skeleton')).toHaveCount(0);await expect(shelf).not.toHaveClass(/tv-shelf-loading/);
 expect(await card.evaluate(n=>(n as HTMLElement).offsetWidth)).toBe(width);expect(errors).toEqual([]);
});
test('ADR-114 a failed row is one line: the reason, then 重试 and 查看更多 as ordinary buttons',async({page})=>{
 const errors=await setup(page,false);await expect(page.locator('[data-focus-id^=shelf-popular-]').first()).toBeFocused();
 const shelf=page.locator('.tv-shelf').filter({has:page.locator('[data-focus-id=shelf-retry-ranking]')});await expect(shelf).toHaveClass(/tv-shelf-failed/);
 const box=async(selector:string)=>(await shelf.locator(selector).boundingBox())!;
 const status=await box('.tv-shelf-status'),retry=await box('[data-focus-id=shelf-retry-ranking]'),more=await box('[data-focus-id=shelf-more-ranking]');
 for(const b of [retry,more])expect(Math.abs((b.y+b.height/2)-(status.y+status.height/2))).toBeLessThan(12);
 expect(retry.x).toBeGreaterThan(status.x+status.width);expect(more.x).toBeGreaterThan(retry.x);expect(retry.height).toBeLessThan(100);expect(errors).toEqual([]);
});
test('ADR-114 only a focused content card grows antennas, and they stay when reduced motion drops the lift',async({page})=>{
 const errors=await setup(page,false);const card=page.locator('[data-focus-id^=shelf-popular-]').first();await expect(card).toBeFocused();
 const antennas=(selector:string)=>page.locator(selector).first().evaluate(n=>[getComputedStyle(n,'::before').content,getComputedStyle(n,'::after').content]);
 expect(await antennas('[data-focus-id^=shelf-popular-]')).toEqual(['""','""']);
 await page.locator('[data-focus-id=shelf-more-popular]').focus();expect(await antennas('[data-focus-id=shelf-more-popular]')).toEqual(['none','none']);
 expect(await antennas('[data-focus-id^=shelf-popular-]')).toEqual(['none','none']);
 await page.emulateMedia({reducedMotion:'reduce'});await card.focus();expect(await card.evaluate(n=>getComputedStyle(n).transform)).toBe('none');
 expect(await antennas('[data-focus-id^=shelf-popular-]')).toEqual(['""','""']);expect(errors).toEqual([]);
});
test('ADR-114 the backdrop is off (device check): no layer, even when a focused card has a loaded cover',async({page})=>{
 const errors=await setup(page,false);const cards=page.locator('[data-focus-id^=shelf-popular-]');await expect(cards.first()).toBeFocused();
 await cards.nth(1).evaluate(n=>{const c=document.createElement('canvas');c.width=16;c.height=9;c.toBlob(b=>{const image=document.createElement('img');image.src=URL.createObjectURL(b!);n.querySelector('.tv-card-picture')!.prepend(image);});});
 await expect(cards.nth(1).locator('img')).toHaveCount(1);await page.keyboard.press('ArrowRight');await expect(cards.nth(1)).toBeFocused();await page.waitForTimeout(500);
 await expect(page.locator('.tv-backdrop')).toHaveCount(0);
 await openDetail(page,cards.nth(1));await expect(page.locator('.tv-detail-page')).toBeVisible();await expect(page.locator('.tv-backdrop')).toHaveCount(0);expect(errors).toEqual([]);
});
