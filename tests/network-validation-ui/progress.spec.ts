import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
// Keep the historical write-mode fixture explicit when the current deliverable
// is the separate read-only reconciliation package.
test.beforeEach(async ({ page }) => {
  let html = await readFile('dist/probe-network/index.html', 'utf8');
  if (/content="account-reconcile(?:-compare)?"/.test(html)) html = html.replace(/content="account-reconcile(?:-compare)?"/, 'content="account-progress"').replace('<button id="clear"', '<button id="preview-progress" data-focus-id="preview-progress">预览</button><button id="confirm-progress" data-focus-id="confirm-progress" disabled>确认15秒</button><button id="clear"');
  await page.route('http://127.0.0.1:4173/', r => r.fulfill({ contentType: 'text/html', body: html }));
  await page.route('**/progress-worker.js', r => r.fulfill({ contentType: 'application/javascript', path: 'build/network-ui/progress-worker.js' }));
});
for (const mode of ['confirmed','unknown-confirmed','unknown-zero','expired-after-post','identity-change','bootstrap-error','home'] as const) test(`G3 progress preview and single confirmation ${mode}`, async ({ page }) => {
  let position = 0, posts = 0, progressStarts = 0;
  await page.addInitScript(() => {
    const alias = 'fixture-account:bilisofa.w01.account.v1';
    if (!sessionStorage.getItem('fixture-initialized')) {
      const cookieLines = [['.bilibili.com','TRUE','/','TRUE','2000000000','SESSDATA','synthetic'],['.bilibili.com','TRUE','/','TRUE','2000000000','bili_jct','a'.repeat(32)]].map(v => v.join(String.fromCharCode(9))).join(String.fromCharCode(10)) + String.fromCharCode(10);
      sessionStorage.setItem(alias, JSON.stringify({ schema: 1, uid: '123456', expiresAt: Date.now() + 300000, cookieLines })); sessionStorage.setItem('fixture-initialized','1');
    }
    Object.assign(globalThis, { tizen: {
      application: { getCurrentApplication: () => ({ appInfo: { id: 'BiliNet001.Probe' }, exit() {} }) },
      systeminfo: { getPropertyValue(_key: string, done: (v: object) => void) { done({ ipAddress: '10.0.0.9', status: 'ON' }); } },
      keymanager: { getData({ name }: { name: string }) { const raw = sessionStorage.getItem('fixture-account:' + name); if (raw === null) throw { name: 'NotFoundError' }; return raw; }, removeData({ name }: { name: string }) { sessionStorage.removeItem('fixture-account:' + name); }, saveData() { throw Error('not logging in again'); } },
    } });
  });
  await page.route('**/account/manifest.json', r => r.fulfill({ body: '{}' }));
  await page.route('**/fixture-position', r => r.fulfill({ body: String(position) }));
  await page.route('**/fixture-post', async r => {
    posts++; if (mode !== 'unknown-zero') position = 15000;
    if (mode === 'expired-after-post') await page.evaluate(() => {
      const key = 'fixture-account:bilisofa.w01.account.v1', value = JSON.parse(sessionStorage.getItem(key)!);
      value.expiresAt = Date.now() - 1; sessionStorage.setItem(key, JSON.stringify(value));
    });
    await r.fulfill({ body: '{}' });
  });
  const reports: string[] = [];
  await page.route('**/fixture-report', async r => { reports.push(r.request().postData()!); await r.fulfill({ body: '{}' }); });
  await page.route('**/native/probe.js', r => r.fulfill({ contentType: 'application/javascript', body: `var M=self.Module;M.callMain=(a)=>{fetch('/fixture-report',{method:'POST',body:a[1]});M._probe_stop=()=>M.print('HTTP:stopped');M.print('HTTP:ready');setTimeout(()=>M.print('HTTP:served'),5);};M.onRuntimeInitialized();` }));
  for (const kind of ['account','progress-post']) await page.route(`**/${kind}/probe.js`, async r => {
    if (kind === 'progress-post') progressStarts++;
    if (kind === 'progress-post' && mode === 'bootstrap-error') { await r.abort(); return; }
    await r.fulfill({ contentType: 'application/javascript', body: `
var M=self.Module,len=0,closed=false,rc=0;M.HEAPU8=new Uint8Array(262144);M._auth_input_ptr=()=>1024;M._auth_input_capacity=()=>4096;M._auth_import_cookies=()=>1;M._auth_body_ptr=()=>8192;M._auth_body_length=()=>len;M._auth_http_status=()=>200;M._auth_curl_status=()=>rc;M._auth_response_clear=()=>{M.HEAPU8.fill(0,8192,139264);len=0;};M._auth_cookie_ptr=()=>147456;M._auth_cookie_length=()=>0;M._auth_cookie_clear=()=>{};M._auth_export_cookies=()=>0;
M._auth_stop=()=>{closed=true;M._auth_response_clear();M.print('AUTH:closed');};
function response(op,body){if(closed)return;var bytes=new TextEncoder().encode(JSON.stringify(body));M.HEAPU8.set(bytes,8192);len=bytes.length;M.print('AUTH:response:'+op);}
M._auth_begin=(op)=>{setTimeout(async()=>{if(closed)return;${kind === 'progress-post' && mode === 'home' ? 'if(op===2)return;' : ''}
var value=op===2?{isLogin:true,mid:${kind === 'progress-post' && mode === 'identity-change' ? '999999' : '123456'},uname:'fixture',wbi_img:{img_url:'https://i0.hdslb.com/bfs/wbi/'+'0'.repeat(32)+'.png',sub_url:'https://i0.hdslb.com/bfs/wbi/'+'f'.repeat(32)+'.png'}}:op===3?{bvid:'BV14GHy6bE9n',aid:117400733288351,pages:[{cid:42548528128,duration:95}]}:{last_play_time:Number(await (await fetch('/fixture-position')).text()),last_play_cid:42548528128};response(op,{code:0,data:value});},5);return 1;};
M._progress_prepare=()=>1;M._progress_attempt=()=>{fetch('/fixture-post').then(()=>{rc=${mode.startsWith('unknown') ? '28' : '0'};response(5,{code:0});});return 1;};M.callMain=()=>M.print('AUTH:ready');M.onRuntimeInitialized();
` });
  });
  await page.goto('/'); await expect(page.locator('#status')).toContainText('progress.preview_ready_no_write'); await expect(page.locator('#confirm-progress')).toBeEnabled(); expect(posts).toBe(0); expect(progressStarts).toBe(0);
  await page.locator('#confirm-progress').click();
  if (mode === 'bootstrap-error') { await expect(page.locator('#status')).toContainText('progress.worker_close_unconfirmed'); expect(posts).toBe(0); await expect(page.locator('#confirm-progress')).toBeDisabled(); expect(JSON.stringify(reports)).not.toContain('progress.write_unknown_closed'); return; }
  if (mode === 'home') {
    await expect.poll(() => progressStarts).toBe(1);
    await page.evaluate(() => { Object.defineProperty(document,'hidden',{ value:true,configurable:true }); document.dispatchEvent(new Event('visibilitychange')); });
    await expect(page.locator('#confirm-progress')).toBeDisabled(); await expect(page.locator('#identity')).toBeEmpty(); await page.waitForTimeout(100); expect(posts).toBe(0); return;
  }
  await expect(page.locator('#status')).toContainText(['unknown-zero','expired-after-post'].includes(mode) ? 'progress.write_unknown_closed' : mode === 'identity-change' ? 'progress.write_rejected_closed' : 'progress.write_readback_confirmed_closed');
  expect(posts).toBe(mode === 'identity-change' ? 0 : 1); await expect(page.locator('#confirm-progress')).toBeDisabled();
  expect(JSON.stringify(reports)).not.toMatch(/SESSDATA|bili_jct|123456|fixture-account/);
  const marker = await page.evaluate(() => localStorage.getItem('bilisofa.w01.progress-once.v1')); expect(marker).not.toMatch(/SESSDATA|bili_jct|123456|synthetic/);
  if (mode === 'expired-after-post') {
    await expect.poll(() => JSON.stringify(reports)).toContain('progress.readback_session_expired');
    await expect(page.locator('#position')).toContainText('本次结果未确认');
    // Only the synthetic login lifetime is renewed. The durable intent remains.
    await page.evaluate(() => { const key = 'fixture-account:bilisofa.w01.account.v1', value = JSON.parse(sessionStorage.getItem(key)!); value.expiresAt = Date.now() + 300000; sessionStorage.setItem(key, JSON.stringify(value)); });
  } else if (mode !== 'identity-change') await expect.poll(() => JSON.stringify(reports)).toContain(mode === 'unknown-zero' ? 'progress.readback_other_closed' : 'progress.readback_target_closed');
  await page.reload(); await expect(page.locator('#status')).toContainText(mode === 'unknown-zero' || mode === 'identity-change' ? 'progress.preview_locked_no_write' : 'progress.readonly_target_observed_closed'); await expect(page.locator('#confirm-progress')).toBeDisabled(); expect(posts).toBe(mode === 'identity-change' ? 0 : 1);
  await page.locator('#clear').click(); await expect(page.locator('#status')).toContainText('account.local_session_deleted');
  expect(await page.evaluate(() => sessionStorage.getItem('fixture-account:bilisofa.w01.account.v1'))).toBeNull(); expect(await page.evaluate(() => localStorage.getItem('bilisofa.w01.progress-once.v1'))).not.toBeNull();
});
