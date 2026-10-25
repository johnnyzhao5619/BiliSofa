import {test,expect} from '@playwright/test';
import {snapshot} from '../../w04-media-ui/fixture.ts';
import {longVideo,mediaKey,seeks,waitHidden} from '../../product-remote-ui/remote-helpers.ts';
test('ADR-088 Play/Pause, Play, Pause and Stop media keys act on local playback; Stop returns to the original card',async({page})=>{
 const errors=await longVideo(page);
 await mediaKey(page,10252);await expect.poll(async()=>(await snapshot(page)).state).toBe('PAUSED');
 await mediaKey(page,19);await page.waitForTimeout(300);expect((await snapshot(page)).state).toBe('PAUSED');
 await mediaKey(page,415);await expect.poll(async()=>(await snapshot(page)).state).toBe('PLAYING');
 await mediaKey(page,415);await page.waitForTimeout(300);expect((await snapshot(page)).state).toBe('PLAYING');
 await mediaKey(page,413);await expect.poll(async()=>(await snapshot(page)).state).toBe('NONE');await expect(page.locator('.tv-grid .tv-card').first()).toBeFocused();expect(errors).toEqual([]);
});
test('ADR-088 Fast-forward and Rewind preview by the 10 s default and commit one seek after the remote is idle',async({page})=>{
 const errors=await longVideo(page);await expect.poll(async()=>(await snapshot(page)).time).toBeGreaterThanOrEqual(1000);const before=await seeks(page),start=(await snapshot(page)).time;
 await mediaKey(page,417);await page.waitForTimeout(300);await mediaKey(page,417);await page.waitForTimeout(700);expect(await seeks(page)).toBe(before);
 await expect(page.locator('[data-focus-id=player-timeline]')).toBeFocused();await expect(page.locator('.tv-player-time')).toContainText('预览');
 await expect.poll(async()=>seeks(page),{timeout:3000}).toBe(before+1);await page.waitForTimeout(400);
 const after=(await snapshot(page)).time;expect(after).toBeGreaterThanOrEqual(start+19000);expect(after).toBeLessThan(start+23500);
 await mediaKey(page,412);await expect.poll(async()=>seeks(page),{timeout:3000}).toBe(before+2);expect((await snapshot(page)).time).toBeLessThan(after);expect(errors).toEqual([]);
});
test('ADR-088 hidden layer: Enter pauses once and reveals controls; Up only wakes; Left/Right preview then auto-commit once',async({page})=>{
 const errors=await longVideo(page);await waitHidden(page);
 await page.keyboard.press('Enter');await expect.poll(async()=>(await snapshot(page)).state).toBe('PAUSED');await expect(page.getByRole('button',{name:'暂停 / 继续',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'暂停 / 继续',exact:true}).click();await expect.poll(async()=>(await snapshot(page)).state).toBe('PLAYING');
 await waitHidden(page);const before=await seeks(page);await page.keyboard.press('ArrowUp');await expect(page.getByRole('button',{name:'暂停 / 继续',exact:true})).toBeVisible();await page.waitForTimeout(300);
 expect((await snapshot(page)).state).toBe('PLAYING');expect(await seeks(page)).toBe(before);
 await waitHidden(page);const start=(await snapshot(page)).time;await page.keyboard.press('ArrowRight');await expect(page.locator('[data-focus-id=player-timeline]')).toBeFocused();await page.keyboard.press('ArrowRight');
 await page.waitForTimeout(800);expect(await seeks(page)).toBe(before);await expect.poll(async()=>seeks(page),{timeout:3000}).toBe(before+1);
 expect((await snapshot(page)).time).toBeGreaterThanOrEqual(start+19000);expect(errors).toEqual([]);
});
test('ADR-088 Back during a hidden-layer preview cancels it; nothing is committed later',async({page})=>{
 const errors=await longVideo(page);await waitHidden(page);const before=await seeks(page);
 await page.keyboard.press('ArrowLeft');await expect(page.locator('.tv-player-time')).toContainText('预览');await page.keyboard.press('Escape');await page.waitForTimeout(1800);
 expect(await seeks(page)).toBe(before);await expect(page.locator('.tv-player-time')).not.toContainText('预览');expect((await snapshot(page)).state).toBe('PLAYING');expect(errors).toEqual([]);
});
