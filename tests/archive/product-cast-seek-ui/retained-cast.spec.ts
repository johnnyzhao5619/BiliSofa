import {test,expect,type Page} from '@playwright/test';
import {setup,state,send,playing,hidden} from '../../w06-cast-ui/fixture.ts';
async function wake(p:Page){const b=p.locator('[data-focus-id=cast-show-controls]');if(await b.isVisible())await b.click();}
async function takeover(p:Page){await wake(p);const b=p.locator('[data-focus-id=player-more]');if(await b.getAttribute('aria-expanded')!=='true')await b.click();await p.getByRole('button',{name:'允许其他手机接管',exact:true}).click();}
async function end(p:Page){await wake(p);const waiting=p.locator('[data-focus-id=cast-waiting-end]');if(await waiting.isVisible())await waiting.click();else await p.locator('[data-focus-id=cast-back]').click();}
test('W06 actual product Worker supports seven sources, >24 commands, nonzero timeline and exclusive sender',async({page})=>{
 const h=await setup(page);await playing(page);
 for(let part=2;part<=7;part++){h.queue.push({part});await expect.poll(async()=>(await state(page)).played).toBe(part);await playing(page);}
 for(let i=0;i<26;i++){expect((await send(h.queue,h.replies,i%2?'Play':'Pause')).status).toBe(200);await expect.poll(async()=>(await state(page)).state).toBe(i%2?'PLAYING':'PAUSED');}
 const position=await send(h.queue,h.replies,'GetPositionInfo');expect(position.body).toContain('<TrackDuration>00:02:00</TrackDuration>');expect(position.body).not.toContain('<RelTime>00:00:00</RelTime>');
 const before=(await state(page)).opened;h.queue.push({part:8,peer:0x0a000008});await expect.poll(()=>h.replies.filter(r=>r.action==='SetAVTransportURI'&&r.status===500).length).toBe(1);expect((await state(page)).opened).toBe(before);
 await end(page);expect(h.errors).toEqual([]);expect((await state(page)).state).toBe('NONE');
});
test('W06 TV takeover cancel leaves stream untouched; confirmation closes old ownership before new token and session',async({page})=>{
 const h=await setup(page,'new-sender-on-reset');await playing(page);const old=(await state(page)).urls[0];await takeover(page);await expect(page.getByRole('button',{name:'取消，保持当前会话'})).toBeFocused();await page.getByRole('button',{name:'取消，保持当前会话'}).click();expect((await state(page)).opened).toBe(1);await playing(page);await page.screenshot({path:'.local/u4-cast-seek/ownership-synthetic.png'});
 await takeover(page);await page.getByRole('button',{name:'确认结束旧会话并重新接收'}).click();await expect.poll(async()=>(await state(page)).opened).toBe(2);await playing(page);expect((await state(page)).urls[1]).not.toBe(old);expect((await state(page)).closed).toBeGreaterThan(0);expect((await send(h.queue,h.replies,'Pause','',0x0a000009)).status).toBe(500);expect((await send(h.queue,h.replies,'Pause','',0x0a000008)).status).toBe(200);await expect.poll(async()=>(await state(page)).state).toBe('PAUSED');expect(h.errors).toEqual([]);
 await end(page);
});
test('W06 checked-source failure remains reviewable, never opens decoder, and manual reconnect uses fresh receiver',async({page})=>{
 const h=await setup(page,'fail-first');await expect(page.getByRole('button',{name:'重新开始接收'})).toBeVisible();await expect(page.locator('.tv-player-status')).toContainText('中断');expect((await state(page)).opened).toBe(0);
 await page.getByRole('button',{name:'重新开始接收'}).click();await playing(page);expect((await state(page)).opened).toBe(1);expect(h.errors).toEqual([]);await end(page);
});
test('W06 Home while takeover confirmation is open releases all resources and never auto-receives on return',async({page})=>{
 const h=await setup(page);await playing(page);await takeover(page);await hidden(page,true);await expect(page.locator('#overlays')).toBeEmpty();expect((await state(page)).state).toBe('NONE');await hidden(page,false);await page.waitForTimeout(300);expect((await state(page)).opened).toBe(1);await expect(page.locator('[data-focus-id=cast-entry]')).toBeFocused();expect(h.errors).toEqual([]);
});
test('W06 unconfirmed native closure blocks receiver reset and future shell media',async({page})=>{
 await setup(page,'unclosed');await playing(page);await takeover(page);await page.getByRole('button',{name:'确认结束旧会话并重新接收'}).click();await expect(page.getByRole('button',{name:'重新开始接收'})).toBeDisabled();expect((await state(page)).opened).toBe(1);await end(page);await expect(page.locator('#pages [role=status]')).toHaveText('请重新打开应用');
});

test('W06 Home during pending replacement invalidates late native success, and unknown decoder close cannot start new receiver',async({page})=>{
 const h=await setup(page,'hold-transition');await playing(page);h.queue.push({part:2});await expect(page.locator('.tv-player-status')).toContainText('正在切换媒体');await hidden(page,true);await expect(page.locator('#overlays')).toBeEmpty();await page.waitForTimeout(1300);expect((await state(page)).played).toBe(1);expect((await state(page)).state).toBe('NONE');await hidden(page,false);expect(h.errors).toEqual([]);
});
test('W06 unknown old decoder close blocks explicit sender reset',async({page})=>{
 await setup(page,'normal','unclosed');await playing(page);await takeover(page);await page.getByRole('button',{name:'确认结束旧会话并重新接收'}).click();await expect(page.getByRole('button',{name:'重新开始接收'})).toBeDisabled();expect((await state(page)).opened).toBe(1);await end(page);await expect(page.locator('#pages [role=status]')).toHaveText('请重新打开应用');
});
