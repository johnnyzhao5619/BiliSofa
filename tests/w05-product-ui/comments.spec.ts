import {test,expect} from '@playwright/test';
import {snapshot} from '../w04-media-ui/fixture.ts';
import {comments,open,id} from './comments-fixture.ts';
test('F10 full module keeps API source cursors, four-card previous/next, sort/refresh and safe text while video continues',async({page},info)=>{
 const f=await comments(page);await open(page);await expect(page.locator('.comments-grid button')).toHaveCount(4);await expect(page.getByRole('button',{name:'返回播放',exact:true})).toBeFocused();
 await page.getByRole('button',{name:'下一页',exact:true}).click();await expect(page.locator('.comments-grid button').first()).toContainText('作者5');expect(f.calls.filter(q=>q.operation===4)).toHaveLength(1);
 await page.getByRole('button',{name:'下一页',exact:true}).click();await expect(page.locator('.comments-grid button')).toHaveCount(1);await page.getByRole('button',{name:'下一页',exact:true}).click();await expect(page.locator('.comments-grid button')).toHaveCount(2);await expect(page.getByRole('button',{name:'下一页',exact:true})).toBeDisabled();expect(f.calls.filter(q=>q.operation===4)).toHaveLength(2);
 await page.getByRole('button',{name:'上一页',exact:true}).click();expect(f.calls.filter(q=>q.operation===4)).toHaveLength(2);
 await page.getByRole('button',{name:'最新',exact:true}).click();await expect(page.locator('.comments-panel [role=status]')).toContainText('最新 · 第1页');expect(f.calls.filter(q=>q.operation===4).at(-1)!.value.split('|')[1]).toBe('2');
 await page.getByRole('button',{name:'刷新当前排序',exact:true}).click();await expect(page.locator('.comments-grid button')).toHaveCount(4);expect(f.calls.filter(q=>q.operation===4)).toHaveLength(4);
 expect(await page.locator('.comments-panel').innerHTML()).not.toContain('not-for-ui');await expect(page.locator('.comments-panel img')).toHaveCount(0);expect((await snapshot(page)).state).toBe('PLAYING');await page.screenshot({path:info.outputPath('comments-side-panel.png')});
 await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'评论 / 回复 · 只读',exact:true})).toBeFocused();expect((await snapshot(page)).opened).toBe(1);expect(f.errors).toEqual([]);
});
test('F15 long comment reader scrolls, genuine root replies keep source batches, and Back restores each calling focus',async({page})=>{
 const f=await comments(page);await open(page);await expect(page.locator('.comments-grid button')).toHaveCount(4);await page.locator('.comments-grid button').first().click();await expect(page.locator('.comment-full-text')).toBeFocused();
 await page.keyboard.press('ArrowDown');expect(await page.locator('.comment-full-text').evaluate(n=>n.scrollTop)).toBeGreaterThan(0);await page.getByRole('button',{name:'查看楼中楼回复',exact:true}).click();await expect(page.locator('.comments-panel:not([inert]) .comments-grid button')).toHaveCount(4);
 for(let i=0;i<2;i++)await page.getByRole('button',{name:'下一页',exact:true}).click();await expect(page.locator('.comments-panel:not([inert]) .comments-grid button')).toHaveCount(2);expect(f.calls.filter(q=>q.operation===5)).toHaveLength(1);
 await page.getByRole('button',{name:'下一页',exact:true}).click();await expect(page.locator('.comments-panel:not([inert]) .comments-grid button')).toHaveCount(1);await expect(page.getByRole('button',{name:'下一页',exact:true})).toBeDisabled();expect(f.calls.filter(q=>q.operation===5).map(q=>q.value)).toEqual([`123|${id(1)}|1`,`123|${id(1)}|2`]);
 await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'查看楼中楼回复',exact:true})).toBeFocused();await page.keyboard.press('Escape');await expect(page.locator('.comments-grid button').first()).toBeFocused();await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'评论 / 回复 · 只读',exact:true})).toBeFocused();expect((await snapshot(page)).state).toBe('PLAYING');expect(f.errors).toEqual([]);
});
for(const variant of ['closed','empty','refused']as const)test(`F10 ${variant} is explicit, never auto-retries or closes the decoder`,async({page})=>{
 const f=await comments(page,variant);await open(page);await expect(page.locator('.comments-panel [role=status]')).toContainText(variant==='closed'?'评论区已关闭':variant==='empty'?'暂无可显示内容':'comments.network');
 expect(f.calls.filter(q=>q.operation===4)).toHaveLength(1);expect((await snapshot(page)).state).toBe('PLAYING');await expect(page.locator('.comments-grid button')).toHaveCount(0);
 if(variant==='refused'){f.mode('normal');await page.getByRole('button',{name:'重试本次读取',exact:true}).click();await expect(page.locator('.comments-grid button')).toHaveCount(4);expect(f.calls.filter(q=>q.operation===4)).toHaveLength(2);}
 await page.keyboard.press('Escape');expect((await snapshot(page)).state).toBe('PLAYING');expect(f.errors).toEqual([]);
});
test('F10 Home immediately stops underlying media even with a slow native side-panel close acknowledgement',async({page})=>{
 const f=await comments(page,'slow');await open(page);await expect.poll(()=>f.calls.some(q=>q.operation===4)).toBe(true);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
 await expect.poll(async()=>(await snapshot(page)).state,{timeout:300}).toBe('NONE');await expect(page.locator('#overlays')).toBeEmpty();await expect(page.locator('.vod-overlay-plane')).toHaveCount(0);expect(f.errors).toEqual([]);
});
test('F10 source replacement clears old reader and all nested dialogs without reopening or stopping the new decoder',async({page})=>{
 const f=await comments(page);await page.getByRole('button',{name:'连播：关闭',exact:true}).click();await open(page);await expect(page.locator('.comments-grid button')).toHaveCount(4);await page.locator('.comments-grid button').first().click();await page.getByRole('button',{name:'查看楼中楼回复',exact:true}).click();await expect(page.locator('.comments-panel:not([inert]) .comments-grid button')).toHaveCount(4);
 await page.evaluate(()=>(globalThis as unknown as{mediaFixture:{end():void}}).mediaFixture.end());await expect(page.locator('.comments-panel,.comment-detail-panel')).toHaveCount(0);await expect(page.locator('.vod-panel h2')).toContainText('P2');expect((await snapshot(page)).state).toBe('PLAYING');expect((await snapshot(page)).opened).toBe(2);expect(f.errors).toEqual([]);
});
