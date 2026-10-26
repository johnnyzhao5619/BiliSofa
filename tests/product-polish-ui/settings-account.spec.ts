import {test,expect} from '@playwright/test';
import {setup} from '../w04-media-ui/fixture.ts';
// P1-2b (ADR-113 #4): the rail has seven destinations; the account is Settings' first group, and the account route opens it.
test('P1-2b the rail lists seven destinations without 账号; 设置 opens on its account group',async({page})=>{
 const errors=await setup(page,false);await expect(page.locator('[data-focus-id^=shelf-popular-]').first()).toBeFocused();
 await expect(page.locator('.tv-rail button')).toHaveText(['首页','搜索','关注','番剧影视','我的','投屏','设置']);await expect(page.locator('[data-focus-id=nav-account]')).toHaveCount(0);
 await page.locator('[data-focus-id=nav-settings]').click();
 await expect(page.locator('.tv-settings-nav button').first()).toHaveText('账号');await expect(page.locator('[data-focus-id=settings-section-account]')).toBeFocused();
 await expect(page.locator('#settings-pane-account')).toBeVisible();await expect(page.locator('#settings-pane-account [data-focus-id=guest]')).toBeVisible();
 await expect(page.locator('.tv-settings h1')).toHaveCount(1);
 await page.keyboard.press('ArrowRight');const first=page.locator('#settings-pane-account button:focus');await expect(first).toHaveCount(1);
 await page.keyboard.press('ArrowLeft');await expect(page.locator('[data-focus-id=settings-section-account]')).toBeFocused();
 await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await expect(page.locator('#settings-pane-playback')).toBeVisible();await expect(page.locator('#settings-pane-account')).toBeHidden();expect(errors).toEqual([]);
});
test('P1-2b a sign-in entry elsewhere lands on Settings\' account group, with 设置 marked in the rail',async({page})=>{
 const errors=await setup(page,false);await expect(page.locator('[data-focus-id^=shelf-popular-]').first()).toBeFocused();
 await page.locator('[data-focus-id=nav-following]').click();await expect(page.locator('[data-focus-id=following-login]')).toBeFocused();await page.keyboard.press('Enter');
 await expect(page.locator('#settings-pane-account')).toBeVisible();await expect(page.locator('[data-focus-id=nav-settings]')).toHaveAttribute('aria-current','page');
 await expect(page.locator('#settings-pane-account button:focus')).toHaveCount(1);expect(errors).toEqual([]);
});
