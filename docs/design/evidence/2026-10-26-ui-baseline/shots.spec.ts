// ADR-114 baseline: the key screens at 1920×1080 with the synthetic UI fixture (no real account or content).
// Run with a copy of tests/config/playwright.app.config.ts pointed at this file; SHOTS_DIR chooses where the PNGs go.
import {test,expect} from '@playwright/test';
import {setup,snapshot} from '../../../../tests/w04-media-ui/fixture.ts';
const dir=process.env.SHOTS_DIR??'./';
test('screens',async({page})=>{
 test.setTimeout(120000);
 await setup(page,false);const card=page.locator('[data-focus-id^=shelf-popular-]').first();await expect(card).toBeFocused();await page.waitForTimeout(800);
 await page.screenshot({path:dir+'1-home.png'});
 await card.click({button:'right'});await expect(page.locator('.tv-card-menu')).toBeVisible();await page.waitForTimeout(300);await page.screenshot({path:dir+'2-menu.png'});
 await page.locator('[data-focus-id=card-menu-detail]').click();await expect(page.locator('.tv-detail-page')).toBeVisible();await page.waitForTimeout(800);await page.screenshot({path:dir+'3-detail.png'});
 await page.keyboard.press('Escape');await expect(card).toBeFocused();
 await card.click();await expect.poll(async()=>(await snapshot(page)).state).toBe('PLAYING');await page.waitForTimeout(800);await page.screenshot({path:dir+'4-player.png'});
 await page.getByRole('button',{name:'暂停 / 继续',exact:true}).focus();await page.keyboard.press('ArrowDown');await page.waitForTimeout(300);await page.screenshot({path:dir+'5-quick.png'});
 for(let i=0;i<4&&await page.locator('.vod-panel').count();i++){await page.keyboard.press('Escape');await page.waitForTimeout(500);}
 for(const [id,name] of [['nav-library','6-library'],['nav-search','7-search'],['nav-following','8-following'],['nav-settings','9-settings']]){await page.locator('[data-focus-id='+id+']').click();await page.waitForTimeout(1200);await page.screenshot({path:dir+name+'.png'});}
});
