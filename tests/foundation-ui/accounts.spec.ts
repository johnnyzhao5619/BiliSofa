import { test, expect } from '@playwright/test';
interface Fixture {
  setVerification(value: 'normal' | 'hold' | 'mismatch'): void; setClose(value: 'normal' | 'hold' | 'failed'): void;
  completeChecks(): void; releaseClose(): void; checks(): { uid: string; aborted: boolean }[]; creates(): number;
  failAuth(): Promise<string>; state(): { kind: string }; select(id: string): Promise<void>; hide(): Promise<void>; show(): Promise<void>; removeA(): Promise<void>; dispose(): Promise<boolean>;
}
test.beforeEach(async ({ page }) => { await page.goto('/'); await expect(page.locator('[data-focus-id=settings]')).toBeFocused(); });
test('W02 account selection clears private page/modal return history and renders only verified identity', async ({ page }) => {
  await page.getByRole('button', { name: '切换合成账号A' }).click(); await expect(page.locator('#current-account')).toHaveText('合成身份 101');
  await page.locator('[data-focus-id=card-2]').click(); await page.locator('[data-focus-id=open-modal]').click(); await expect(page.getByRole('dialog')).toBeVisible();
  await page.evaluate(() => (globalThis as unknown as { accountFixture: Fixture }).accountFixture.select('bili_202'));
  await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('#current-account')).toHaveText('合成身份 202');
  await expect(page.locator('#pages h2')).toHaveText('首页 · 合成条目'); await page.keyboard.press('Escape'); await expect(page.locator('#root-back')).toHaveText('已到首页');
});
test('W02 late A identity never paints over B and no private page is visible while checking', async ({ page }) => {
  await page.evaluate(() => (globalThis as unknown as { accountFixture: Fixture }).accountFixture.setVerification('hold'));
  await page.getByRole('button', { name: '切换合成账号A' }).click(); await expect(page.locator('#pages')).toBeEmpty();
  await expect.poll(() => page.evaluate(() => (globalThis as unknown as { accountFixture: Fixture }).accountFixture.checks().length)).toBe(1);
  await page.evaluate(() => (globalThis as unknown as { accountFixture: Fixture }).accountFixture.setVerification('normal'));
  await page.evaluate(() => (globalThis as unknown as { accountFixture: Fixture }).accountFixture.select('bili_202')); await expect(page.locator('#current-account')).toHaveText('合成身份 202');
  expect(await page.evaluate(() => (globalThis as unknown as { accountFixture: Fixture }).accountFixture.checks()[0]?.aborted)).toBe(true);
  await page.evaluate(() => (globalThis as unknown as { accountFixture: Fixture }).accountFixture.completeChecks()); await expect(page.locator('#current-account')).toHaveText('合成身份 202');
});
test('W02 account runtime replacement waits for actual close acknowledgment', async ({ page }) => {
  await page.getByRole('button', { name: '切换合成账号A' }).click(); await expect(page.locator('#current-account')).toHaveText('合成身份 101');
  await page.evaluate(() => (globalThis as unknown as { accountFixture: Fixture }).accountFixture.setClose('hold'));
  await page.getByRole('button', { name: '切换合成账号B' }).click(); await expect(page.locator('#pages')).toBeEmpty();
  expect(await page.evaluate(() => (globalThis as unknown as { accountFixture: Fixture }).accountFixture.creates())).toBe(1);
  await page.evaluate(() => (globalThis as unknown as { accountFixture: Fixture }).accountFixture.releaseClose()); await expect(page.locator('#current-account')).toHaveText('合成身份 202');
});
test('W02 failed page cleanup prevents creating a credential runtime and shows restart feedback', async ({ page }) => {
  await page.evaluate(() => (globalThis as unknown as { foundation: { setCleanup(v: string): void } }).foundation.setCleanup('failed'));
  await page.getByRole('button', { name: '切换合成账号A' }).click(); await expect(page.locator('#pages [role=status]')).toHaveText('请重新打开应用');
  expect(await page.evaluate(() => (globalThis as unknown as { accountFixture: Fixture }).accountFixture.creates())).toBe(0);
});
test('W02 Home closes account runtime; foreground revalidates once before restoring page focus', async ({ page }) => {
  await page.getByRole('button', { name: '切换合成账号A' }).click(); await expect(page.locator('#current-account')).toHaveText('合成身份 101');
  await page.locator('[data-focus-id=card-2]').click(); await expect(page.locator('[data-focus-id=open-modal]')).toBeFocused();
  await page.evaluate(() => (globalThis as unknown as { accountFixture: Fixture }).accountFixture.hide()); await expect(page.locator('#pages')).toBeEmpty();
  await page.evaluate(() => (globalThis as unknown as { accountFixture: Fixture }).accountFixture.show()); await expect(page.locator('#current-account')).toHaveText('合成身份 101');
  await expect(page.locator('#pages h2')).toHaveText('合成详情'); await expect(page.locator('[data-focus-id=open-modal]')).toBeFocused();
  expect(await page.evaluate(() => (globalThis as unknown as { accountFixture: Fixture }).accountFixture.creates())).toBe(2);
});
test('W02 deleting selected account removes private authority and leaves usable guest navigation', async ({ page }) => {
  await page.getByRole('button', { name: '切换合成账号A' }).click(); await expect(page.locator('#current-account')).toHaveText('合成身份 101');
  await page.evaluate(() => (globalThis as unknown as { accountFixture: Fixture }).accountFixture.removeA()); await expect(page.locator('#current-account')).toHaveText('游客'); await expect(page.locator('[data-focus-id=settings]')).toBeFocused();
  await page.getByRole('button', { name: '切换合成账号A' }).click(); await expect(page.locator('#account-feedback')).toHaveText('身份未确认，请重试或重新登录'); await expect(page.locator('#current-account')).toHaveText('游客');
});

test('W02 server session expiration clears private authority and redraws a usable guest shell', async ({ page }) => {
  await page.getByRole('button', { name: '切换合成账号A' }).click(); await expect(page.locator('#current-account')).toHaveText('合成身份 101');
  await page.evaluate(() => (globalThis as unknown as { accountFixture: Fixture }).accountFixture.failAuth().catch(() => {}));
  await expect(page.locator('#current-account')).toHaveText('游客'); await expect(page.locator('[data-focus-id=settings]')).toBeFocused();
  expect(await page.evaluate(() => (globalThis as unknown as { accountFixture: Fixture }).accountFixture.state().kind)).toBe('error');
});
