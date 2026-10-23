import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
const native=readFileSync('tests/cast-app-ui/native-fixture.js','utf8');
interface Reply{action:string;id:number;status:number;body:string;}
async function setup(page:Page,variant='normal',decoder='normal'){
 const replies:Reply[]=[],queue:object[]=[],errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/native/manifest.json',r=>r.fulfill({body:'{}'}));
 await page.route('**/native/probe.js',r=>r.fulfill({contentType:'text/javascript',body:native.replace('__VARIANT__',variant)}));
 await page.route('**/cast-fixture/result',async r=>{replies.push(r.request().postDataJSON());await r.fulfill({body:'{}'});});
 await page.route('**/cast-fixture/next',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(queue.shift()??null)}));
 await page.addInitScript(({decoder})=>{
  let state='NONE',listener:{oncurrentplaytime?:(ms:number)=>void}={},time=0,offset=0,prebuffer=false,busy=false,opened=0,played=0,closed=0;
  const urls:string[]=[],calls:string[]=[];
  setInterval(()=>{if(state==='PLAYING'&&!busy){time+=100;listener.oncurrentplaytime?.(time);}},100);
  Object.assign(globalThis,{tizen:{systeminfo:{getPropertyValue(name:string,done:(v:object)=>void){done({status:name==='WIFI_NETWORK'?'ON':'CONNECTED',ipAddress:'10.0.0.9'});}}},webapis:{
   avplay:{getState:()=>state,getDuration(){if(busy)throw Error('fixture.getter_while_busy');return urls.at(-1)===urls[0]?80000:120000;},
    open(url:string){if(state!=='NONE'||!/^http:\/\/127\.0\.0\.1:40324\/[a-f0-9]{32}\/cast\.mp4$/.test(url))throw Error('fixture.unowned_source');urls.push(url);opened++;state='IDLE';offset=12000;prebuffer=false;calls.push('open');},
    setListener(value:typeof listener){listener=value;},setDisplayRect(){},setBufferingParam(){},setTimeoutForBuffering(){},
    setStreamingProperty(_key:string,value:string){prebuffer=true;offset=Number(value);calls.push('prebuffer');},
    prepareAsync(done:()=>void){busy=true;setTimeout(()=>{busy=false;if(state==='NONE')return;state=prebuffer?'IDLE':'READY';done();},decoder==='slow-prepare'?1000:30);},
    play(){state='PLAYING';time=offset;listener.oncurrentplaytime?.(time);played++;calls.push('play');},pause(){state='PAUSED';calls.push('pause');},
    seekTo(ms:number,done:()=>void){busy=true;setTimeout(()=>{busy=false;time=ms;listener.oncurrentplaytime?.(time);done();},30);},
    stop(){state='IDLE';calls.push('stop');},close(){state=decoder==='unclosed'&&played?'IDLE':'NONE';busy=false;closed++;calls.push('close');},
   },appcommon:{AppCommonScreenSaverState:{SCREEN_SAVER_ON:1,SCREEN_SAVER_OFF:0},setScreenSaver(_value:number,done:()=>void){done();}},
  },castAppFixture:{snapshot:()=>({state,opened,played,closed,urls,calls})}});
 },{decoder});
 await page.goto('/');await page.getByRole('button',{name:'允许本次官方投屏会话'}).click();
 return {replies,queue,errors};
}
const state=(page:Page)=>page.evaluate(()=>(globalThis as unknown as{castAppFixture:{snapshot():{state:string;opened:number;played:number;closed:number;urls:string[];calls:string[]}}}).castAppFixture.snapshot());
const send=async(queue:object[],replies:Reply[],action:string,extra='',peer?:number)=>{const before=replies.length;queue.push({action,extra,...(peer===undefined?{}:{peer})});await expect.poll(()=>replies.length).toBeGreaterThan(before);return replies.at(-1)!;};
async function playing(page:Page){await expect.poll(async()=>(await state(page)).state).toBe('PLAYING');await expect(page.locator('#overlays [role=status]')).toContainText('正在播放');}
async function hidden(page:Page,value:boolean){await page.evaluate(value=>{Object.defineProperty(document,'hidden',{configurable:true,value});document.dispatchEvent(new Event('visibilitychange'));},value);}
test('W02 real receiver Worker completes the initial handshake and returns actual nonzero timeline; phone controls and Back restore shell focus',async({page},info)=>{
 const h=await setup(page);await playing(page);expect(h.replies[0]!.status).toBe(200);expect(h.replies[0]!.body).toContain('SetAVTransportURIResponse');
 const position=await send(h.queue,h.replies,'GetPositionInfo');expect(position.body).toContain('<TrackDuration>00:01:20</TrackDuration>');expect(position.body).not.toContain('<RelTime>00:00:00</RelTime>');
 expect((await send(h.queue,h.replies,'Pause')).status).toBe(200);await expect.poll(async()=>(await state(page)).state).toBe('PAUSED');
 await page.getByRole('button',{name:'遥控跳到 5 秒'}).click();await expect(page.locator('#overlays [role=status]')).toContainText('已暂停');await expect(page.getByRole('button',{name:'交还手机控制'})).toBeEnabled();
 const denied=await send(h.queue,h.replies,'Play');expect(denied.status).toBe(500);
 await page.getByRole('button',{name:'遥控暂停 / 继续'}).click();await playing(page);await page.getByRole('button',{name:'交还手机控制'}).click();
 expect((await send(h.queue,h.replies,'Seek','<Unit>REL_TIME</Unit><Target>00:01:00</Target>')).status).toBe(200);await playing(page);await expect(page.getByRole('timer')).toContainText('60.');
 await page.screenshot({path:info.outputPath('receiver.png')});expect((await send(h.queue,h.replies,'Stop')).status).toBe(200);await expect.poll(async()=>(await state(page)).state).toBe('NONE');
 await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'允许本次官方投屏会话'})).toBeFocused();expect(h.errors).toEqual([]);expect(await page.evaluate(()=>Object.keys(localStorage))).toEqual(['bilisofa.receiver.uuid.v1']);
});
test('W02 source replacement validates again, uses a fresh local token and rejects another sender',async({page})=>{
 const h=await setup(page);await playing(page);const first=(await state(page)).urls[0];h.queue.push({part:2});await expect.poll(async()=>(await state(page)).played).toBe(2);await playing(page);
 const s=await state(page);expect(s.urls[1]).not.toBe(first);await expect(page.getByRole('timer')).toContainText('/ 120.0');const before=s.opened;
 h.queue.push({part:3,peer:0x0a000008});await expect.poll(()=>h.replies.filter(r=>r.action==='SetAVTransportURI'&&r.status===500).length).toBe(1);expect((await state(page)).opened).toBe(before);
 await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'允许本次官方投屏会话'})).toBeFocused();expect(h.errors).toEqual([]);
});
test('W02 Home during source validation closes the receiver and late source success cannot play',async({page})=>{
 const h=await setup(page,'hold-transition');await playing(page);h.queue.push({part:2});await expect(page.locator('#overlays [role=status]')).toContainText('正在切换媒体');await hidden(page,true);await expect(page.locator('#overlays')).toBeEmpty();
 await page.waitForTimeout(1300);expect((await state(page)).played).toBe(1);expect((await state(page)).state).toBe('NONE');await hidden(page,false);await expect(page.getByRole('button',{name:'允许本次官方投屏会话'})).toBeFocused();expect(h.errors).toEqual([]);
});
test('W02 failed old decoder closure blocks source replacement and future receiver reuse',async({page})=>{
 const h=await setup(page,'normal','unclosed');await playing(page);h.queue.push({part:2});await expect(page.locator('#pages [role=status]')).toHaveText('请重新打开应用');expect((await state(page)).opened).toBe(1);expect(h.errors).toEqual([]);
});
test('W02 unknown native closure blocks the shell even when AVPlay reaches NONE',async({page})=>{
 await setup(page,'unclosed');await playing(page);await page.keyboard.press('Escape');await expect(page.locator('#pages [role=status]')).toHaveText('请重新打开应用');expect((await state(page)).state).toBe('NONE');
});
test('W02 source verification failure never prepares AVPlay and offers an explicit new-session path',async({page})=>{
 const h=await setup(page,'source-fail');await expect(page.getByRole('button',{name:'允许本次官方投屏会话'})).toBeFocused();await expect(page.locator('#feedback')).toHaveText('投屏已停止，可重新允许会话后重试');expect((await state(page)).opened).toBe(0);expect(h.replies[0]!.status).toBe(200);expect(h.errors).toEqual([]);
});
