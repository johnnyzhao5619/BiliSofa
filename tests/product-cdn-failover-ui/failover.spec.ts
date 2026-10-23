import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {setup,snapshot} from '../w04-media-ui/fixture.ts';
import {playFromShelf} from '../product-polish-ui/polish-helpers.ts';
// ADR-101: every track carries Bilibili's own backup to the bridge; once a host failed, later sessions on the page start on the backup.
const bridge=readFileSync('tests/product-cdn-failover-ui/bridge-fixture.js','utf8');
const api=readFileSync('tests/w04-media-ui/vod-api-fixture.js','utf8').replace('__PGC__','0').replace('__FALLBACK__','off')
 .replace("SegmentBase:{Initialization:'0-31'","backupUrl:['https://upos-hz-mirrorakam.akamaized.net/v'+id+'.m4s?deadline='+(Math.floor(Date.now()/1000)+7200)],SegmentBase:{Initialization:'0-31'")
 .replace("baseUrl:'https://synthetic.bilivideo.com/v'","baseUrl:'https://upos-sz-mirrorcosov.bilivideo.com/v'");
const fail=(page:Page)=>page.evaluate(()=>(globalThis as unknown as {mediaFixture:{fail():void}}).mediaFixture.fail());
async function begin(page:Page){
 const errors=await setup(page,false);
 // Registered after the shared fixtures, so these answer first.
 await page.route('**/vod/probe.js',route=>route.fulfill({contentType:'text/javascript',body:bridge}));
 await page.route('**/vod-api/probe.js',route=>route.fulfill({contentType:'text/javascript',body:api}));
 await playFromShelf(page);return errors;
}
test('ADR-101 the bridge gets both backups, and after one move the reconnect starts on the backup without moving again',async({page})=>{
 expect(api).toContain('mirrorakam');expect(api).toContain('mirrorcosov');const errors=await begin(page);
 await expect.poll(async()=>(await snapshot(page)).state,{timeout:8000}).toBe('PLAYING');await page.waitForTimeout(300);
 const overlays=page.locator('#overlays');
 for(let i=0;i<6&&!(await overlays.getByText('正在重新连接…（1/2）').waitFor({state:'visible',timeout:1200}).then(()=>true,()=>false));i++){
  const opened=(await snapshot(page)).opened;await fail(page);
  await expect.poll(async()=>(await snapshot(page)).opened,{timeout:8000}).toBeGreaterThan(opened);
 }
 await expect.poll(async()=>(await snapshot(page)).state,{timeout:9000}).toBe('PLAYING');
 await page.keyboard.press('Escape');await page.keyboard.press('Escape');
 await page.locator('[data-focus-id=nav-settings]').click();await page.locator('[data-focus-id=settings-section-help]').click();
 await expect(page.locator('.tv-diagnostic-note')).toContainText('已切换备用线路 1 次');expect(errors).toEqual([]);
});
