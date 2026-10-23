import {test,expect,type Page} from '@playwright/test';
import {snapshot} from '../w04-media-ui/fixture.ts';
import {start} from '../product-polish-ui/polish-helpers.ts';
// ADR-100: a transient network failure during playback reconnects with a fresh source, at most twice in two minutes.
/** Existing quality/track fallback (VodCatalogMedia) absorbs the first drops; keep dropping until the session fails and the reconnect starts. */
async function dropUntilReconnect(page:Page,n:number){
 const overlays=page.locator('#overlays');
 for(let i=0;i<6;i++){const opened=(await snapshot(page)).opened;await fixture(page).fail();
  if(await overlays.getByText(`正在重新连接…（${n}/2）`).waitFor({state:'visible',timeout:1200}).then(()=>true,()=>false))return;
  await expect.poll(async()=>(await snapshot(page)).opened,{timeout:8000}).toBeGreaterThan(opened);await expect.poll(async()=>(await snapshot(page)).state,{timeout:8000}).toBe('PLAYING');}
 throw new Error('reconnect never started');
}
const fixture=(page:Page)=>({tick:(ms:number)=>page.evaluate(v=>(globalThis as unknown as {mediaFixture:{tick(ms:number):void}}).mediaFixture.tick(v),ms),fail:()=>page.evaluate(()=>(globalThis as unknown as {mediaFixture:{fail():void}}).mediaFixture.fail())});
test('ADR-100 one network drop reopens the same item a little before where it stopped, without a terminal error',async({page})=>{
 // The synthetic part is 8 s long (catalog duration), so positions stay inside it.
 const errors=await start(page);const f=fixture(page);await f.tick(6000);const opened=(await snapshot(page)).opened;
 await dropUntilReconnect(page,1);
 await expect.poll(async()=>(await snapshot(page)).opened,{timeout:8000}).toBeGreaterThan(opened);await expect.poll(async()=>(await snapshot(page)).state,{timeout:8000}).toBe('PLAYING');
 expect((await snapshot(page)).time).toBeGreaterThanOrEqual(4000);await expect(page.locator('#overlays')).not.toContainText('网络连接中断');expect(errors).toEqual([]);
});
test('ADR-100 a third drop within two minutes stops with the normal message and no further reopen',async({page})=>{
 const errors=await start(page);const f=fixture(page);
 for(const n of [1,2]){await f.tick(5000);const opened=(await snapshot(page)).opened;await dropUntilReconnect(page,n);await expect.poll(async()=>(await snapshot(page)).opened,{timeout:9000}).toBeGreaterThan(opened);await expect.poll(async()=>(await snapshot(page)).state,{timeout:9000}).toBe('PLAYING');}
 const overlays=page.locator('#overlays');for(let i=0;i<6&&!(await overlays.getByText('网络连接中断，播放未完成').waitFor({state:'visible',timeout:1500}).then(()=>true,()=>false));i++){await f.fail();}
 await expect(overlays).toContainText('网络连接中断，播放未完成');const opened=(await snapshot(page)).opened;
 await page.waitForTimeout(4000);expect((await snapshot(page)).opened).toBe(opened);expect(errors).toEqual([]);
});
