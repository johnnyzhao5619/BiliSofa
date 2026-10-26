import {test,expect} from '@playwright/test';
import {setup,snapshot} from '../w04-media-ui/fixture.ts';
import {start} from './polish-helpers.ts';
// ADR-113: OK on a card plays it; OK held 0.5 s opens the card menu instead; Down in the player opens quick settings.
test('ADR-113 a short OK on a shelf card plays it directly, with no detail page in between',async({page})=>{
 const errors=await setup(page,false);const card=page.locator('[data-focus-id^=shelf-popular-]').first();await expect(card).toBeFocused();
 await page.keyboard.down('Enter');await page.waitForTimeout(120);await page.keyboard.up('Enter');
 await expect(page.getByRole('button',{name:'暂停 / 继续',exact:true})).toBeEnabled();await expect.poll(async()=>(await snapshot(page)).state).toBe('PLAYING');
 await expect(page.locator('.tv-detail-page')).toHaveCount(0);expect(errors).toEqual([]);
});
test('ADR-113 holding OK opens the card menu once and never also plays; Back returns to the card',async({page})=>{
 const errors=await setup(page,false);const card=page.locator('[data-focus-id^=shelf-popular-]').first();await expect(card).toBeFocused();
 await page.keyboard.down('Enter');await expect(page.locator('.tv-card-menu')).toBeVisible({timeout:2000});await page.waitForTimeout(400);await page.keyboard.up('Enter');
 await expect(page.locator('.tv-card-menu')).toHaveCount(1);await expect(page.locator('[data-focus-id=card-menu-detail]')).toBeFocused();
 await expect(page.locator('.tv-card-menu button')).toHaveText(['详情','加入本机队列','UP主页']);await expect(page.locator('.vod-panel')).toHaveCount(0);
 await page.keyboard.press('Escape');await expect(page.locator('.tv-card-menu')).toHaveCount(0);await expect(card).toBeFocused();
 await page.keyboard.down('Enter');await page.waitForTimeout(700);await page.keyboard.up('Enter');await page.locator('[data-focus-id=card-menu-detail]').click();
 await expect(page.locator('.tv-detail-page')).toBeVisible();await expect(page.locator('[data-focus-id=detail-play]')).toBeFocused();expect(errors).toEqual([]);
});
test('ADR-113 an OK press that moves away before release activates nothing',async({page})=>{
 const errors=await setup(page,false);const card=page.locator('[data-focus-id^=shelf-popular-]').first();await expect(card).toBeFocused();
 await page.keyboard.down('Enter');await page.keyboard.press('ArrowRight');await page.keyboard.up('Enter');await page.waitForTimeout(700);
 await expect(page.locator('.vod-panel')).toHaveCount(0);await expect(page.locator('.tv-card-menu')).toHaveCount(0);await expect(card).not.toBeFocused();expect(errors).toEqual([]);
});
test('ADR-113 Down on the main row opens 画质 · 倍速 · 弹幕 · 字幕 · 连播; toggles stay in step with the originals; Up or Back closes it',async({page})=>{
 const errors=await start(page);await page.getByRole('button',{name:'暂停 / 继续',exact:true}).focus();
 await page.keyboard.press('ArrowDown');const quick=page.locator('.tv-player-quick');await expect(quick).toBeVisible();
 await expect(quick.locator('button')).toHaveText(['画质',/^倍速/,/^弹幕/,'字幕',/^连播/]);await expect(page.locator('[data-focus-id=player-quick-tracks]')).toBeFocused();
 const dm=page.locator('[data-focus-id=player-quick-overlay-dm]'),before=await dm.textContent();await dm.click();await expect(dm).not.toHaveText(before??'');
 await expect(page.locator('[data-focus-id=vod-overlay-dm]')).toHaveText((await dm.textContent())??'');
 await page.keyboard.press('ArrowUp');await expect(quick).toBeHidden();
 await page.getByRole('button',{name:'暂停 / 继续',exact:true}).focus();await page.keyboard.press('ArrowDown');await expect(quick).toBeVisible();await page.keyboard.press('Escape');await expect(quick).toBeHidden();await expect(page.locator('.vod-panel')).toBeVisible();
 await page.keyboard.press('ArrowDown');await page.locator('[data-focus-id=player-quick-tracks]').click();
 const current=page.getByRole('button',{name:/480P/});await expect(current).toBeFocused();await expect(current).toHaveAttribute('aria-pressed','true');
 // A picker closes the quick row first: its Back returns to the main row, one more Back hides the controls.
 await expect(quick).toBeHidden();await page.keyboard.press('Escape');await expect(page.locator('.tv-player-primary button:focus')).toHaveCount(1);await expect(quick).toBeHidden();expect(errors).toEqual([]);
});
