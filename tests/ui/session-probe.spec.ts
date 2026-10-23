import { test, expect } from '@playwright/test';
for (const mode of ['pass','cancel','uncertain','auto'] as const) test(`W01 session HTTP wire ${mode} uses actual Worker and closure ownership`, async ({ page }) => {
  let loads = 0, cleaned = 0, report: string | undefined;
  await page.route('**/native/manifest.json',r=>r.fulfill({body:'{}'}));
  await page.route('**/session-cleaned',async r=>{cleaned++;await r.fulfill({body:'ok'});});
  await page.route('**/session-report',async r=>{report=r.request().postData()!;await r.fulfill({body:'ok'});});
  await page.addInitScript(()=>{Object.assign(globalThis,{tizen:{systeminfo:{getPropertyValue(_name:string,done:(v:object)=>void){done({ipAddress:'10.0.0.9',status:'ON'});}}}});});
  if(mode==='auto')await page.route('**/',async r=>{const response=await r.fetch();await r.fulfill({response,body:(await response.text()).replace('name="probe-auto" content="0"','name="probe-auto" content="7"')});});
  await page.route('**/native/probe.js',async r=>{
    loads++;await r.fulfill({contentType:'application/javascript',body:`var M=self.Module;M.callMain=(a)=>{if(a[0]==='http'){M._probe_stop=()=>M.print('HTTP:stopped');fetch('/session-report',{method:'POST',body:a[1]});M.print('HTTP:ready');setTimeout(()=>M.print('HTTP:served'),10);return;}if(a[0]!=='session-wire'||!/^[a-f0-9]{32}$/.test(a[1]))throw Error('invalid scoped nonce');M._session_probe_stop=()=>{fetch('/session-cleaned');M.print('SESSION:cancelled');};M.print('SESSION:ready');${mode==='cancel'?'':mode==='uncertain'?"setTimeout(()=>M.print('SESSION:failed:17'),20);":"setTimeout(()=>{for(var s of ['headers','isolation','redirect','clear','pass'])M.print('SESSION:'+s);},20);"}};M.onRuntimeInitialized();`});
  });
  await page.goto('/');if(mode!=='auto')await page.locator('#session-wire').click();
  if(mode==='cancel'){
    await expect(page.locator('#results')).toContainText('session.ready');await page.locator('#stop').click();await expect.poll(()=>cleaned).toBe(1);
    await page.locator('#session-wire').click();await expect.poll(()=>loads).toBe(2);await page.locator('#stop').click();await expect.poll(()=>cleaned).toBe(2);
  }else if(mode==='uncertain'){
    await expect(page.locator('#results')).toContainText('session.worker_unsupported');await page.locator('#session-wire').click();await expect(page.locator('#results')).toContainText('session.worker_unknown');expect(loads).toBe(1);
  }else{
    await expect(page.locator('#results')).toContainText('session.pass_all_closed');
    if(mode==='auto'){await expect.poll(()=>report).toBeTruthy();expect(report).toContain('session.pass_all_closed');expect(report).toContain('session.two_jars_isolated_wire');expect(report).not.toMatch(/127\.0\.0\.1|10\.0\.0\.9|012345|Set-Cookie/);}
  }
});
