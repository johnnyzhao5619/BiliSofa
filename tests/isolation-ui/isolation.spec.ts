import { test, expect } from '@playwright/test';
function fixture({ readable = false, identified = true, delay = 10 } = {}) {
  return { readable, identified, delay };
}
for (const readable of [false, true]) test(`W01 observer ${readable ? 'detects unexpected read' : 'keeps NotFound unverified'} without mutation or raw output`, async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(({ readable, identified, delay }) => {
    let reads = 0, exits = 0;
    class ReportWorker {
      onmessage?: (event: { data: unknown }) => void; stopped = false;
      postMessage(request: { version: number; scope: unknown; operation: string; control?: string }) { setTimeout(() => { if (!this.stopped) this.onmessage?.({ data: { version: request.version, scope: request.scope, operation: request.operation, verdict: request.control ? 'UNVERIFIED' : 'PASS', code: request.control ? 'http.stopped' : 'http.report_served_client_identity_unverified', phase: 'final' } }); }, delay); }
      terminate() { this.stopped = true; }
    }
    Object.assign(globalThis, { Worker: ReportWorker, tizen: { application: { getCurrentApplication: () => ({ appInfo: { id: identified ? 'BiliIsola1.Probe' : 'wrong' }, exit: () => { exits++; } }) }, keymanager: { getData(alias: { name: string; packageId?: string }) { reads++; if (alias.name !== 'bilisofa.w01.persistence.v1' || alias.packageId !== 'BiliProbe1') throw new Error('wrong fixture'); if (readable) return 'DO-NOT-EXPORT-SYNTHETIC'; throw { name: 'NotFoundError' }; }, saveData() { throw new Error('mutation'); }, removeData() { throw new Error('mutation'); }, setPermission() { throw new Error('grant'); } }, systeminfo: { getPropertyValue: (_name: string, saved: (v: unknown) => void) => saved({ status: 'CONNECTED', ipAddress: '192.0.2.1' }) } }, fixtureCounts: () => ({ reads, exits }) });
  }, fixture({ readable }));
  await page.goto('/'); await expect(page).toHaveTitle('BiliSofa · W01 隔离观察');
  await expect(page.locator('#stop')).toBeFocused();
  await expect.poll(() => page.evaluate(() => (globalThis as unknown as { fixtureCounts(): { exits: number } }).fixtureCounts().exits)).toBe(1);
  // The app exit is a fixture; export remains DOM-readable for redaction assertions.
  await page.locator('#export').click();
  await expect(page.locator('#export-output')).toHaveValue(new RegExp(readable ? 'foreign_fixture_unexpectedly_readable' : 'foreign_fixture_not_found'));
  await expect(page.locator('#export-output')).not.toHaveValue(/DO-NOT-EXPORT|bilisofa\.w01\.persistence|192\.0\.2/);
  expect(await page.evaluate(() => (globalThis as unknown as { fixtureCounts(): { reads: number } }).fixtureCounts().reads)).toBe(1);
  expect(errors).toEqual([]);
});
test('W01 observer refuses foreign reads under wrong identity and Back owns the exit modal', async ({ page }) => {
  await page.addInitScript(() => { Object.assign(globalThis, { tizen: { application: { getCurrentApplication: () => ({ appInfo: { id: 'BiliProbe1.Probe' }, exit: () => {} }) }, keymanager: { getData() { throw new Error('must not read'); } } } }); });
  await page.goto('/'); await expect(page.locator('#status')).toContainText('http.address_unavailable');
  await page.locator('#export').click(); await expect(page.locator('#export-output')).toHaveValue(/observer_identity_unconfirmed/);
  await expect(page.locator('#export-output')).not.toHaveValue(/foreign_fixture/);
  await page.screenshot({ path: '/tmp/bilisofa-isolation-desktop.png' });
  await page.keyboard.press('Escape'); // Editing/textarea ownership first.
  await page.keyboard.press('Escape'); await expect(page.locator('#cancel-exit')).toBeFocused();
  await page.keyboard.press('Escape'); await expect(page.locator('#export')).toBeFocused();
});


test('W01 observer stop invalidates a late address read and never starts another Worker', async ({ page }) => {
  await page.addInitScript(() => {
    let workers = 0;
    Object.assign(globalThis, { Worker: class { constructor() { workers++; } }, tizen: { application: { getCurrentApplication: () => ({ appInfo: { id: 'BiliIsola1.Probe' }, exit: () => {} }) }, keymanager: { getData() { throw { name: 'NotFoundError' }; } }, systeminfo: { getPropertyValue: (_name: string, saved: (v: unknown) => void) => setTimeout(() => saved({ status: 'CONNECTED', ipAddress: '192.0.2.1' }), 300) } }, fixtureWorkers: () => workers });
  });
  await page.goto('/'); await page.locator('#stop').click(); await expect(page.locator('#status')).toContainText('http.stopped');
  await page.waitForTimeout(400); await expect(page.locator('#status')).toContainText('http.stopped');
  expect(await page.evaluate(() => (globalThis as unknown as { fixtureWorkers(): number }).fixtureWorkers())).toBe(0);
});
