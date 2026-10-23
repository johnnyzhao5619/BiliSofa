import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('G3 actual linked account WASM imports synthetic cookies and closes without any upstream request', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await page.route('**/import-harness', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Local WASM import fixture</title>' }));
  await page.route('**/account-import-fixture.js', r => r.fulfill({ contentType: 'application/javascript', body: `
var Module={noInitialRun:true,onRuntimeInitialized(){Module.callMain([]);},
print(line){
 if(line==='AUTH:ready')setTimeout(()=>{
  postMessage('fixture.import_start');
  var value='.bilibili.com\\tTRUE\\t/\\tTRUE\\t2000000000\\tSESSDATA\\tsynthetic%2Csession\\n.bilibili.com\\tTRUE\\t/\\tTRUE\\t2000000000\\tbili_jct\\t'+'a'.repeat(32)+'\\n',bytes=new TextEncoder().encode(value),at=Module._auth_input_ptr();
  Module.HEAPU8.fill(0,at,at+4097);Module.HEAPU8.set(bytes,at);
  if(Module._auth_import_cookies(bytes.length)!==1){postMessage('fixture.import_rejected');Module._auth_stop();return;}
  postMessage('fixture.import_pass');
  if(Module._auth_export_cookies()!==1){postMessage('fixture.export_rejected');Module._auth_stop();return;}
  Module._auth_cookie_clear();postMessage('fixture.export_clear_pass');Module._auth_stop();
 },0);
 else if(line==='AUTH:closed'||line==='AUTH:unclosed')postMessage(line);
},printErr(){},onAbort(){postMessage('fixture.abort');},locateFile(name){return 'account/'+name;}};
importScripts('account/probe.js');
` }));
  await page.goto('/import-harness');
  const result = await page.evaluate(async () => new Promise<string[]>(resolve => {
    const worker = new Worker('/account-import-fixture.js'), values: string[] = [];
    const finish = () => { clearTimeout(timer); worker.terminate(); resolve(values); };
    const timer = setTimeout(() => { values.push('fixture.timeout'); finish(); }, 10000);
    worker.onerror = () => { values.push('fixture.worker_error'); finish(); };
    worker.onmessage = event => { values.push(event.data); if (['AUTH:closed', 'AUTH:unclosed', 'fixture.abort'].includes(event.data)) finish(); };
  }));
  expect(result).toEqual(['fixture.import_start', 'fixture.import_pass', 'fixture.export_clear_pass', 'AUTH:closed']);
  expect(requests.every(url => new URL(url).origin === 'http://127.0.0.1:4173')).toBe(true);
});

for (const mode of ['decline-http', 'cancel-before-import'] as const) test(`G3 production Worker actual WASM ${mode} closes after native stdout flush`, async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await page.route('**/import-harness', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Local production Worker fixture</title>' }));
  const native = await readFile('dist/probe-network/account/probe.js', 'utf8');
  await page.route('**/account/probe.js', r => r.fulfill({ contentType: 'application/javascript', body: `
var originalInit=self.Module.onRuntimeInitialized;
var originalPrint=self.Module.print;self.Module.print=function(line){postMessage({trace:String(line)});var result=originalPrint(line);
 if(line==='AUTH:ready'&&${mode === 'cancel-before-import'})queueMicrotask(()=>self.onmessage({data:{version:1,operation:'account-probe',scope:{accountId:'w01-authorized-account',generation:1,mediaSessionId:'restore-fixture',requestId:'r1'},control:'stop'}}));return result;};
self.Module.onRuntimeInitialized=function(){
 var originalImport=self.Module._auth_import_cookies;self.Module._auth_import_cookies=function(length){postMessage({trace:'fixture.import_called'});return originalImport(length);};
 self.Module._auth_begin=function(){postMessage({trace:'fixture.http_declined'});return 0;};originalInit();};
` + native }));
  await page.goto('/import-harness');
  const result = await page.evaluate(async () => new Promise<unknown[]>(resolve => {
    const worker = new Worker('/account-worker.js'), values: unknown[] = [];
    const finish = () => { clearTimeout(timer); worker.terminate(); resolve(values); };
    const timer = setTimeout(() => { values.push('fixture.timeout'); finish(); }, 10000);
    worker.onerror = () => { values.push('fixture.worker_error'); finish(); };
    worker.onmessage = event => { values.push(event.data); if (event.data.kind === 'closed') finish(); };
    const tab = String.fromCharCode(9), newline = String.fromCharCode(10);
    const cookieLines = [['.bilibili.com', 'TRUE', '/', 'TRUE', '2000000000', 'SESSDATA', 'synthetic%2Csession'], ['.bilibili.com', 'TRUE', '/', 'TRUE', '2000000000', 'bili_jct', 'a'.repeat(32)]].map(fields => fields.join(tab)).join(newline) + newline;
    worker.postMessage({ version: 1, operation: 'account-probe', scope: { accountId: 'w01-authorized-account', generation: 1, mediaSessionId: 'restore-fixture', requestId: 'r1' }, session: { schema: 1, uid: '123456', expiresAt: Date.now() + 300000, cookieLines } });
  }));
  expect(result, JSON.stringify(requests)).toContainEqual(expect.objectContaining({ kind: 'closed', code: mode === 'decline-http' ? 'account.invalid_closed' : 'account.cancelled_closed' }));
  expect(result.filter(value => typeof value === 'object' && value && 'trace' in value)).toEqual(mode === 'decline-http' ? [{ trace: 'AUTH:ready' }, { trace: 'fixture.import_called' }, { trace: 'fixture.http_declined' }, { trace: 'AUTH:closed' }] : [{ trace: 'AUTH:ready' }, { trace: 'AUTH:closed' }]);
  expect(requests.every(url => new URL(url).origin === 'http://127.0.0.1:4173')).toBe(true);
});
