import { expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { routeKernelAdapter } from '../ui-kernel/kernel-adapter.ts';
const native=readFileSync('tests/cast-app-ui/native-fixture.js','utf8');
interface Reply{action:string;id:number;status:number;body:string;}
export async function setup(page:Page,variant='normal',decoder='normal',initialOffset=12000){
 let loads=0;const replies:Reply[]=[],queue:object[]=[],errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/native/manifest.json',r=>r.fulfill({body:'{}'}));
 await page.route('**/cast-product/probe.js',r=>r.fulfill({contentType:'text/javascript',body:variant==='new-sender-on-reset'?native.replace('__VARIANT__','normal').replaceAll('peer=0x0a000009',loads++===0?'peer=0x0a000009':'peer=0x0a000008'):native.replace('__VARIANT__',variant==='fail-first'?(loads++===0?'source-fail':'normal'):variant)}));
 await page.route('**/cast-fixture/result',async r=>{replies.push(r.request().postDataJSON());await r.fulfill({body:'{}'});});
 await page.route('**/cast-fixture/next',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(queue.shift()??null)}));
 // 0.50.0 (ADR-099): start as a guest who already dismissed the first-run welcome.
 await page.addInitScript(()=>{try{if(localStorage.getItem('bilisofa.launch-guest.v1')===null)localStorage.setItem('bilisofa.launch-guest.v1','1');}catch{}});
 await page.addInitScript(({decoder,initialOffset})=>{
  let state='NONE',listener:{oncurrentplaytime?:(ms:number)=>void}={},time=0,offset=0,prebuffer=false,busy=false,opened=0,played=0,closed=0;
  const urls:string[]=[],calls:string[]=[];
  setInterval(()=>{if(state==='PLAYING'&&!busy){time+=100;listener.oncurrentplaytime?.(time);}},100);
  Object.assign(globalThis,{tizen:{systeminfo:{getPropertyValue(name:string,done:(v:object)=>void){done({status:name==='WIFI_NETWORK'?'ON':'CONNECTED',ipAddress:'10.0.0.9'});}}},webapis:{
   avplay:{getState:()=>state,getDuration(){if(busy)throw Error('fixture.getter_while_busy');return urls.at(-1)===urls[0]?80000:120000;},
    open(url:string){if(state!=='NONE'||!/^http:\/\/127\.0\.0\.1:40324\/[a-f0-9]{32}\/cast\.mp4$/.test(url))throw Error('fixture.unowned_source');urls.push(url);opened++;state='IDLE';offset=initialOffset;prebuffer=false;calls.push('open');},
    setListener(value:typeof listener){listener=value;},setDisplayRect(){},setBufferingParam(){},setTimeoutForBuffering(){},
    setStreamingProperty(_key:string,value:string){prebuffer=true;offset=decoder==='ignored-start-offset'?0:Number(value);calls.push('prebuffer');},
    prepareAsync(done:()=>void){busy=true;setTimeout(()=>{busy=false;if(state==='NONE')return;state=prebuffer?'IDLE':'READY';done();},decoder==='slow-prepare'?1000:30);},
    play(){state='PLAYING';time=offset;listener.oncurrentplaytime?.(time);played++;calls.push('play');},pause(){state='PAUSED';calls.push('pause');},
    seekTo(ms:number,done:()=>void,error:(value:unknown)=>void){busy=true;calls.push('seek');setTimeout(()=>{busy=false;if(decoder==='native-seek-fail'){error({name:'InvalidValuesError'});return;}time=decoder==='native-seek-forward'&&ms===2000?5150:ms;listener.oncurrentplaytime?.(time);done();},decoder==='slow-seek'?800:30);},
    stop(){state='IDLE';calls.push('stop');},close(){state=decoder==='unclosed'&&played?'IDLE':'NONE';busy=false;closed++;calls.push('close');},
   },appcommon:{AppCommonScreenSaverState:{SCREEN_SAVER_ON:1,SCREEN_SAVER_OFF:0},setScreenSaver(_value:number,done:()=>void){done();}},
  },castAppFixture:{snapshot:()=>({state,time,opened,played,closed,urls,calls})}});
 },{decoder,initialOffset});
 await page.route('**/native/probe.js',r=>r.fulfill({contentType:'text/javascript',body:readFileSync('tests/media-ui/native-fixture.js','utf8').replace('__VARIANT__','normal')}));
 await routeKernelAdapter(page);
 await page.goto('/');if(await page.locator('[data-focus-id=nav-cast]').count())await page.locator('[data-focus-id=nav-cast]').click();await page.locator('[data-focus-id=cast-entry]').click();
 return {replies,queue,errors};
}
export const state=(page:Page)=>page.evaluate(()=>(globalThis as unknown as{castAppFixture:{snapshot():{state:string;time:number;opened:number;played:number;closed:number;urls:string[];calls:string[]}}}).castAppFixture.snapshot());
export const send=async(queue:object[],replies:Reply[],action:string,extra='',peer?:number)=>{const before=replies.length;queue.push({action,extra,...(peer===undefined?{}:{peer})});await expect.poll(()=>replies.length).toBeGreaterThan(before);return replies.at(-1)!;};
export async function playing(page:Page){await expect.poll(async()=>(await state(page)).state).toBe('PLAYING');await expect(page.locator('#overlays [role=status]:visible')).toContainText('正在播放');}
export async function hidden(page:Page,value:boolean){await page.evaluate(value=>{Object.defineProperty(document,'hidden',{configurable:true,value});document.dispatchEvent(new Event('visibilitychange'));},value);}

