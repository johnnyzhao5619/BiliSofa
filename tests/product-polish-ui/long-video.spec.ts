import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {setup,snapshot,tick} from '../w04-media-ui/fixture.ts';
import {playFromShelf} from './polish-helpers.ts';
// ADR-115: a 30-hour video reads, plays, shows h:mm:ss, keeps a position past 24 h and continues there.
test('ADR-115 a 30-hour video plays, keeps its place at 26 h and continues from there from 继续观看',async({page})=>{
 const errors=await setup(page,false);
 const api=readFileSync('tests/w04-media-ui/vod-api-fixture.js','utf8').replace('__FALLBACK__','off')
  .replace("part:'第一P',duration:8}","part:'第一P',duration:108000}").replace("const duration=input().includes('|222|')?9:8;","const duration=input().includes('|222|')?9:108000;");
 expect(api).toContain('duration:108000}');await page.route('**/vod-api/probe.js',route=>route.fulfill({contentType:'text/javascript',body:api}));
 await playFromShelf(page,108000000);await tick(page,93600000);
 await expect(page.locator('.tv-player-time')).toContainText('26:00:00 / 30:00:00');
 await page.keyboard.press('Escape');await page.keyboard.press('Escape');await expect(page.locator('[data-focus-id^=shelf-popular-]').first()).toBeFocused();
// The synthetic popular list says 8 s for this card, so continue from 继续观看, which carries the saved 30 h record.
 const resume=page.locator('[data-focus-id^=home-resume-]').first();await expect(resume).toBeVisible();await resume.click();
 await expect(page.getByText('已从 26:00:00 继续')).toBeVisible();
 await expect.poll(async()=>(await snapshot(page)).time,{timeout:8000}).toBeGreaterThanOrEqual(93600000);expect(errors).toEqual([]);
});
