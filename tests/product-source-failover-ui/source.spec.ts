import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {setup} from '../w04-media-ui/fixture.ts';
import {playFromShelf} from '../product-polish-ui/polish-helpers.ts';
// ADR-102: the 512-byte source check tries each track's Bilibili backup when its first line fails; later
// playback in the same run starts on the line that worked; 帮助与诊断 names the failing step in fixed words.
const bridge=readFileSync('tests/product-source-failover-ui/bridge-fixture.js','utf8');
const deadline="(Math.floor(Date.now()/1000)+7200)";
function api(failing:string){
 const raw=readFileSync('tests/w04-media-ui/vod-api-fixture.js','utf8').replace('__PGC__','0').replace('__FALLBACK__','off');
 const out=raw.replace(`baseUrl:'https://synthetic.bilivideo.com/v'+id+'.m4s?deadline='+${deadline}`,`baseUrl:'https://upos-sz-mirrorcosov.bilivideo.com/v'+id+'.m4s?deadline='+${deadline},backupUrl:['https://upos-hz-mirrorakam.akamaized.net/v'+id+'.m4s?deadline='+${deadline}]`)
  .replace('_vod_http_status:()=>last===3?206:200',`_vod_http_status:()=>last===3?(${failing}.test(checked)?504:206):200`)
  .replace('last=operation;','last=operation;if(operation===3)checked=input();').replace("let primaryBvid='';","let primaryBvid='',checked='';");
 for(const marker of ['mirrorakam','504:206','checked=input()',"checked='';"])expect(out).toContain(marker);
 return out;
}
async function begin(page:Page,failing:string,play=true){
 const errors=await setup(page,false);
 // Registered after the shared fixtures, so these answer first.
 await page.route('**/vod/probe.js',route=>route.fulfill({contentType:'text/javascript',body:bridge}));
 await page.route('**/vod-api/probe.js',route=>route.fulfill({contentType:'text/javascript',body:api(failing)}));
 if(play)await playFromShelf(page);return errors;
}
async function help(page:Page){
 for(let i=0;i<4&&!(await page.locator('[data-focus-id=nav-settings]').isVisible());i++)await page.keyboard.press('Escape');
 await page.locator('[data-focus-id=nav-settings]').click();await page.locator('[data-focus-id=settings-section-help]').click();
 return page.locator('.tv-diagnostic-note');
}
test('ADR-102 a failing first line moves each track to its backup at the source check, and the bridge starts there',async({page})=>{
 const errors=await begin(page,'/mirrorcosov/');
 await expect(await help(page)).toHaveText('本次运行没有播放失败记录（已切换备用线路 2 次）');expect(errors).toEqual([]);
});
test('ADR-102 later playback in the same run starts on the working line without checking the failed one again',async({page})=>{
 const errors=await begin(page,'/mirrorcosov/');
 for(let i=0;i<4&&!(await page.locator('[data-focus-id^=shelf-popular-]').first().isVisible());i++)await page.keyboard.press('Escape');
 await playFromShelf(page);
 // A second failed check would have moved again (4 times); the run-level avoidance puts the backup first.
 await expect(await help(page)).toHaveText('本次运行没有播放失败记录（已切换备用线路 2 次）');expect(errors).toEqual([]);
});
test('ADR-102 when both lines fail, 帮助与诊断 names the step, track, line, node class and upstream code',async({page})=>{
 const errors=await begin(page,'/mirrorcosov|mirrorakam/',false);
 await page.locator('[data-focus-id^=shelf-popular-]').first().click();await page.locator('[data-focus-id=detail-play]').click();
 await expect(page.locator('#overlays')).toContainText('网络连接中断，播放未完成',{timeout:20000});
 const note=await help(page);
 await expect(note).toContainText('最近一次播放失败：读取播放源时 · 网络中断 · 来源检查（视频·备用线路·B站Akamai） · 上游 HTTP 504 / cURL 0 · 已切换备用线路');
 expect(errors).toEqual([]);
});
