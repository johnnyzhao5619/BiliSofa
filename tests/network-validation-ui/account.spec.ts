import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
test.beforeEach(async ({ page }) => {
  const html = await readFile('dist/probe-network/index.html', 'utf8');
  await page.route('http://127.0.0.1:4173/', r => r.fulfill({ contentType: 'text/html', body: html.replace(/content="account-(progress|reconcile(?:-compare)?)"/g, 'content="account"') }));
});
for (const mode of ['expired', 'invalid', 'unavailable'] as const) test(`G3 protected session startup ${mode} reports without QR or account requests`, async ({ page }) => {
  const reports: string[] = []; let accountRequests = 0;
  await page.addInitScript(({ mode }) => {
    Object.assign(globalThis, { tizen: {
      application: { getCurrentApplication: () => ({ appInfo: { id: 'BiliNet001.Probe' }, exit() { throw Error('startup error must not auto-exit'); } }) },
      systeminfo: { getPropertyValue(_key: string, done: (v: object) => void) { done({ ipAddress: '10.0.0.9', status: 'ON' }); } },
      keymanager: {
        getData({ name }: { name: string }) {
          if (name !== 'bilisofa.w01.account.v1') throw Error('unexpected alias');
          if (mode === 'unavailable') throw { name: 'SecurityError' };
          if (mode === 'invalid') return '{}';
          return JSON.stringify({ schema: 1, uid: '123456', expiresAt: Date.now() - 1, cookieLines: '.bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic-expired\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\t' + '0'.repeat(32) + '\n' });
        },
        removeData() { throw Error('no automatic deletion'); }, saveData() { throw Error('no overwrite'); },
      },
    } });
  }, { mode });
  await page.route('**/account/manifest.json', async r => { accountRequests++; await r.abort(); });
  await page.route('**/account-report', async r => { reports.push(r.request().postData()!); await r.fulfill({ body: '{}' }); });
  await page.route('**/native/probe.js', r => r.fulfill({ contentType: 'application/javascript', body: `var M=self.Module;M.callMain=(a)=>{if(a[0]!=='http')throw Error();fetch('/account-report',{method:'POST',body:a[1]});M._probe_stop=()=>M.print('HTTP:stopped');M.print('HTTP:ready');setTimeout(()=>M.print('HTTP:served'),10);};M.onRuntimeInitialized();` }));
  await page.goto('/'); await expect.poll(() => reports.length).toBe(1);
  expect(reports[0]).toContain(`account.saved_session_${mode}_startup`);
  expect(reports[0]).not.toMatch(/synthetic-expired|123456|cookieLines|SESSDATA|bili_jct/);
  await expect(page.locator('#qr')).toBeHidden(); await expect(page.locator('#identity')).toBeEmpty(); await expect(page.locator('#position')).toBeEmpty(); expect(accountRequests).toBe(0);
});
for (const mode of ['login-restore', 'restore-native-print', 'restore-mismatch', 'cancel', 'home', 'abort'] as const) test(`G3 readonly QR private channel ${mode}`, async ({ page }) => {
  const reports: string[] = []; let closed = 0;
  await page.addInitScript(() => {
    Object.assign(globalThis, { tizen: {
      application: { getCurrentApplication: () => ({ appInfo: { id: 'BiliNet001.Probe' }, exit() {} }) },
      systeminfo: { getPropertyValue(_key: string, done: (v: object) => void) { done({ ipAddress: '10.0.0.9', status: 'ON' }); } },
      keymanager: {
        saveData(name: string, value: string, _password: null, done: () => void) { sessionStorage.setItem('fixture-account-vault:' + name, value); setTimeout(done, 10); },
        getData({ name }: { name: string }) { const value = sessionStorage.getItem('fixture-account-vault:' + name); if (value === null) throw { name: 'NotFoundError' }; return value; },
        removeData({ name }: { name: string }) { sessionStorage.removeItem('fixture-account-vault:' + name); },
      },
    } });
  });
  await page.route('**/account/manifest.json', r => r.fulfill({ body: '{}' }));
  await page.route('**/account-closed', async r => { closed++; await r.fulfill({ body: '{}' }); });
  await page.route('**/account-report', async r => { reports.push(r.request().postData()!); await r.fulfill({ body: '{}' }); });
  await page.route('**/account/probe.js', r => r.fulfill({ contentType: 'application/javascript', body: `
var M=self.Module, length=0, cookieLength=0, restored=false, closed=false, inPrint=false;
function emit(line){inPrint=true;try{M.print(line);}finally{inPrint=false;}}
M.HEAPU8=new Uint8Array(262144);M._auth_input_ptr=()=>1024;M._auth_input_capacity=()=>4096;M._auth_body_ptr=()=>8192;M._auth_body_length=()=>length;M._auth_http_status=()=>200;M._auth_curl_status=()=>0;M._auth_response_clear=()=>{M.HEAPU8.fill(0,8192,139264);length=0;};
M._auth_cookie_ptr=()=>147456;M._auth_cookie_length=()=>cookieLength;M._auth_cookie_clear=()=>{M.HEAPU8.fill(0,147456,151552);cookieLength=0;};M._auth_import_cookies=()=>{restored=true;return 1;};
M._auth_export_cookies=()=>{var value='.bilibili.com\\tTRUE\\t/\\tTRUE\\t0\\tSESSDATA\\tsynthetic-private-cookie\\n.bilibili.com\\tTRUE\\t/\\tTRUE\\t0\\tbili_jct\\t'+'0'.repeat(32)+'\\n',bytes=new TextEncoder().encode(value);M.HEAPU8.set(bytes,147456);cookieLength=bytes.length;return 1;};
M._auth_stop=()=>{closed=true;fetch('/account-closed');M._auth_response_clear();M._auth_cookie_clear();if(${mode === 'restore-native-print'}&&inPrint)M.print('AUTH:response:4AUTH:closed');else emit('AUTH:closed');};
M._auth_begin=(op)=>{if(closed)return 0;setTimeout(()=>{if(closed)return;${mode === 'abort' ? "if(op===1){M.print('AUTH:unclosed');return;}" : ''}
var body=op===0?{code:0,data:{qrcode_key:'a'.repeat(32),url:'https://account.bilibili.com/h5/account-h5/auth/scan-web?navhide=1&qrcode_key='+'a'.repeat(32)+'&callback=https%3A%2F%2Fwww.bilibili.com%2F'}}:op===1?{code:0,data:{code:0}}:op===2?{code:0,data:{isLogin:true,mid:${mode === 'restore-mismatch' ? 'restored?999999:123456' : '123456'},uname:'fixture-account'}}:op===3?{code:0,data:{bvid:'BV14GHy6bE9n',aid:117400733288351,pages:[{cid:42548528128,duration:95}]}}:{code:0,data:{last_play_time:52000,last_play_cid:42548528128}};
var bytes=new TextEncoder().encode(JSON.stringify(body));M.HEAPU8.set(bytes,8192);length=bytes.length;emit('AUTH:response:'+op);},10);return 1;};M.callMain=()=>emit('AUTH:ready');M.onRuntimeInitialized();` }));
  await page.route('**/native/probe.js', r => r.fulfill({ contentType: 'application/javascript', body: `var M=self.Module;M.callMain=(a)=>{if(a[0]!=='http')throw Error();fetch('/account-report',{method:'POST',body:a[1]});M._probe_stop=()=>M.print('HTTP:stopped');M.print('HTTP:ready');setTimeout(()=>M.print('HTTP:served'),10);};M.onRuntimeInitialized();` }));
  await page.goto('/'); await page.locator('#login').click();
  if (mode === 'abort') { await expect(page.locator('#qr')).toBeVisible(); await expect.poll(() => reports.length).toBe(1); expect(reports[0]).not.toContain('readonly_saved_closed'); await expect(page.locator('#qr')).toBeHidden(); return; }
  await expect(page.locator('#qr')).toBeVisible(); expect(await page.locator('#qr').evaluate((e: HTMLCanvasElement) => e.width)).toBeGreaterThan(200);
  if (mode === 'cancel' || mode === 'home') {
    if (mode === 'cancel') await page.locator('#stop').click();
    else await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await expect.poll(() => closed).toBe(1); await expect(page.locator('#qr')).toBeHidden(); await page.waitForTimeout(2100);
    expect(await page.evaluate(() => sessionStorage.getItem('fixture-account-vault:bilisofa.w01.account.v1'))).toBeNull(); expect(reports).toHaveLength(0); return;
  }
  await expect.poll(() => reports.length).toBe(1); expect(reports[0]).toContain('account.readonly_saved_closed');
  await expect(page.locator('#identity')).toContainText('fixture-account'); await expect(page.locator('#position')).toContainText('52000'); await expect(page.locator('#qr')).toBeHidden();
  expect(reports[0]).not.toMatch(/synthetic-private-cookie|fixture-account|123456|qrcode_key|SESSDATA|bili_jct|10\.0\.0\.9/);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('synthetic-private-cookie');
  await page.reload(); await expect.poll(() => reports.length).toBe(2);
  if (mode === 'restore-mismatch') { expect(reports[1]).toContain('account.identity_mismatch_closed'); await expect(page.locator('#identity')).toBeEmpty(); }
  else { expect(reports[1]).toContain('account.restore_readonly_closed'); await expect(page.locator('#identity')).toContainText('fixture-account'); }
  await page.locator('#clear').click(); await expect.poll(() => reports.length).toBe(3); expect(reports[2]).toContain('account.local_session_deleted');
  expect(await page.evaluate(() => sessionStorage.getItem('fixture-account-vault:bilisofa.w01.account.v1'))).toBeNull(); await expect(page.locator('#identity')).toBeEmpty();
});
