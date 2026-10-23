import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
test.beforeEach(async ({ page }) => {
 const html = await readFile('dist/probe-network/index.html','utf8');
 await page.route('http://127.0.0.1:4173/', r => r.fulfill({ contentType:'text/html', body:html.replace('content="account-reconcile-compare"','content="account-reconcile"') }));
});
for (const mode of ['target', 'zero', 'expired-login-target', 'mismatch'] as const) test(`G3 read-only reconciliation ${mode}`, async ({ page }) => {
  const reports: string[] = []; let writeRequests = 0;
  await page.addInitScript(({ mode }) => {
    const alias = 'fixture-account:bilisofa.w01.account.v1';
    const cookies = '.bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\t' + 'a'.repeat(32) + '\n';
    sessionStorage.setItem(alias, JSON.stringify({ schema: 1, uid: '123456', cookieLines: cookies, expiresAt: Date.now() + (mode === 'expired-login-target' ? -1 : 300000) }));
    localStorage.setItem('bilisofa.w01.progress-once.v1', '{"schema":1,"bvid":"BV14GHy6bE9n","targetSec":15,"state":"unknown"}');
    Object.assign(globalThis, { tizen: {
      application: { getCurrentApplication: () => ({ appInfo: { id: 'BiliNet001.Probe' }, exit() { throw Error('read-only result must remain visible'); } }) },
      systeminfo: { getPropertyValue(_key: string, done: (v: object) => void) { done({ ipAddress: '10.0.0.9', status: 'ON' }); } },
      keymanager: {
        getData({ name }: { name: string }) { const value = sessionStorage.getItem('fixture-account:' + name); if (value === null) throw { name: 'NotFoundError' }; return value; },
        removeData({ name }: { name: string }) { sessionStorage.removeItem('fixture-account:' + name); },
        saveData(name: string, value: string, _password: null, done: () => void) { sessionStorage.setItem('fixture-account:' + name, value); queueMicrotask(done); },
      },
    } });
  }, { mode });
  await page.route('**/progress-worker.js', async r => { writeRequests++; await r.abort(); });
  await page.route('**/progress-post/**', async r => { writeRequests++; await r.abort(); });
  await page.route('**/account/manifest.json', r => r.fulfill({ body: '{}' }));
  await page.route('**/fixture-report', async r => { reports.push(r.request().postData()!); await r.fulfill({ body: '{}' }); });
  await page.route('**/native/probe.js', r => r.fulfill({ contentType: 'application/javascript', body: `var M=self.Module;M.callMain=a=>{fetch('/fixture-report',{method:'POST',body:a[1]});M._probe_stop=()=>M.print('HTTP:stopped');M.print('HTTP:ready');setTimeout(()=>M.print('HTTP:served'),5);};M.onRuntimeInitialized();` }));
  await page.route('**/account/probe.js', r => r.fulfill({ contentType: 'application/javascript', body: `
var M=self.Module,length=0,cookieLength=0,closed=false;M.HEAPU8=new Uint8Array(262144);M._auth_input_ptr=()=>1024;M._auth_input_capacity=()=>4096;M._auth_import_cookies=()=>1;M._auth_body_ptr=()=>8192;M._auth_body_length=()=>length;M._auth_http_status=()=>200;M._auth_curl_status=()=>0;M._auth_response_clear=()=>{M.HEAPU8.fill(0,8192,139264);length=0;};
M._auth_cookie_ptr=()=>147456;M._auth_cookie_length=()=>cookieLength;M._auth_cookie_clear=()=>{M.HEAPU8.fill(0,147456,151552);cookieLength=0;};M._auth_export_cookies=()=>{var value='.bilibili.com\\tTRUE\\t/\\tTRUE\\t0\\tSESSDATA\\tsynthetic\\n.bilibili.com\\tTRUE\\t/\\tTRUE\\t0\\tbili_jct\\t'+'a'.repeat(32)+'\\n',bytes=new TextEncoder().encode(value);M.HEAPU8.set(bytes,147456);cookieLength=bytes.length;return 1;};
M._auth_stop=()=>{closed=true;M._auth_response_clear();M._auth_cookie_clear();M.print('AUTH:closed');};
M._auth_begin=op=>{setTimeout(()=>{if(closed)return;var data=op===0?{qrcode_key:'a'.repeat(32),url:'https://account.bilibili.com/h5/account-h5/auth/scan-web?navhide=1&qrcode_key='+'a'.repeat(32)+'&callback=https%3A%2F%2Fwww.bilibili.com%2F'}:op===1?{code:0}:op===2?{isLogin:true,mid:${mode === 'mismatch' ? '999999' : '123456'},uname:'fixture'}:op===3?{bvid:'BV14GHy6bE9n',aid:117400733288351,pages:[{cid:42548528128,duration:95}]}:{last_play_time:${mode === 'zero' ? 0 : 15000},last_play_cid:42548528128};var bytes=new TextEncoder().encode(JSON.stringify({code:0,data}));M.HEAPU8.set(bytes,8192);length=bytes.length;M.print('AUTH:response:'+op);},5);return 1;};M.callMain=()=>M.print('AUTH:ready');M.onRuntimeInitialized();` }));
  await page.goto('/');
  await expect(page.locator('#confirm-progress')).toHaveCount(0);
  if (mode === 'expired-login-target') {
    await expect.poll(() => reports.join('')).toContain('account.saved_session_expired_startup');
    await page.locator('#clear').click(); await expect.poll(() => reports.join('')).toContain('account.local_session_deleted');
    await page.locator('#login').click();
  }
  await expect.poll(() => reports.join('')).toContain(mode === 'mismatch' ? 'account.identity_mismatch_closed' : mode === 'zero' ? 'progress.readonly_other_observed_closed' : 'progress.readonly_target_observed_closed');
  if (mode !== 'mismatch') await expect(page.locator('#position')).toContainText(mode === 'zero' ? '云端回读 0 毫秒' : '云端回读 15000 毫秒');
  expect(reports.join('')).not.toMatch(/123456|synthetic|SESSDATA|bili_jct|fixture-account|qrcode_key/);
  await page.locator('#clear').click(); await expect(page.locator('#status')).toContainText('account.local_session_deleted');
  expect(await page.evaluate(() => sessionStorage.getItem('fixture-account:bilisofa.w01.account.v1'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('bilisofa.w01.progress-once.v1'))).toContain('"state":"unknown"');
  expect(writeRequests).toBe(0);
});
