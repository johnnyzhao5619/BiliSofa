import { test, expect } from '@playwright/test';
interface Foundation {
  mounts: string[]; setCleanup(value: 'normal' | 'blocked' | 'failed'): void; release(): void; completeData(): void;
  navigate(route: { page: string; id?: string }): Promise<void>; back(): Promise<void>; accountChanged(): Promise<void>;
  suspend(): Promise<void>; resume(hold?: boolean): Promise<void>; finishResume(): void; resumeWaiting(): boolean; resumeAborted(): boolean; resumeFailure(): Promise<void>;
  dispose(): Promise<{ closed: boolean }>;
}
test.beforeEach(async ({ page }) => { await page.goto('/'); await expect(page.locator('[data-focus-id=settings]')).toBeFocused(); });
test('W02 remote Back closes one nested modal at a time then restores the originating content card', async ({ page }) => {
  await page.locator('[data-focus-id=card-2]').focus(); await page.keyboard.press('Enter'); await expect(page.locator('#pages h2')).toHaveText('合成详情');
  await page.keyboard.press('Enter'); await expect(page.locator('[data-focus-id=open-nested]')).toBeFocused(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-focus-id=nested-back]')).toBeFocused(); await page.keyboard.press('Escape'); await expect(page.locator('[data-focus-id=open-nested]')).toBeFocused();
  await page.keyboard.press('Escape'); await expect(page.locator('[data-focus-id=open-modal]')).toBeFocused();
  await page.keyboard.press('Escape'); await expect(page.locator('[data-focus-id=card-2]')).toBeFocused(); await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('W02 returning from a scrolled list preserves both the item ID and scroll position', async ({ page }) => {
  await page.locator('[data-focus-id=card-20]').focus(); const top = await page.locator('#pages').evaluate(e => e.scrollTop); expect(top).toBeGreaterThan(0);
  await page.keyboard.press('Enter'); await expect(page.locator('#pages h2')).toHaveText('合成详情'); await page.keyboard.press('Escape');
  await expect(page.locator('[data-focus-id=card-20]')).toBeFocused(); expect(await page.locator('#pages').evaluate(e => e.scrollTop)).toBe(top);
});
test('W02 new page waits for actual old-owner release and rapid navigation mounts only the latest view', async ({ page }) => {
  await page.evaluate(() => (globalThis as unknown as { foundation: Foundation }).foundation.setCleanup('blocked'));
  await page.locator('[data-focus-id=settings]').click(); await expect(page.locator('#pages [role=status]')).toHaveText('正在打开…');
  await page.evaluate(() => { void (globalThis as unknown as { foundation: Foundation }).foundation.navigate({ page: 'video', id: 'BV0000000001' }); });
  expect(await page.evaluate(() => (globalThis as unknown as { foundation: Foundation }).foundation.mounts)).toEqual(['home']);
  await page.evaluate(() => { const f = (globalThis as unknown as { foundation: Foundation }).foundation; f.setCleanup('normal'); f.release(); });
  await expect(page.locator('#pages h2')).toHaveText('合成详情'); expect(await page.evaluate(() => (globalThis as unknown as { foundation: Foundation }).foundation.mounts)).toEqual(['home', 'video']);
});
test('W02 late old data cannot write into a new route and external text remains inert', async ({ page }) => {
  await page.locator('[data-focus-id=settings]').click(); await expect(page.locator('#pages h2')).toHaveText('设置页');
  await page.evaluate(() => (globalThis as unknown as { foundation: Foundation }).foundation.navigate({ page: 'video', id: 'BV0000000001' }));
  await page.evaluate(() => (globalThis as unknown as { foundation: Foundation }).foundation.completeData());
  await expect(page.locator('#pages h2')).toHaveText('合成详情'); await expect(page.locator('#page-data')).toHaveText('合成内容 <script>仅作为文字</script>'); expect(await page.locator('#pages script').count()).toBe(0);
});
test('W02 unconfirmed cleanup blocks new view creation instead of pretending reuse is safe', async ({ page }) => {
  await page.evaluate(() => (globalThis as unknown as { foundation: Foundation }).foundation.setCleanup('failed')); await page.locator('[data-focus-id=settings]').click();
  await expect(page.locator('#pages [role=status]')).toHaveText('请重新打开应用');
  const code = await page.evaluate(() => (globalThis as unknown as { foundation: Foundation }).foundation.navigate({ page: 'home' }).then(() => 'unexpected', e => e.code));
  expect(code).toBe('unknown'); expect(await page.evaluate(() => (globalThis as unknown as { foundation: Foundation }).foundation.mounts)).toEqual(['home']);
});
test('W02 Home during foreground revalidation cancels resurrection and a later resume redraws only after validation', async ({ page }) => {
  await page.locator('[data-focus-id=settings]').click(); await expect(page.locator('#pages h2')).toHaveText('设置页');
  await page.evaluate(() => (globalThis as unknown as { foundation: Foundation }).foundation.suspend());
  await page.evaluate(() => { void (globalThis as unknown as { foundation: Foundation }).foundation.resume(true); });
  await expect.poll(() => page.evaluate(() => (globalThis as unknown as { foundation: Foundation }).foundation.resumeWaiting())).toBe(true);
  await page.evaluate(() => (globalThis as unknown as { foundation: Foundation }).foundation.suspend()); expect(await page.evaluate(() => (globalThis as unknown as { foundation: Foundation }).foundation.resumeAborted())).toBe(true); await page.evaluate(() => (globalThis as unknown as { foundation: Foundation }).foundation.finishResume());
  await expect(page.locator('#pages')).toBeEmpty();
  await page.evaluate(() => (globalThis as unknown as { foundation: Foundation }).foundation.resume()); await expect(page.locator('#pages h2')).toHaveText('设置页'); await expect(page.locator('[data-focus-id=open-modal]')).toBeFocused();
});
test('W02 account change discards private page and modal return history before rendering home', async ({ page }) => {
  await page.locator('[data-focus-id=card-1]').click(); await expect(page.locator('#pages h2')).toHaveText('合成详情'); await page.locator('[data-focus-id=open-modal]').click();
  await page.evaluate(() => (globalThis as unknown as { foundation: Foundation }).foundation.accountChanged());
  await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('[data-focus-id=settings]')).toBeFocused();
  await page.keyboard.press('Escape'); await expect(page.locator('#root-back')).toHaveText('已到首页'); await expect(page.locator('#pages h2')).toHaveText('首页 · 合成条目');
});
test('W02 two Back calls during one modal close do not also pop the underlying page', async ({ page }) => {
  await page.locator('[data-focus-id=card-1]').click(); await expect(page.locator('#pages h2')).toHaveText('合成详情'); await page.locator('[data-focus-id=open-modal]').click();
  await page.evaluate(() => { const f = (globalThis as unknown as { foundation: Foundation }).foundation; return Promise.all([f.back(), f.back()]); });
  await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('#pages h2')).toHaveText('合成详情'); await expect(page.locator('[data-focus-id=open-modal]')).toBeFocused();
});
test('W02 dispose drains resources and removes input ownership without duplicate teardown', async ({ page }) => {
  const result = await page.evaluate(() => { const f = (globalThis as unknown as { foundation: Foundation }).foundation; return Promise.all([f.dispose(), f.dispose()]); });
  expect(result.every(r => r.closed)).toBe(true); await page.keyboard.press('Escape'); await expect(page.locator('#pages')).toBeEmpty(); await expect(page.locator('#root-back')).toBeEmpty();
});

test('W02 rejected foreground validation shows a usable restart state and does not rebuild private content', async ({ page }) => {
  await page.locator('[data-focus-id=settings]').click(); await expect(page.locator('#pages h2')).toHaveText('设置页');
  await page.evaluate(() => (globalThis as unknown as { foundation: Foundation }).foundation.suspend());
  await page.evaluate(() => (globalThis as unknown as { foundation: Foundation }).foundation.resumeFailure());
  await expect(page.locator('#pages [role=status]')).toHaveText('请重新打开应用');
  expect(await page.evaluate(() => (globalThis as unknown as { foundation: Foundation }).foundation.mounts)).toEqual(['home', 'settings']);
  await page.keyboard.press('Escape'); await expect(page.locator('#root-back')).toHaveText('已到首页');
});
test('W02 a hidden cleanup failure is shown on return and cannot silently resume an empty application', async ({ page }) => {
  await page.evaluate(() => (globalThis as unknown as { foundation: Foundation }).foundation.setCleanup('failed'));
  await page.evaluate(() => (globalThis as unknown as { foundation: Foundation }).foundation.suspend());
  await page.evaluate(() => (globalThis as unknown as { foundation: Foundation }).foundation.resume());
  await expect(page.locator('#pages [role=status]')).toHaveText('请重新打开应用');
  expect(await page.evaluate(() => (globalThis as unknown as { foundation: Foundation }).foundation.mounts)).toEqual(['home']);
});
