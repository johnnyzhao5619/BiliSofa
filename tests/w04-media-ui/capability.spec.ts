import {test,expect}from'@playwright/test';
import {setup,snapshot}from'./fixture.ts';
for(const device of ['package','denied','other-model']as const)test('W04 '+device+' uses the actual player without model/permission playback restrictions',async({page})=>{
 const errors=await setup(page,true,device);await expect.poll(async()=>(await snapshot(page)).state).toBe('PLAYING');await page.keyboard.press('Escape');
 if(await page.locator('[data-focus-id="vod-hide-controls"]').count()){await expect(page.locator('.vod-panel')).toHaveClass(/vod-controls-hidden/);expect((await snapshot(page)).state).toBe('PLAYING');await page.keyboard.press('Escape');}
 await expect(page.locator('.popular-grid button').first()).toBeFocused();expect(errors).toEqual([]);
});
test('W04 missing player still gives an actionable runtime error without opening a source',async({page})=>{
 const errors=await setup(page,false,'no-player');await page.getByRole('button',{name:'读取游客热门'}).click();await expect(page.locator('.popular-grid button')).toHaveCount(4);await page.locator('.popular-grid button').first().click();await expect(page.locator('#feedback')).toContainText('media.player_api_missing');expect((await snapshot(page)).opened).toBe(0);expect(errors).toEqual([]);
});
