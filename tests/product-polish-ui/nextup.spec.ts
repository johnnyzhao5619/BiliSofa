import {test,expect} from '@playwright/test';
import {snapshot} from '../w04-media-ui/fixture.ts';
import {start,settings} from './polish-helpers.ts';
const end=(page:import('@playwright/test').Page)=>page.evaluate(()=>(globalThis as unknown as{mediaFixture:{end():void}}).mediaFixture.end());
test('ADR-090 E1 the next part of the same video starts after a 5 s countdown',async({page})=>{
 const errors=await start(page);const opened=(await snapshot(page)).opened;await end(page);
 await expect(page.locator('.tv-next-up')).toContainText('即将播放：P2');await expect(page.locator('[data-focus-id=vod-next-now]')).toBeFocused();
 await expect.poll(async()=>(await snapshot(page)).opened,{timeout:8000}).toBe(opened+1);await expect(page.locator('.tv-player-title')).toContainText('P2');await expect(page.locator('.tv-next-up')).toHaveCount(0);expect(errors).toEqual([]);
});
test('ADR-090 Back cancels the countdown and stays on the finished item; 立即播放 skips the wait',async({page})=>{
 const errors=await start(page);const opened=(await snapshot(page)).opened;await end(page);await expect(page.locator('.tv-next-up')).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.locator('.tv-next-up')).toHaveCount(0);await page.waitForTimeout(5600);expect((await snapshot(page)).opened).toBe(opened);
 await expect(page.getByRole('button',{name:'从头重播',exact:true})).toBeFocused();
 await page.getByRole('button',{name:'从头重播',exact:true}).click();await expect.poll(async()=>(await snapshot(page)).state).toBe('PLAYING');const replayed=(await snapshot(page)).opened;await end(page);
 await page.locator('[data-focus-id=vod-next-now]').click();await expect.poll(async()=>(await snapshot(page)).opened,{timeout:2000}).toBe(replayed+1);expect(errors).toEqual([]);
});
test('ADR-090 with 连播 turned off in settings the video ends without a countdown',async({page})=>{
 const errors=await start(page);await settings(page);await page.getByRole('button',{name:'连播：开启',exact:true}).click();await expect(page.getByRole('button',{name:'连播：关闭',exact:true})).toBeVisible();await page.keyboard.press('Escape');
 const opened=(await snapshot(page)).opened;await end(page);await expect(page.getByRole('button',{name:'从头重播',exact:true})).toBeVisible();await page.waitForTimeout(5600);
 await expect(page.locator('.tv-next-up')).toHaveCount(0);expect((await snapshot(page)).opened).toBe(opened);expect(errors).toEqual([]);
});
