import { test, expect } from '@playwright/test';
for (const mode of ['modern-target', 'neither', 'response-identity-mismatch', 'mismatch'] as const) test(`G3 legacy/current readonly comparison ${mode}`, async ({ page }) => {
  const reports: string[] = []; let writeRequests = 0;
  await page.addInitScript(() => {
    const alias = 'fixture-account:bilisofa.w01.account.v1';
    const cookies = '.bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\t' + 'a'.repeat(32) + '\n';
    sessionStorage.setItem(alias, JSON.stringify({ schema: 1, uid: '123456', cookieLines: cookies, expiresAt: Date.now() + 300000 }));
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
  });
  await page.route('**/progress-worker.js', async r => { writeRequests++; await r.abort(); });
  await page.route('**/progress-post/**', async r => { writeRequests++; await r.abort(); });
  await page.route('**/account/manifest.json', r => r.fulfill({ body: '{}' }));
  await page.route('**/fixture-report', async r => { reports.push(r.request().postData()!); await r.fulfill({ body: '{}' }); });
  await page.route('**/native/probe.js', r => r.fulfill({ contentType: 'application/javascript', body: `var M=self.Module;M.callMain=a=>{fetch('/fixture-report',{method:'POST',body:a[1]});M._probe_stop=()=>M.print('HTTP:stopped');M.print('HTTP:ready');setTimeout(()=>M.print('HTTP:served'),5);};M.onRuntimeInitialized();` }));
  await page.route('**/account-readback/probe.js', r => r.fulfill({ contentType: 'application/javascript', body: `
var M=self.Module,length=0,cookieLength=0,closed=false;M.HEAPU8=new Uint8Array(262144);M._auth_input_ptr=()=>1024;M._auth_input_capacity=()=>4096;M._auth_readback_prepare=()=>1;M._auth_import_cookies=()=>1;M._auth_body_ptr=()=>8192;M._auth_body_length=()=>length;M._auth_http_status=()=>200;M._auth_curl_status=()=>0;M._auth_response_clear=()=>{M.HEAPU8.fill(0,8192,139264);length=0;};
M._auth_cookie_ptr=()=>147456;M._auth_cookie_length=()=>cookieLength;M._auth_cookie_clear=()=>{M.HEAPU8.fill(0,147456,151552);cookieLength=0;};M._auth_export_cookies=()=>{var value='.bilibili.com\\tTRUE\\t/\\tTRUE\\t0\\tSESSDATA\\tsynthetic\\n.bilibili.com\\tTRUE\\t/\\tTRUE\\t0\\tbili_jct\\t'+'a'.repeat(32)+'\\n',bytes=new TextEncoder().encode(value);M.HEAPU8.set(bytes,147456);cookieLength=bytes.length;return 1;};
M._auth_stop=()=>{closed=true;M._auth_response_clear();M._auth_cookie_clear();M.print('AUTH:closed');};
M._auth_begin=op=>{setTimeout(()=>{if(closed)return;var data=op===0?{qrcode_key:'a'.repeat(32),url:'https://account.bilibili.com/h5/account-h5/auth/scan-web?navhide=1&qrcode_key='+'a'.repeat(32)+'&callback=https%3A%2F%2Fwww.bilibili.com%2F'}:op===1?{code:0}:op===2?{isLogin:true,mid:${mode === 'mismatch' ? '999999' : '123456'},uname:'fixture',wbi_img:{img_url:'https://i0.hdslb.com/bfs/wbi/'+'0'.repeat(32)+'.png',sub_url:'https://i0.hdslb.com/bfs/wbi/'+'f'.repeat(32)+'.png'}}:op===3?{bvid:'BV14GHy6bE9n',aid:117400733288351,pages:[{cid:42548528128,duration:95}]}:{last_play_time:op===4?0:${mode === 'neither' ? 0 : 15000},last_play_cid:op===4?0:42548528128,login_mid:${mode === 'response-identity-mismatch' ? '999999' : '123456'}};var bytes=new TextEncoder().encode(JSON.stringify({code:0,data}));M.HEAPU8.set(bytes,8192);length=bytes.length;M.print('AUTH:response:'+op);},5);return 1;};M.callMain=()=>M.print('AUTH:ready');M.onRuntimeInitialized();` }));
  await page.goto('/');
  await expect(page.locator('#confirm-progress')).toHaveCount(0);
  await expect.poll(() => reports.join('')).toContain(mode === 'mismatch' ? 'account.identity_mismatch_closed' : mode === 'response-identity-mismatch' ? 'account.readback_identity_unconfirmed_closed' : mode === 'neither' ? 'account.readback_neither_target_closed' : 'account.readback_modern_target_closed');
  if (mode === 'modern-target' || mode === 'neither') await expect(page.locator('#position')).toContainText(mode === 'neither' ? '云端回读 0 毫秒' : '云端回读 15000 毫秒');
  else await expect(page.locator('#position')).toBeEmpty();
  expect(reports.join('')).not.toMatch(/123456|synthetic|SESSDATA|bili_jct|fixture-account|qrcode_key/);
  await page.locator('#clear').click(); await expect(page.locator('#status')).toContainText('account.local_session_deleted');
  expect(await page.evaluate(() => sessionStorage.getItem('fixture-account:bilisofa.w01.account.v1'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('bilisofa.w01.progress-once.v1'))).toContain('"state":"unknown"');
  expect(writeRequests).toBe(0);
});
