import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {setup} from '../w04-media-ui/fixture.ts';
// ADR-095: detail facts from the same view response, and the R07 rate probe in 帮助与诊断.
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');
const description='第一行简介'+'很长的介绍'.repeat(40)+'\n第二行\n第三行\n第四行\n第五行';
async function detailSetup(page:Page){
 const errors=await setup(page,false);
 const api=readFileSync('tests/w04-media-ui/vod-api-fixture.js','utf8').replace("owner:{name:'合成UP'},rights","owner:{name:'合成UP',face:'https://i1.hdslb.com/bfs/face/synthetic.png'},desc:"+JSON.stringify(description)+",pubdate:1761220800,stat:{view:123456,like:789,danmaku:12},rights").replace('__PGC__','0').replace('__FALLBACK__','off');
 if(!api.includes('pubdate:1761220800'))throw new Error('fixture anchor moved');
 await page.route('**/vod-api/probe.js',route=>route.fulfill({contentType:'text/javascript',body:api}));
 await page.route('https://i1.hdslb.com/**',route=>route.fulfill({contentType:'image/png',body:png,headers:{'Access-Control-Allow-Origin':'*'}}));
 await page.reload();return errors;
}
test('ADR-095 the detail page shows date, counts, UP avatar and a clamped description from the same read',async({page})=>{
 const errors=await detailSetup(page);const card=page.locator('[data-focus-id^=shelf-popular-]').first();await expect(card).toBeVisible();await card.click();
 await expect(page.locator('.tv-detail-meta')).toContainText('发布于 2025-10-23');await expect(page.locator('.tv-detail-meta')).toContainText('789点赞 · 12弹幕');
 await expect(page.locator('.tv-detail-face')).toBeVisible();await expect(page.locator('.tv-detail-desc')).toContainText('第一行简介');
 const clamp=await page.locator('.tv-detail-desc').evaluate(e=>e.scrollHeight>e.clientHeight);expect(clamp).toBe(true);
 await expect(page.locator('[data-focus-id=detail-play]')).toBeFocused();expect(errors).toEqual([]);
});
test('ADR-095 简介全文 opens its own layer; Up/Down scroll the text and Back returns to the button',async({page})=>{
 const errors=await detailSetup(page);await page.locator('[data-focus-id^=shelf-popular-]').first().click();
 const open=page.locator('[data-focus-id=detail-description]');await open.click();const body=page.locator('[data-focus-id=detail-description-text]');
 await expect(body).toBeFocused();await expect(body).toContainText('第五行');
 await page.evaluate(()=>{const b=document.querySelector<HTMLElement>('[data-focus-id=detail-description-text]')!;b.style.maxHeight='120px';});
 await page.keyboard.press('ArrowDown');expect(await body.evaluate(e=>e.scrollTop)).toBeGreaterThan(0);
 await page.keyboard.press('Escape');await expect(open).toBeFocused();expect(errors).toEqual([]);
});
test('ADR-095 the rate probe sits in 帮助与诊断, runs only on request and explains what it needs',async({page})=>{
 const errors=await setup(page,false);await page.locator('[data-focus-id=nav-settings]').click();await page.locator('[data-focus-id=settings-section-help]').click();
 const probe=page.getByRole('button',{name:'倍速探查（诊断）',exact:true});await probe.click();
 await expect(page.locator('.rate-probe [role=status]')).toContainText('不改变正常播放');await page.locator('[data-focus-id=rate-probe-start]').click();
 await expect(page.locator('.rate-probe [role=status]')).toContainText('请先正常播放任意视频一次');await expect(page.locator('.rate-probe video')).toHaveCount(0);
 await page.keyboard.press('Escape');await expect(probe).toBeFocused();expect(errors).toEqual([]);
});
