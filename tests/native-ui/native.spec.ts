import { test, expect } from '@playwright/test';
test('W01 native Worker loads local JS/WASM/data under strict CSP; desktop does not fake Tizen sockets', async ({ page }) => {
  const successful = new Set<string>();
  const errors: string[] = [];
  page.on('response', response => { if (response.ok()) successful.add(new URL(response.url()).pathname); });
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await page.locator('#native').click();
  await expect(page.locator('#results')).toContainText('native.wasm_initialized_network_unverified', { timeout: 10000 });
  await page.keyboard.press('ArrowLeft'); await expect(page.locator('#wasm')).toBeFocused();
  await expect(page.locator('#results')).toContainText('W01-native · FAIL', { timeout: 25000 });
  expect(successful.has('/native/probe.js')).toBe(true);
  expect(successful.has('/native/probe.wasm')).toBe(true);
  expect(successful.has('/native/probe.data')).toBe(true);
  expect(errors.filter(error => /Content Security Policy|unsafe-eval|Refused to/.test(error))).toEqual([]);
  await page.locator('#wasm').click();
  await expect(page.locator('#results')).toContainText('W01-wasm · PASS');
});
test('W01 stop during native execution invalidates callbacks and allows a fresh Worker', async ({ page }) => {
  await page.goto('/'); await page.locator('#native').click();
  await expect(page.locator('#results')).toContainText('native.wasm_initialized_network_unverified', { timeout: 10000 });
  await page.locator('#stop').click();
  await expect(page.locator('#results')).toContainText('W01-worker · 待验收 · stopped');
  await page.locator('#wasm').click();
  await expect(page.locator('#results')).toContainText('W01-wasm · PASS');
});
