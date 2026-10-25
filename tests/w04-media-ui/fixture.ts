import {expect,type Page}from'@playwright/test';
import {readFileSync}from'node:fs';
import {routeKernelAdapter} from '../ui-kernel/kernel-adapter.ts';
const legacy=readFileSync('tests/media-ui/native-fixture.js','utf8').replace('__VARIANT__','normal');
const rawApi=readFileSync('tests/w04-media-ui/vod-api-fixture.js','utf8'),api=rawApi.replace('__PGC__','0'),bridge=readFileSync('tests/w04-media-ui/vod-bridge-fixture.js','utf8');
const search=readFileSync('tests/search-ui/native-fixture.js','utf8').replace('__VARIANT__','normal');
export async function setup(page: Page, start = true, device: 'package'|'denied'|'other-model'|'no-player' = 'package', trackFallback=false, tickCadenceMs=100) {
  const errors: string[] = []; page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/native/manifest.json',route=>route.fulfill({contentType:'application/json',body:'{}'}));
  await page.route('**/native/probe.js',route=>route.fulfill({contentType:'text/javascript',body:legacy}));
  await page.route('**/vod-api/probe.js',route=>route.fulfill({contentType:'text/javascript',body:api.replace('__FALLBACK__',trackFallback?'on':'off')}));
  await page.route('**/vod/probe.js',route=>route.fulfill({contentType:'text/javascript',body:bridge}));
  await page.route('**/pgc-read/probe.js',route=>route.fulfill({contentType:'text/javascript',body:rawApi.replace('__PGC__','1')}));
  await page.route('**/search/manifest.json',route=>route.fulfill({contentType:'application/json',body:'{}'}));
  await page.route('**/search/probe.js',route=>route.fulfill({contentType:'text/javascript',body:search}));
  const productInfoDeclared=/<tizen:privilege\s+name="http:\/\/developer\.samsung\.com\/privilege\/productinfo"\s*\/>/.test(readFileSync((process.env.BILISOFA_TEST_ROOT??'dist/w04-app')+'/config.xml','utf8'));
  // 0.50.0 (ADR-099): suites start as a guest who already dismissed the first-run welcome; chooser specs clear this.
  await page.addInitScript(()=>{try{if(localStorage.getItem('bilisofa.launch-guest.v1')===null&&!sessionStorage.getItem('fixture.welcome'))localStorage.setItem('bilisofa.launch-guest.v1','1');}catch{}});
  await page.addInitScript(({productInfoDeclared,device,tickCadenceMs})=>{
    let state='NONE', time=0,duration=8000, opened=0,closed=0,rate=1;
    let fails=0;
    let listener:{oncurrentplaytime?:(n:number)=>void;onstreamcompleted?:()=>void;onerror?:(value?:unknown)=>void}={}, old=listener;
    const operations:string[]=[];
    setInterval(()=>{if(state==='PLAYING'){time+=tickCadenceMs*rate;listener.oncurrentplaytime?.(time);}},tickCadenceMs);
    Object.assign(globalThis,{webapis:{productinfo:{getModel:()=>{if(!productInfoDeclared||device==='denied')throw Object.assign(new Error('synthetic permission denied'),{name:'SecurityError'});return device==='other-model'?'UNVERIFIED_MODEL':'U800FD';}},avplay:{
      getState:()=>state,getDuration:()=>duration,
      open(url:string){if(state!=='NONE'||!/^http:\/\/127\.0\.0\.1:(40324\/[a-f0-9]{32}\/manifest.mpd|40325\/[a-f0-9]{32}\/index.m3u8)$/.test(url))throw Error('unowned fixture decoder');if(url.includes(':40325/'))duration=0;else if(!duration)duration=8000;state='IDLE';time=0;rate=1;opened++;operations.push('open');},
      setListener(v:typeof listener){listener=v;old=v;},setDisplayRect(){},prepareAsync(done:()=>void,error:(e:unknown)=>void){setTimeout(()=>{if(fails>0){fails--;error({name:'NotSupportedError'});return;}state='READY';done();},0);},
      play(){state='PLAYING';operations.push('play');},pause(){state='PAUSED';operations.push('pause');},
      seekTo(ms:number,done:()=>void){operations.push('seek');setTimeout(()=>{time=ms;listener.oncurrentplaytime?.(ms);done();},10);},
      setSpeed(n:number){rate=n;operations.push('speed'+n);},stop(){state='IDLE';operations.push('stop');},close(){state='NONE';closed++;operations.push('close');},
    },appcommon:{AppCommonScreenSaverState:{SCREEN_SAVER_ON:1,SCREEN_SAVER_OFF:0},setScreenSaver(_value:number,done:()=>void){done();}}},
    mediaFixture:{failPrepare(n:number){fails=n;},snapshot:()=>({state,time,duration,opened,closed,rate,operations:[...operations]}),tick(ms:number){time=ms;listener.oncurrentplaytime?.(ms);},end(){listener.onstreamcompleted?.();},fail(){listener.onerror?.('PLAYER_ERROR_CONNECTION_FAILED');},duration(ms:number){duration=ms;},late(){old.oncurrentplaytime?.(999999);}}});
    if(device==='no-player')delete (globalThis as unknown as {webapis:{avplay?:unknown}}).webapis.avplay;
  },{productInfoDeclared,device,tickCadenceMs});
  await routeKernelAdapter(page);
  await page.goto('/');if(!start)return errors;if(await page.locator('[data-focus-id=nav-home]').count()){if(await page.locator('.tv-stream-grid').count())await expect(page.locator('.tv-grid .tv-card').first()).toBeVisible();else await expect(page.locator('.tv-grid .tv-card')).toHaveCount(4);await page.locator('.tv-grid .tv-card').first().click();await page.getByRole('button',{name:'播放',exact:true}).click();await expect(page.getByRole('button',{name:'暂停 / 继续',exact:true})).toBeEnabled();return errors;}await page.getByRole('button',{name:'读取游客热门'}).click();await expect(page.locator('.popular-grid button')).toHaveCount(4);
  await page.locator('.popular-grid button').first().click();await expect(page.getByRole('button',{name:'暂停 / 继续',exact:true})).toBeEnabled();
  return errors;
}
export const snapshot=(page:Page)=>page.evaluate(()=>(globalThis as unknown as {mediaFixture:{snapshot():{state:string;time:number;opened:number;closed:number;rate:number;operations:string[]}}}).mediaFixture.snapshot());
export const tick=(page:Page,ms:number)=>page.evaluate(ms=>(globalThis as unknown as {mediaFixture:{tick(ms:number):void}}).mediaFixture.tick(ms),ms);
