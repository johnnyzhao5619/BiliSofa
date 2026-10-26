import {test,expect} from '@playwright/test';
import {setup,snapshot} from '../w04-media-ui/fixture.ts';
import {comments} from '../w05-product-ui/comments-fixture.ts';
import {overlay} from '../w05-product-ui/overlays-fixture.ts';
import {start,settings,playFromShelf,mediaKey,seeks,waitHidden,openDetail} from './polish-helpers.ts';
// ADR-088 behaviour re-checked through the 0.46 entry points (shelves, main row, ⚙ panel).
test('ADR-088 (0.46) media keys: Play/Pause, Play, Pause, Stop back to the card',async({page})=>{
 const errors=await start(page,600000);
 await mediaKey(page,10252);await expect.poll(async()=>(await snapshot(page)).state).toBe('PAUSED');await mediaKey(page,19);await page.waitForTimeout(300);expect((await snapshot(page)).state).toBe('PAUSED');
 await mediaKey(page,415);await expect.poll(async()=>(await snapshot(page)).state).toBe('PLAYING');await mediaKey(page,413);await expect.poll(async()=>(await snapshot(page)).state).toBe('NONE');
 await expect(page.locator('[data-focus-id^=shelf-popular-]').first()).toBeFocused();expect(errors).toEqual([]);
});
test('ADR-088 (0.46) FF/RW and hidden-layer Right commit one seek after idle; Up only wakes; Back cancels',async({page})=>{
 const errors=await start(page,600000);await expect.poll(async()=>(await snapshot(page)).time).toBeGreaterThanOrEqual(1000);const before=await seeks(page);
 await mediaKey(page,417);await page.waitForTimeout(300);await mediaKey(page,417);await page.waitForTimeout(600);expect(await seeks(page)).toBe(before);await expect.poll(async()=>seeks(page),{timeout:3000}).toBe(before+1);
 await waitHidden(page);await page.keyboard.press('ArrowUp');await expect(page.getByRole('button',{name:'暂停 / 继续',exact:true})).toBeVisible();expect(await seeks(page)).toBe(before+1);
 await waitHidden(page);await page.keyboard.press('Enter');await expect.poll(async()=>(await snapshot(page)).state).toBe('PAUSED');await page.getByRole('button',{name:'暂停 / 继续',exact:true}).click();
 await waitHidden(page);await page.keyboard.press('ArrowLeft');await expect(page.locator('.tv-player-time')).toContainText('预览');await page.keyboard.press('Escape');await page.waitForTimeout(1800);expect(await seeks(page)).toBe(before+1);expect(errors).toEqual([]);
});
test('ADR-088 (0.46) pickers open on the current choice from the ⚙ panel and the main row',async({page})=>{
 const errors=await start(page);await settings(page);await page.getByRole('button',{name:'画质 / 编码 / 音轨',exact:true}).click();
 const current=page.getByRole('button',{name:/480P/});await expect(current).toBeFocused();await expect(current).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('button',{name:'返回播放',exact:true})).toBeHidden();
 await page.keyboard.press('Escape');await page.keyboard.press('Escape');await page.getByRole('button',{name:'选择分P',exact:true}).click();await expect(page.getByRole('button',{name:/P1 · .*正在播放/})).toBeFocused();expect(errors).toEqual([]);
});
test('ADR-088 (0.46) comments from the main row start on the first comment; replies open their own full text',async({page})=>{
 const f=await comments(page,'normal',false);await playFromShelf(page);await page.getByRole('button',{name:'评论',exact:true}).click();
 await expect(page.locator('.comments-grid button').first()).toBeFocused();await page.locator('.comments-grid button').first().click();await page.getByRole('button',{name:'查看楼中楼回复',exact:true}).click();
 const replies=page.locator('.comments-panel').last().locator('.comments-grid button');await expect(replies.first()).toBeFocused();await replies.first().click();await expect(page.locator('.comment-detail-panel')).toHaveCount(2);
 for(let i=0;i<4;i++)await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'评论',exact:true})).toBeFocused();expect(f.errors).toEqual([]);
});
test('ADR-088 (0.46) 字幕 opens the subtitle/danmaku settings on their first item',async({page})=>{
 // ADR-093: 字幕 opens subtitle settings only; danmaku has its own entry in ⚙.
 const name='字幕设置';
 const f=await overlay(page,'normal',false);await playFromShelf(page);await page.getByRole('button',{name,exact:true}).click();
 await expect(page.locator('[data-focus-id=overlay-subtitles]')).toBeFocused();await page.keyboard.press('Escape');await expect(page.getByRole('button',{name,exact:true})).toBeFocused();expect(f.errors).toEqual([]);
});
test('ADR-088 (0.46) a transient notice from the ⚙ panel clears after about 4 s',async({page})=>{
 const errors=await start(page);await settings(page);await page.getByRole('button',{name:/^加入本机队列/}).click();
 await expect(page.locator('#feedback')).toHaveText(/本机队列已保存/);await page.waitForTimeout(4500);await expect(page.locator('#feedback')).toHaveText('');expect(errors).toEqual([]);
});
test('ADR-113 a queued item with a saved position continues there and offers 从头播放 instead of a prompt',async({page})=>{
 const errors=await start(page);await expect.poll(async()=>(await snapshot(page)).time,{timeout:8000}).toBeGreaterThanOrEqual(3600);
 await page.keyboard.press('Escape');await page.keyboard.press('Escape');const card=page.locator('[data-focus-id^=shelf-popular-]').first();await expect(card).toBeFocused();await page.waitForTimeout(500);
 await card.click({button:'right'});await page.locator('[data-focus-id=card-menu-queue]').click();await expect(page.locator('.tv-card-menu [role=status]')).toHaveText('已加入本机队列');await page.keyboard.press('Escape');
 await page.locator('[data-focus-id=nav-library]').click();await page.getByRole('button',{name:'本机播放队列',exact:true}).click();await page.locator('[data-focus-id^=queue-]').first().click();
 await expect(page.locator('[data-focus-id=vod-start-over]')).toBeFocused();await expect(page.locator('[data-focus-id=vod-resume]')).toHaveCount(0);await expect.poll(async()=>(await snapshot(page)).time,{timeout:8000}).toBeGreaterThanOrEqual(3000);expect(errors).toEqual([]);
});
test('ADR-088 (0.46) detail has no list-return button or BV id; home has no trailing refresh',async({page})=>{
 const errors=await setup(page,false);await expect(page.locator('[data-focus-id^=shelf-popular-]').first()).toBeFocused();await expect(page.locator('[data-focus-id=home-refresh]')).toBeHidden();
 await openDetail(page,page.locator('[data-focus-id^=shelf-popular-]').first());await expect(page.locator('[data-focus-id=detail-play]')).toBeFocused();await expect(page.getByRole('button',{name:'返回视频列表',exact:true})).toHaveCount(0);await expect(page.getByText(/^BV[A-Za-z0-9]{10}$/)).toBeHidden();expect(errors).toEqual([]);
});
