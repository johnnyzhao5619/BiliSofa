import {test,expect} from '@playwright/test';
import {setup,snapshot} from '../w04-media-ui/fixture.ts';
test('F05/F07 a queued item with a saved position offers remote-reachable resume choices and starts on continue',async({page})=>{
 const errors=await setup(page);await expect.poll(async()=>(await snapshot(page)).time,{timeout:8000}).toBeGreaterThanOrEqual(3600);
 await page.keyboard.press('Escape');await page.keyboard.press('Escape');await expect(page.locator('.tv-grid .tv-card').first()).toBeFocused();await page.waitForTimeout(500);
 await page.locator('.tv-grid .tv-card').first().click();await page.getByRole('button',{name:'加入本机队列 · 首P',exact:true}).click();await expect(page.locator('.tv-detail [role=status], [role=status]').filter({hasText:'已加入本机队列'})).toHaveCount(1);
 await page.keyboard.press('Escape');await page.locator('[data-focus-id=nav-library]').click();await page.getByRole('button',{name:'本机播放队列',exact:true}).click();
 await page.locator('[data-focus-id^=queue-]').first().click();await page.getByRole('button',{name:/从本项开始播放/}).click();
 const resume=page.locator('[data-focus-id=vod-resume]');await expect(resume).toBeVisible();
 let reached=await resume.evaluate(n=>n===document.activeElement);
 for(const key of ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowDown','ArrowLeft','ArrowRight']){if(reached)break;await page.keyboard.press(key);reached=await resume.evaluate(n=>n===document.activeElement);}
 expect(reached).toBe(true);await expect(resume).toBeFocused();
 await page.keyboard.press('Enter');await expect.poll(async()=>(await snapshot(page)).time).toBeGreaterThanOrEqual(3000);expect(errors).toEqual([]);
});
