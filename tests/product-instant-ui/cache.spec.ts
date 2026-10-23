import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {setup as media} from '../w04-media-ui/fixture.ts';
const native=readFileSync('tests/media-ui/native-fixture.js','utf8').replace('__VARIANT__','normal');
const grid=(p:Page)=>p.locator('#pages .tv-stream-grid');
async function catalog(page:Page,fail=false){const errors=await media(page,false);let calls=0;await page.route('**/native/probe.js',r=>{calls++;return r.fulfill({contentType:'text/javascript',body:native.replace("no_more:args[1] === '2'","no_more:Number(args[1]) >= 20").replace("'BV' + (args[1] === '2' ? 'B' : 'A') + String(i).padStart(9,'0')","'BV' + String(Number(args[1])*10+i).padStart(10,'0')").replace('json({code:0,data:{no_more:',`json({code:${fail?"args[1] === '3'?-352:0":'0'},data:{no_more:`)});});await page.reload();await expect(grid(page).locator('button')).toHaveCount(8);return {errors,calls:()=>calls};}

test('Up and forward reuse cached batches without another backend load; refresh invalidates and Home releases',async({page})=>{
 const f=await catalog(page),cards=grid(page).locator('button');await cards.nth(4).focus();await expect(cards).toHaveCount(12);await cards.nth(8).focus();await expect(grid(page)).toHaveAttribute('data-window-pages','2,3,4');const calls=f.calls();await cards.first().focus();await page.keyboard.press('ArrowUp');await expect(grid(page)).toHaveAttribute('data-window-pages','1,2,3');expect(f.calls()).toBe(calls);await cards.nth(8).focus();await expect(grid(page)).toHaveAttribute('data-window-pages','2,3,4');expect(f.calls()).toBe(calls);await page.screenshot({path:'.local/u4-direct/cache.png'});await page.locator('[data-focus-id=home-refresh]').click();await expect.poll(f.calls).toBeGreaterThan(calls);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});expect(f.errors).toEqual([]);
});
test('cache stays bounded to eight batches while DOM stays twelve cards',async({page})=>{
 const f=await catalog(page),cards=grid(page).locator('button');for(let end=3;end<=9;end++){await cards.nth(4).focus();await expect.poll(async()=>Number((await grid(page).getAttribute('data-window-pages'))!.split(',').at(-1))).toBeGreaterThanOrEqual(end);await cards.last().focus();await page.keyboard.press('ArrowDown');}await expect.poll(async()=>Number(await grid(page).getAttribute('data-cached-pages'))).toBeLessThanOrEqual(8);expect(await cards.count()).toBeLessThanOrEqual(12);expect(f.errors).toEqual([]);
});

test('expired detached batch is fetched once instead of serving indefinitely stale data',async({page})=>{
 const f=await catalog(page),cards=grid(page).locator('button');await cards.nth(4).focus();await expect(cards).toHaveCount(12);await cards.nth(8).focus();await expect(grid(page)).toHaveAttribute('data-window-pages','2,3,4');const calls=f.calls();await page.evaluate(()=>{const now=performance.now.bind(performance);performance.now=()=>now()+300001;});await cards.first().focus();await page.keyboard.press('ArrowUp');await expect(grid(page)).toHaveAttribute('data-window-pages','1,2,3');expect(f.calls()).toBe(calls+1);expect(f.errors).toEqual([]);
});
