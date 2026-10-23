import {test,expect} from '@playwright/test';
import {snapshot} from '../w04-media-ui/fixture.ts';
import {overlay} from '../w05-product-ui/overlays-fixture.ts';
import {start,settings,playFromShelf,waitHidden,seeks} from './polish-helpers.ts';
test('ADR-090 main row: icon controls with live play state, UP in the title row, no disabled guest actions; ⚙ opens the settings panel and Back returns to it',async({page})=>{
 const errors=await start(page);const toggle=page.getByRole('button',{name:'暂停 / 继续',exact:true});
 await expect(toggle.locator('svg')).toHaveCount(1);await expect(toggle).toContainText('暂停');await toggle.click();await expect.poll(async()=>(await snapshot(page)).state).toBe('PAUSED');await expect(toggle).toContainText('播放');await toggle.click();await expect.poll(async()=>(await snapshot(page)).state).toBe('PLAYING');
 await expect(page.getByRole('button',{name:'上一P',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'下一P',exact:true})).toBeVisible();
 await expect(page.locator('.tv-player-badge')).not.toHaveText('');await expect(page.locator('[data-focus-id^=vod-action-]:visible')).toHaveCount(0);await expect(page.getByRole('button',{name:'更多',exact:true})).toHaveCount(0);
 await settings(page);await expect(page.locator('.player-settings h2')).toHaveText('设置');await expect(page.locator('.player-settings-list button').first()).toBeFocused();
 await expect(page.locator('.player-settings-list')).toContainText('倍速');await expect(page.locator('.player-settings-list')).toContainText('连播：开启');
 await page.getByRole('button',{name:/^倍速/}).click();await expect(page.getByRole('radio',{name:/1×/})).toBeFocused();await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:/^倍速/})).toBeFocused();
 await page.keyboard.press('Escape');await expect(page.locator('[data-focus-id=player-more]')).toBeFocused();await expect(page.locator('.player-settings')).toHaveCount(0);
 await settings(page);await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:/^倍速/})).toBeHidden();expect(errors).toEqual([]);
});
test('ADR-090 danmaku is a one-press switch in the main row',async({page})=>{
 const f=await overlay(page,'normal',false);await playFromShelf(page);const dm=page.locator('[data-focus-id=vod-overlay-dm]');
 await expect(dm).toHaveAttribute('aria-pressed','true');await dm.click();await expect(dm).toHaveAttribute('aria-pressed','false');await expect(dm).toContainText('弹幕 关');
 await dm.click();await expect(dm).toHaveAttribute('aria-pressed','true');expect(f.errors).toEqual([]);
});
test('ADR-090 a quick run of five Right presses accelerates (10+10+10+30+30 s) and still commits one seek',async({page})=>{
 const errors=await start(page,600000);await waitHidden(page);const before=await seeks(page),origin=(await snapshot(page)).time;
 for(let i=0;i<5;i++){await page.keyboard.press('ArrowRight');await page.waitForTimeout(120);}
 await expect(page.locator('.tv-player-time')).toContainText(/\+1:(2[7-9]|30)/);expect(await seeks(page)).toBe(before);
 await expect.poll(async()=>seeks(page),{timeout:3000}).toBe(before+1);const now=(await snapshot(page)).time;expect(now).toBeGreaterThanOrEqual(origin+89000);expect(now).toBeLessThan(origin+95000);expect(errors).toEqual([]);
});
