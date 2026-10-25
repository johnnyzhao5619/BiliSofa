import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
const native=readFileSync('tests/media-ui/native-fixture.js','utf8');
async function setup(page:Page,variant:string){
 let audio=0;await page.route('**/__fixture-media/audio-*',r=>{audio++;return r.fulfill({body:''});});
 await page.route('**/native/manifest.json',r=>r.fulfill({body:'{}'}));await page.route('**/native/probe.js',r=>r.fulfill({contentType:'text/javascript',body:native.replace('__VARIANT__',variant)}));
 await page.addInitScript(()=>{let state='NONE',opened=0;const saver:number[]=[];Object.assign(globalThis,{webapis:{avplay:{getState:()=>state,getDuration:()=>80000,open(){if(state!=='NONE')throw Error('overlap');state='IDLE';opened++;},setListener(){},setDisplayRect(){},prepareAsync(done:()=>void){state='READY';done();},play(){state='PLAYING';},pause(){state='PAUSED';},seekTo(_ms:number,done:()=>void){setTimeout(done,0);},stop(){state='IDLE';},close(){state='NONE';}},appcommon:{AppCommonScreenSaverState:{SCREEN_SAVER_ON:1,SCREEN_SAVER_OFF:0},setScreenSaver(v:number,done:()=>void){saver.push(v);done();}}},recoveryFixture:{snapshot:()=>({state,opened,saver})}});});
 await page.goto('/');await page.getByRole('button',{name:'读取游客热门'}).click();await expect(page.locator('.popular-grid button')).toHaveCount(4);await page.locator('.popular-grid button').first().click();return {audio:()=>audio};
}
const snapshot=(page:Page)=>page.evaluate(()=>(globalThis as unknown as{recoveryFixture:{snapshot():{state:string;opened:number;saver:number[]}}}).recoveryFixture.snapshot());
test('W03 acknowledged audio timeout retries only that range once before entering the existing media bridge',async({page})=>{
 const h=await setup(page,'audio-timeout-once');await expect(page.locator('#overlays [role=status]')).toHaveText('范围检查超时，正在重试一次');await expect(page.getByRole('button',{name:'暂停 / 继续'})).toBeEnabled();expect(h.audio()).toBe(2);expect((await snapshot(page)).opened).toBe(1);await page.keyboard.press('Escape');await expect(page.locator('.popular-grid button').first()).toBeFocused();
});
for(const [variant,code,attempts]of [['audio-timeout-always','ugc.audio_transport_28',2],['audio-tls','ugc.audio_transport_60',1],['audio-http','ugc.audio_http_412',1],['audio-http-timeout','ugc.audio_transport_28',1],['audio-expiring','ugc.audio_transport_28',1]] as const){
 test(`W03 ${variant} stops with exact terminal cause, no repeated loop or decoder entry`,async({page})=>{const h=await setup(page,variant);await expect(page.locator('#feedback')).toContainText(code);await expect(page.locator('.popular-grid button').first()).toBeFocused();await page.waitForTimeout(900);expect(h.audio()).toBe(attempts);expect((await snapshot(page)).opened).toBe(0);});
}
test('W03 Back cancels the pending retry delay and confirms cleanup without a second audio request',async({page})=>{
 const h=await setup(page,'audio-timeout-once');await expect(page.locator('#overlays [role=status]')).toHaveText('范围检查超时，正在重试一次');await page.keyboard.press('Escape');await expect(page.locator('.popular-grid button').first()).toBeFocused();await page.waitForTimeout(900);expect(h.audio()).toBe(1);expect((await snapshot(page)).opened).toBe(0);
});
test('W03 absent native closed frame never schedules a retry and Back remains blocked on unconfirmed resources',async({page})=>{
 const h=await setup(page,'audio-unclosed');await expect.poll(()=>h.audio()).toBe(1);await page.waitForTimeout(1100);await expect(page.locator('#overlays [role=status]')).toHaveText('正在获取播放源');expect(h.audio()).toBe(1);await page.keyboard.press('Escape');await expect(page.locator('#pages [role=status]')).toHaveText('请重新打开应用',{timeout:14000});expect(h.audio()).toBe(1);expect((await snapshot(page)).opened).toBe(0);
});
