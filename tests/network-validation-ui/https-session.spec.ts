import { test, expect } from '@playwright/test';
for (const mode of ['pass', 'failure', 'cancel', 'home', 'abort'] as const) test(`G2 HTTPS Worker and protected-store orchestration ${mode}`, async ({ page }) => {
  const reports: string[] = []; let stopped = 0, loads = 0;
  // sessionStorage is ONLY this synthetic native KeyManager stand-in, not the product store.
  await page.addInitScript(() => {
    const api = {
      saveData(name: string, value: string, password: null, done: () => void) { if (password !== null) throw Error(); sessionStorage.setItem('fixture-km:' + name, value); setTimeout(done, 5); },
      getData({ name }: { name: string }) { const value = sessionStorage.getItem('fixture-km:' + name); if (value === null) throw { name: 'NotFoundError' }; return value; },
      removeData({ name }: { name: string }) { sessionStorage.removeItem('fixture-km:' + name); },
    };
    Object.assign(globalThis, { tizen: { keymanager: api, application: { getCurrentApplication: () => ({ appInfo: { id: 'BiliNet001.Probe' }, exit() {} }) }, systeminfo: { getPropertyValue(_key: string, done: (v: object) => void) { done({ ipAddress: '10.0.0.9', status: 'ON' }); } } } });
  });
  await page.route('**/', async r => { const response = await r.fetch(); await r.fulfill({ response, body: (await response.text()).replace(/name="network-mode" content="[a-z-]+"/, 'name="network-mode" content="https-session"') }); });
  await page.route('**/https-session/manifest.json', r => r.fulfill({ body: '{}' }));
  await page.route('**/https-stopped', async r => { stopped++; await r.fulfill({ body: '{}' }); });
  await page.route('**/https-report', async r => { reports.push(r.request().postData()!); await r.fulfill({ body: '{}' }); });
  await page.route('**/https-session/probe.js', async r => { loads++; await r.fulfill({ contentType: 'application/javascript', body: `var M=self.Module;M._https_session_stop=()=>{fetch('/https-stopped');M.print('HSESSION:cancelled');};M.callMain=()=>{M.print('HSESSION:ready');${mode === 'cancel' || mode === 'home' ? '' : mode === 'abort' ? "setTimeout(()=>M.print('HSESSION:unclosed'),30);" : mode === 'failure' ? "setTimeout(()=>M.print('HSESSION:failed:18'),30);" : "setTimeout(()=>{for(var s of ['tls','cookie','isolation','redirect','scope','clear','pass'])M.print('HSESSION:'+s);},30);"}};M.onRuntimeInitialized();` }); });
  await page.route('**/native/probe.js', r => r.fulfill({ contentType: 'application/javascript', body: `var M=self.Module;M.callMain=(a)=>{if(a[0]!=='http')throw Error('only report');fetch('/https-report',{method:'POST',body:a[1]});M._probe_stop=()=>M.print('HTTP:stopped');M.print('HTTP:ready');setTimeout(()=>M.print('HTTP:served'),10);};M.onRuntimeInitialized();` }));
  await page.goto('/');
  if (mode === 'cancel' || mode === 'home') {
    await expect(page.locator('#results')).toContainText('httpsession.ready');
    if (mode === 'home') await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    else await page.locator('#stop').click();
    await expect.poll(() => stopped).toBe(1); expect(reports).toHaveLength(0);
    if (mode === 'home') await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.locator('#report').click();
  }
  await expect.poll(() => reports.length).toBe(1);
  expect(reports[0]).not.toMatch(/10\.0\.0\.9|Cookie:|synthetic-secret-|BEGIN CERTIFICATE|bilisofa\.invalid/);
  if (mode === 'pass') {
    expect(reports[0]).toContain('httpsession.pass_all_closed'); expect(reports[0]).toContain('vault.prepared_restart_required');
    expect(reports[0]).toContain('httpsession.secure_cookie_wire'); expect(reports[0]).toContain('httpsession.credential_scope_wire');
    expect(JSON.parse(reports[0]!).entries).toHaveLength(8);
    const journal = await page.evaluate(() => localStorage.getItem('bilisofa.probe.https-vault.v1'));
    expect(journal).not.toContain('synthetic-secret-'); expect(JSON.parse(journal!)).toEqual({ schema: 1, boot: expect.stringMatching(/^[a-f0-9]{32}$/), digest: expect.stringMatching(/^[a-f0-9]{64}$/) });
    await page.reload(); await expect.poll(() => reports.length).toBe(2);
    expect(reports[1]).toContain('vault.restart_digest_read_deleted'); expect(loads).toBe(1);
    expect(await page.evaluate(() => localStorage.getItem('bilisofa.probe.https-vault.v1'))).toBeNull();
    expect(await page.evaluate(() => sessionStorage.getItem('fixture-km:bilisofa.w01.https-vault.v1'))).toBeNull();
  }
  if (mode === 'failure') { expect(reports[0]).toContain('httpsession.failed_c18'); expect(reports[0]).not.toContain('vault.prepared'); }
  if (mode === 'abort') { expect(reports[0]).toContain('network.cleanup_unconfirmed_restart_required'); await page.locator('#https-session').click(); await page.waitForTimeout(100); expect(loads).toBe(1); }
});
