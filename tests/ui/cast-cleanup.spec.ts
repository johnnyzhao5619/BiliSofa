import { test, expect } from '@playwright/test';
// Packaged Worker and UI closure path, anonymous native shim only. No TV proof.
for (const cause of ['native_unconfirmed', 'runtime_aborted'] as const) test(`W01 cast closing retains ${cause} before poisoning owner`, async ({ page }) => {
  await page.addInitScript(() => {
    Object.assign(globalThis, { tizen: { systeminfo: { getPropertyValue(_name: string, done: (v: object) => void) { done({ ipAddress: '10.0.0.9', status: 'ON' }); } } } });
  });
  await page.route('**/native/manifest.json', r => r.fulfill({ body: '{}' }));
  await page.route('**/native/probe.js', r => r.fulfill({ contentType: 'application/javascript', body: `var M=self.Module;M._cast_rpc_enable=()=>{};M.callMain=()=>{M._cast_stop=()=>${cause === 'native_unconfirmed' ? "M.print('CAST:failed:17')" : "M.onAbort('private-fixture-detail-must-never-be-exported')"};M.print('CAST:ready');};M.onRuntimeInitialized();` }));
  await page.goto('/'); await page.locator('#cast').click();
  await expect(page.locator('#results')).toContainText('cast.ready'); await page.keyboard.press('Escape');
  await expect(page.locator('#results')).toContainText('cast.cleanup_cause_' + cause);
  await expect(page.locator('#results')).toContainText('cast.cleanup_unknown_restart_required');
  await expect(page.locator('#results')).not.toContainText('cast.native_closed_confirmed');
  await expect(page.locator('#results')).not.toContainText('private-fixture-detail');
  await page.locator('#cast').click();
  await expect(page.locator('#results')).toContainText('cast.worker_unknown');
  await page.keyboard.press('Escape'); await expect(page.locator('#cast')).toBeFocused();
});
