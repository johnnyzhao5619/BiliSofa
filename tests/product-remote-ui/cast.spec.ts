import {test,expect} from '@playwright/test';
import {setup as cast,state,send,playing} from '../w06-cast-ui/fixture.ts';
import {mediaKey} from './remote-helpers.ts';
test('ADR-088 official cast keeps wake-only hidden keys: Enter/Left/Right never take control from the phone',async({page})=>{
 const f=await cast(page);await playing(page);const calls=(await state(page)).calls.length;
 await expect(page.locator('[data-focus-id=cast-show-controls]')).toBeFocused({timeout:8000});await page.keyboard.press('Enter');await expect(page.getByRole('slider')).toBeVisible();
 await expect(page.locator('.tv-player-badge')).toContainText('手机控制');expect((await state(page)).state).toBe('PLAYING');
 await expect(page.locator('[data-focus-id=cast-show-controls]')).toBeFocused({timeout:8000});await page.keyboard.press('ArrowRight');await page.waitForTimeout(1600);
 await expect(page.locator('.tv-player-badge')).toContainText('手机控制');expect((await state(page)).calls.slice(calls).filter(c=>c==='seek')).toEqual([]);
 expect((await send(f.queue,f.replies,'Pause')).status).toBe(200);await expect.poll(async()=>(await state(page)).state).toBe('PAUSED');
 await mediaKey(page,413);await page.waitForTimeout(300);expect((await state(page)).state).toBe('PAUSED');expect(f.errors).toEqual([]);
});
