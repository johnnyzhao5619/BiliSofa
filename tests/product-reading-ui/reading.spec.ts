import {test,expect} from '@playwright/test';
import {snapshot} from '../w04-media-ui/fixture.ts';
import {comments} from '../w05-product-ui/comments-fixture.ts';
import {overlay} from '../w05-product-ui/overlays-fixture.ts';
import {hidden} from '../w06-cast-ui/fixture.ts';
import {playFromShelf,start,settings} from '../product-polish-ui/polish-helpers.ts';
test('ADR-092 comments read as one column and continue onto the next page when the last comment is reached',async({page})=>{
 const f=await comments(page,'normal',false);await playFromShelf(page);await page.getByRole('button',{name:'评论',exact:true}).click();
 const cards=page.locator('.comments-panel .comment-card');await expect(cards.first()).toBeFocused();await expect(cards.first().locator('.comment-mark')).toHaveText('作');
 const before=await cards.count();await expect(page.getByRole('button',{name:'下一页',exact:true})).toBeHidden();
 for(let i=1;i<before;i++)await page.keyboard.press('ArrowDown');await expect(cards.nth(before-1)).toBeFocused();
 await expect.poll(async()=>cards.count()).toBeGreaterThan(before);await expect(cards.nth(before-1)).toBeFocused();await expect(page.locator('.comments-panel [role=status]').first()).toContainText('已显示');
 await page.keyboard.press('ArrowDown');await expect(cards.nth(before)).toBeFocused();await cards.nth(before).click();await expect(page.locator('.comment-full-text')).toBeFocused();expect(f.errors).toEqual([]);
});
test('ADR-093 subtitle/danmaku values step with Left/Right inside fixed choices and are kept',async({page})=>{
 const f=await overlay(page,'normal',false);await playFromShelf(page);const open=async()=>{await settings(page);await page.getByRole('button',{name:'弹幕设置',exact:true}).click();};
 await open();const size=page.locator('[data-focus-id=overlay-size]');await size.focus();await expect(size).toHaveText('弹幕字号 ‹ 32 ›');
 await page.keyboard.press('ArrowRight');await expect(size).toHaveText('弹幕字号 ‹ 40 ›');await expect(size).toBeFocused();
 await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowLeft');await expect(size).toHaveText('弹幕字号 ‹ 24 ›');
 await page.keyboard.press('Escape');await page.keyboard.press('Escape');await page.getByRole('button',{name:'字幕设置',exact:true}).click();
 const offset=page.locator('[data-focus-id=overlay-zero]');await offset.focus();await page.keyboard.press('ArrowRight');await expect(offset).toHaveText('字幕偏移 ‹ +0.5秒 ›');await expect(page.locator('[data-focus-id=overlay-early]')).toBeHidden();
 await page.keyboard.press('Escape');await open();await expect(page.locator('[data-focus-id=overlay-size]')).toHaveText('弹幕字号 ‹ 24 ›');expect(f.errors).toEqual([]);
});
test('ADR-093 after Home the first page offers “继续观看” for the same video; it is silent until chosen and resumes at the kept position',async({page})=>{
 const errors=await start(page,600000);await expect.poll(async()=>(await snapshot(page)).time,{timeout:8000}).toBeGreaterThanOrEqual(3000);
 await hidden(page,true);await expect.poll(async()=>(await snapshot(page)).state).toBe('NONE');await hidden(page,false);
 const resume=page.locator('[data-focus-id=resume-continue]');await expect(resume).toBeFocused({timeout:8000});await expect(resume).toContainText('继续观看 · 0:0');expect((await snapshot(page)).state).toBe('NONE');
 await resume.click();await expect(page.getByRole('button',{name:'暂停 / 继续',exact:true})).toBeEnabled();await expect.poll(async()=>(await snapshot(page)).time).toBeGreaterThanOrEqual(3000);expect(errors).toEqual([]);
});
test('ADR-093 a normal exit or Back forgets the item: no offer after a later Home',async({page})=>{
 const errors=await start(page,600000);await expect.poll(async()=>(await snapshot(page)).time,{timeout:8000}).toBeGreaterThanOrEqual(2000);
 await page.keyboard.press('Escape');await page.keyboard.press('Escape');await expect(page.locator('[data-focus-id^=shelf-popular-]').first()).toBeFocused();
 await hidden(page,true);await hidden(page,false);await page.waitForTimeout(1500);await expect(page.locator('[data-focus-id=resume-continue]')).toHaveCount(0);expect(errors).toEqual([]);
});
test('ADR-093 the continuous-play choice is kept in its own key across reloads',async({page})=>{
 const errors=await start(page);await settings(page);await page.getByRole('button',{name:'连播：开启',exact:true}).click();await expect(page.getByRole('button',{name:'连播：关闭',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('bilisofa.playback-continuous.v1.')).map(k=>localStorage.getItem(k)))).toEqual(['0']);
 await page.keyboard.press('Escape');await page.keyboard.press('Escape');await page.keyboard.press('Escape');
 await page.reload();await expect(page.locator('[data-focus-id^=shelf-popular-]').first()).toBeVisible();await (await import('../product-polish-ui/polish-helpers.ts')).playFromShelf(page);
 await settings(page);await expect(page.getByRole('button',{name:'连播：关闭',exact:true})).toBeVisible();expect(errors).toEqual([]);
});
