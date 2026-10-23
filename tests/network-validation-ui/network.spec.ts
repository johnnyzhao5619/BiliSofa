import { test, expect } from '@playwright/test';
for (const mode of ['pass', 'failure', 'cancel', 'home', 'abort', 'session', 'session-cancel', 'session-abort'] as const) test(`W01 isolated modern network ${mode} preserves native closure and report boundaries`, async ({ page }) => {
  let report = '', closed = 0, loads = 0;
  await page.addInitScript(() => { Object.assign(globalThis, { tizen: { systeminfo: { getPropertyValue(_name: string, done: (v: object) => void) { done({ ipAddress: '10.0.0.9', status: 'ON' }); } } } }); });
  await page.route('**/validation/manifest.json', r => r.fulfill({ body: '{}' }));
  await page.route('**/network-closed', async r => { closed++; await r.fulfill({ body: '{}' }); });
  await page.route('**/network-report', async r => { report = r.request().postData()!; await r.fulfill({ body: '{}' }); });
  await page.route('**/', async r => { const response = await r.fetch(); await r.fulfill({ response, body: (await response.text()).replace(/name="network-mode" content="(?:tls|session|https-session)"/, 'name="network-mode" content="' + (mode.startsWith('session') ? 'session' : 'tls') + '"') }); });
  await page.route('**/validation/probe.js', async r => { loads++; await r.fulfill({ contentType: 'application/javascript', body: `var M=self.Module;M._network_validation_stop=()=>{fetch('/network-closed');M.print('NET:cancelled');};M.callMain=()=>{for(var s of ['versions','random','ready'])M.print('NET:'+s);${(mode === 'cancel' || mode === 'home') ? '' : mode === 'abort' ? "setTimeout(()=>M.print('NET:unclosed'),30);" : `setTimeout(()=>{M.print('NET:tls:positive:0:0:0');M.print('NET:tls:expired:${mode === 'failure' ? '1:28:0' : '0:60:10'}');M.print('NET:tls:hostname:0:60:62');M.print('NET:tls:selfsigned:0:60:18');M.print('NET:${mode === 'failure' ? 'failed' : 'pass'}');},30);`}};M.onRuntimeInitialized();` }); });
  await page.route('**/native/probe.js', r => r.fulfill({ contentType: 'application/javascript', body: `var M=self.Module;M.callMain=(a)=>{if(a[0]==='session-wire'){if(!/^[a-f0-9]{32}$/.test(a[1]))throw Error('invalid nonce');M._session_probe_stop=()=>{fetch('/network-closed');M.print('SESSION:cancelled');};M.print('SESSION:ready');${mode === 'session-cancel' ? '' : mode === 'session-abort' ? "setTimeout(()=>{M.printErr('Calling fcntl with F_SETFL command on socket is not supported private-fixture-marker');M.onAbort('abort');},30);" : "setTimeout(()=>{for(var s of ['headers','isolation','redirect','clear','pass'])M.print('SESSION:'+s);},30);"}return;}if(a[0]!=='http')throw Error('only report or synthetic session allowed');fetch('/network-report',{method:'POST',body:a[1]});M._probe_stop=()=>M.print('HTTP:stopped');M.print('HTTP:ready');setTimeout(()=>M.print('HTTP:served'),10);};M.onRuntimeInitialized();` }));
  await page.goto('/');
  if (mode === 'cancel' || mode === 'home' || mode === 'session-cancel') {
    await expect(page.locator('#results')).toContainText(mode === 'session-cancel' ? 'session.ready' : 'network.ready');
    if (mode === 'home') await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    else await page.locator('#stop').click();
    await expect.poll(() => closed).toBe(1);
    if (mode === 'home') await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(100); expect(report).toBe(''); await page.locator('#report').click();
  }
  await expect.poll(() => report).not.toBe('');
  if (mode === 'pass') expect(report).toContain('network.pass_all_closed');
  if (mode === 'session') { expect(report).toContain('session.pass_all_closed'); expect(report).toContain('session.two_jars_isolated_wire'); expect(report).toContain('session.jar_clear_isolated_wire'); }
  if (mode === 'session-abort') { expect(report).toContain('session.native_issue_fcntl_setfl'); expect(report).toContain('network.cleanup_cause_unsupported'); expect(report).toContain('network.cleanup_unconfirmed_restart_required'); expect(report).not.toContain('private-fixture-marker'); expect(report).not.toContain('session.pass_all_closed'); }
  if (mode === 'failure') { expect(report).toContain('network.tls_expired_fail_c28_v0'); expect(report).toContain('network.failed_all_closed'); expect(report).not.toContain('network.pass_all_closed'); }
  if (mode === 'abort') { expect(report).toContain('network.cleanup_unconfirmed_restart_required'); await page.locator('#run').click(); await page.waitForTimeout(100); expect(loads).toBe(1); }
  expect(report).not.toMatch(/10\.0\.0\.9|Set-Cookie|https:\/\//);
});
