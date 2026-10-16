import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
test('W01 page identity, local scripts, console health and meaningful initial screen', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/'); await expect(page).toHaveTitle('BiliSofa · W01 探针');
  await expect(page.getByRole('heading', { name: '零售电视能力探针' })).toBeVisible();
  await expect(page.locator('#inspect')).toBeFocused(); await page.locator('#wasm').click();
  await expect(page.locator('#results')).toContainText('PASS');
  expect(errors).toEqual([]);
  const evidenceDir = process.env.BILISOFA_EVIDENCE_DIR ?? '/tmp/bilisofa-evidence';
  await mkdir(evidenceDir, { recursive: true });
  await page.screenshot({ path: join(evidenceDir, 'probe-desktop.png') });
});
test('W01/W02 DOM focus, directional reachability, modal isolation and Back restores invoker', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('#inspect')).toBeFocused();
  await page.keyboard.press('ArrowRight'); await expect(page.locator('#wasm')).toBeFocused();
  await page.keyboard.press('Escape'); await expect(page.locator('#cancel-exit')).toBeFocused();
  await expect(page.locator('main')).toHaveAttribute('inert', '');
  await page.keyboard.press('ArrowRight'); await expect(page.locator('#confirm-exit')).toBeFocused();
  await page.keyboard.press('Escape'); await expect(page.locator('#wasm')).toBeFocused();
  await expect(page.locator('#exit-dialog')).toBeHidden();
});
test('W01 Worker actually instantiates original WASM; missing native code is blocked', async ({ page }) => {
  await page.goto('/'); await page.locator('#wasm').click();
  await expect(page.locator('#results')).toContainText('W01-wasm · PASS · wasm.worker_arithmetic_only');
  await page.locator('#native').click();
  await expect(page.locator('#results')).toContainText('W01-native · BLOCKED');
});
test('W01 nonsecret persistence survives reload; export excludes IME input', async ({ page }) => {
  await page.goto('/'); await page.locator('#persist').click(); await page.reload();
  await expect(page.locator('#results')).toContainText('marker_1');
  await page.locator('#ime').click(); await expect(page.locator('#chinese')).toBeFocused();
  await page.locator('#chinese').fill('私密输入不保存'); await page.keyboard.press('Escape');
  await expect(page.locator('#ime')).toBeFocused(); await expect(page.locator('#exit-dialog')).toBeHidden();
  await page.locator('#export').click();
  await expect(page.locator('#export-output')).not.toHaveValue(/私密输入/);
  await page.keyboard.press('Escape'); await expect(page.locator('#export')).toBeFocused();
  await page.keyboard.press('Escape'); await expect(page.locator('#cancel-exit')).toBeFocused();
  await page.keyboard.press('Escape'); await expect(page.locator('#export')).toBeFocused();
  const evidenceDir = process.env.BILISOFA_EVIDENCE_DIR ?? '/tmp/bilisofa-evidence';
  await mkdir(evidenceDir, { recursive: true });
  await page.screenshot({ path: join(evidenceDir, 'probe-export.png'), fullPage: true });
});
test('W02 Chinese composition candidate Enter cannot activate current control', async ({ page }) => {
  await page.goto('/');
  await page.locator('#wasm').dispatchEvent('compositionstart');
  await page.keyboard.press('Enter'); await expect(page.locator('#results')).not.toContainText('W01-wasm');
  await page.locator('#wasm').dispatchEvent('compositionend');
  await page.keyboard.press('Enter'); await expect(page.locator('#results')).not.toContainText('W01-wasm');
});

test('W01 LAN action blocks safely without platform address; cancelled address read cannot replace new Worker', async ({ page }) => {
  await page.goto('/'); await page.locator('#http').click();
  await expect(page.locator('#results')).toContainText('W01-http · BLOCKED · http.address_unavailable');
  await page.locator('#wasm').click(); await expect(page.locator('#results')).toContainText('W01-wasm · PASS');
  await page.evaluate(() => {
    Object.assign(globalThis, { tizen: { systeminfo: { getPropertyValue: (_name: string, callback: (value: unknown) => void) => setTimeout(() => callback({ status: 'CONNECTED', ipAddress: '192.0.2.1' }), 500) } } });
  });
  await page.locator('#http').click(); await page.locator('#wasm').click();
  await expect(page.locator('#status')).toContainText('W01-wasm：PASS');
  await page.waitForTimeout(700);
  await expect(page.locator('#status')).toContainText('W01-wasm：PASS');
  await expect(page.locator('#lan-status')).toBeEmpty();
  await page.locator('#export').click(); await expect(page.locator('#export-output')).not.toHaveValue(/192\.0\.2\.1/);
});

test('W01 explicit internal automation runs real WASM; stopping invalidates the remaining sequence', async ({ page }) => {
  await page.route('http://127.0.0.1:4173/', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('name="probe-auto" content="0"', 'name="probe-auto" content="1"') });
  });
  await page.goto('/');
  await expect(page.locator('#results')).toContainText('W01-wasm · PASS');
  await expect(page.locator('#results')).toContainText('W01-native · BLOCKED');
  await expect(page.locator('#results')).toContainText('W01-http · BLOCKED');
  await page.route('**/probe.wasm', async route => {
    await new Promise(resolve => setTimeout(resolve, 300)); await route.continue();
  });
  await page.reload(); await page.locator('#stop').click();
  await page.waitForTimeout(600);
  await expect(page.locator('#results')).toContainText('stopped');
  await expect(page.locator('#results')).not.toContainText('W01-native');
});

test('W01 media action reports missing platform, keeps focus owner and supports next action', async ({ page }) => {
  await page.goto('/'); await page.locator('#media').click();
  await expect(page.locator('#results')).toContainText('W01-media · BLOCKED · avplay.platform_unavailable');
  await expect(page.locator('#media-dialog')).toBeHidden();
  await expect(page.locator('#media')).toBeFocused();
  await page.locator('#wasm').click(); await expect(page.locator('#results')).toContainText('W01-wasm · PASS');
});

test('W01 synthetic AVPlay/Worker fixture proves modal ownership, pause, seek and Back cleanup', async ({ page }) => {
  await page.addInitScript(() => {
    let state = 'NONE', time = 0;
    let timer: ReturnType<typeof setInterval> | undefined;
    let listener: { oncurrentplaytime?: (value: number) => void } = {};
    const api = {
      getState: () => state, open: () => { state = 'IDLE'; }, setListener: (value: typeof listener) => { listener = value; }, setDisplayRect: () => {},
      prepareAsync: (success: () => void) => setTimeout(() => { if (state === 'IDLE') { state = 'READY'; success(); } }, 100),
      play: () => { state = 'PLAYING'; timer ??= setInterval(() => { if (state === 'PLAYING') { time += 200; listener.oncurrentplaytime?.(time); } }, 200); },
      pause: () => { state = 'PAUSED'; }, seekTo: (value: number, success: () => void) => { time = value; listener.oncurrentplaytime?.(time); success(); },
      stop: () => { state = 'IDLE'; }, close: () => { state = 'NONE'; if (timer) clearInterval(timer); timer = undefined; },
    };
    class FixtureWorker {
      onmessage?: (event: { data: unknown }) => void;
      onerror?: () => void;
      stopped = false;
      postMessage(request: { version: number; scope: unknown; operation: string; control?: string }) { setTimeout(() => { if (!this.stopped) this.onmessage?.({ data: { version: request.version, scope: request.scope, operation: request.operation, verdict: 'UNVERIFIED', code: request.control === 'stop' ? 'mpd.stopped' : 'mpd.listener_ready', phase: request.control === 'stop' ? 'final' : 'progress' } }); }, 10); }
      terminate() { this.stopped = true; }
    }
    Object.assign(globalThis, { tizen: { tvaudiocontrol: { isMute: () => false, getVolume: () => 16 } }, Worker: FixtureWorker, webapis: { avplay: api, appcommon: { AppCommonScreenSaverState: { SCREEN_SAVER_ON: 1, SCREEN_SAVER_OFF: 0 }, setScreenSaver: () => {} } } });
  });
  await page.goto('/'); await page.locator('#media').click();
  await expect(page.locator('#media-toggle')).toBeFocused(); await expect(page.locator('main')).toHaveAttribute('inert', '');
  await expect(page.locator('#media-status')).toContainText('playing');
  await expect(page.locator('#results')).toContainText('W01-media-output · 读数 · avplay.tv_mute_false_volume_16');
  await page.locator('#media-toggle').click(); await expect(page.locator('#media-status')).toContainText('paused');
  await page.locator('#media-seek').click(); await expect(page.locator('#media-status')).toContainText('5.0 秒');
  await page.keyboard.press('Escape'); await expect(page.locator('#media-dialog')).toBeHidden();
  await expect(page.locator('#media')).toBeFocused(); await expect(page.locator('main')).not.toHaveAttribute('inert', '');
  await page.waitForTimeout(400); await expect(page.locator('#media-dialog')).toBeHidden();
});

test('W01 synthetic KeyManager fixture isolates API evidence, redacts data, and discards a cancelled result', async ({ page }) => {
  await page.addInitScript(() => {
    const values = new Map<string, string>();
    const api = {
      saveData(name: string, value: string, _password: null, saved: () => void) { values.set(name, value); setTimeout(saved, 150); },
      getData({ name }: { name: string }) { if (!values.has(name)) throw Object.assign(new Error(), { name: 'NotFoundError' }); return values.get(name); },
      removeData({ name }: { name: string }) { values.delete(name); },
      fixtureSize: () => values.size,
    };
    Object.assign(globalThis, { tizen: { keymanager: api } });
  });
  await page.goto('/'); await page.locator('#secure').click();
  await expect(page.locator('#results')).toContainText('W01-keymanager · PASS · keymanager.synthetic_roundtrip_cleanup_only');
  await expect(page.locator('#results')).toContainText('W01-private-storage · 待验收');
  await page.locator('#export').click();
  await expect(page.locator('#export-output')).not.toHaveValue(/bilisofa\.w01\.synthetic\.|synthetic-nonsecret-/);
  await page.reload(); await page.locator('#secure').click(); await page.locator('#wasm').click();
  await expect(page.locator('#status')).toContainText('W01-wasm：PASS');
  await page.waitForTimeout(250);
  await expect(page.locator('#results')).not.toContainText('W01-keymanager · PASS');
  expect(await page.evaluate(() => (globalThis as unknown as { tizen: { keymanager: { fixtureSize(): number } } }).tizen.keymanager.fixtureSize())).toBe(0);
});

test('F03 real packaged word data supports initials, candidate selection, Back/focus and redacted export', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/'); await page.locator('#search').click();
  await expect(page.locator('[data-focus-id="search-key-a"]')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-focus-id="search-key-n"]')).toBeFocused(); await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowUp');
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-focus-id="search-key-h"]')).toBeFocused(); await page.keyboard.press('Enter');
  await page.locator('#search-candidates button', { hasText: /^你好$/ }).click();
  await expect(page.locator('#search-preview')).toHaveText('你好');
  await expect(page.locator('#search-dialog')).toBeVisible(); // Selecting a candidate does not execute a search.
  const evidenceDir = process.env.BILISOFA_EVIDENCE_DIR ?? '/tmp/bilisofa-evidence'; await mkdir(evidenceDir, { recursive: true });
  await page.screenshot({ path: join(evidenceDir, 'search-candidate-selected.png') });
  await page.locator('#search-done').click(); await expect(page.locator('#search')).toBeFocused();
  await expect(page.locator('#chinese')).toHaveValue('你好'); await page.locator('#export').click();
  await expect(page.locator('#export-output')).not.toHaveValue(/你好/);
  await page.locator('#search').click(); await page.keyboard.type('zg');
  await expect(page.locator('#search-candidates')).toContainText('中国');
  await page.keyboard.press('Escape'); await expect(page.locator('#search-dialog')).toBeVisible();
  await expect(page.locator('#search-buffer')).toContainText('输入词语首字母');
  await page.keyboard.press('Escape'); await expect(page.locator('#search-dialog')).toBeHidden(); await expect(page.locator('#search')).toBeFocused();
  await page.locator('#search').click(); await page.keyboard.type('sj');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.locator('#search-dialog')).toBeHidden();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.locator('#inspect')).toBeFocused();
  expect(errors).toEqual([]);
});

test('F03 unavailable local candidates recover without trapping focus; native IME keeps its edit keys', async ({ page }) => {
  await page.route('**/search-words.json', route => route.fulfill({ status: 404, body: '' }));
  await page.goto('/'); await page.locator('#search').click(); await page.keyboard.type('nh');
  await expect(page.locator('#search-state')).toContainText('加载失败');
  await page.unroute('**/search-words.json'); await page.locator('#search-retry').click();
  await expect(page.locator('#search-candidates')).toContainText('你好');
  await page.locator('#search-cancel').click(); await page.locator('#ime').click();
  expect(await page.locator('#chinese').evaluate(el => { const event = new KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, isComposing: true, bubbles: true, cancelable: true }); el.dispatchEvent(event); return event.defaultPrevented; })).toBe(false);
  await page.locator('#chinese').evaluate(el => el.dispatchEvent(new KeyboardEvent('keydown', { keyCode: 65376, bubbles: true })));
  await expect(page.locator('#ime')).toBeFocused(); await expect(page.locator('#exit-dialog')).toBeHidden();
});

test('F03 directional-only navigation reaches both first-column candidates and every 2x4 slot', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowRight');
  await expect(page.locator('#search')).toBeFocused(); await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-focus-id="search-key-n"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#search-candidates button:enabled')).toHaveCount(8);
  // N -> D -> toolbar -> first candidate, using only the centralized direction keys.
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowUp');
  const slot = (i: number) => page.locator(`[data-focus-id="search-candidate-${i}"]`);
  await expect(slot(0)).toBeFocused();
  const evidenceDir = process.env.BILISOFA_EVIDENCE_DIR ?? '/tmp/bilisofa-evidence'; await mkdir(evidenceDir, { recursive: true });
  await page.screenshot({ path: join(evidenceDir, 'candidate-first-column-top.png') });
  await page.keyboard.press('ArrowRight'); await expect(slot(1)).toBeFocused();
  await page.keyboard.press('ArrowDown'); await expect(slot(5)).toBeFocused();
  await page.keyboard.press('ArrowLeft'); await expect(slot(4)).toBeFocused();
  await page.screenshot({ path: join(evidenceDir, 'candidate-first-column-bottom.png') });
  await page.keyboard.press('ArrowLeft'); await expect(slot(4)).toBeFocused();
  await slot(4).dispatchEvent('keydown', { key: 'Right', keyCode: 39, bubbles: true, cancelable: true }); await expect(slot(5)).toBeFocused();
  await slot(5).dispatchEvent('keydown', { key: 'Unidentified', keyCode: 37, bubbles: true, cancelable: true }); await expect(slot(4)).toBeFocused();
  await page.keyboard.press('ArrowUp'); await expect(slot(0)).toBeFocused();
  await page.keyboard.press('ArrowLeft'); await expect(slot(0)).toBeFocused();
  for (let i = 1; i < 4; i++) { await page.keyboard.press('ArrowRight'); await expect(slot(i)).toBeFocused(); }
  await page.keyboard.press('ArrowRight'); await expect(slot(3)).toBeFocused();
  await page.keyboard.press('ArrowDown'); await expect(slot(7)).toBeFocused();
  for (let i = 6; i >= 4; i--) { await page.keyboard.press('ArrowLeft'); await expect(slot(i)).toBeFocused(); }
  const firstPageWord = await slot(0).textContent();
  await page.keyboard.press('ArrowDown'); await expect(page.locator('#search-literal')).toBeFocused();
  await page.keyboard.press('ArrowLeft'); await expect(page.locator('#search-next')).toBeFocused();
  await page.keyboard.press('Enter'); await expect(slot(0)).toBeFocused();
  await expect(page.locator('#search-state')).toContainText('第2/'); expect(await slot(0).textContent()).not.toBe(firstPageWord);
  await page.keyboard.press('ArrowLeft'); await expect(slot(0)).toBeFocused();
  await page.keyboard.press('ArrowDown'); await expect(slot(4)).toBeFocused();
  await page.keyboard.press('ArrowLeft'); await expect(slot(4)).toBeFocused();
  const selected = await slot(4).textContent(); await page.keyboard.press('Enter');
  await expect(page.locator('#search-preview')).toHaveText(selected!);
  await expect(page.locator('[data-focus-id="search-key-a"]')).toBeFocused();
  await page.keyboard.press('Escape'); await expect(page.locator('#search')).toBeFocused();
});

test('F03 partial candidate row and disabled pagers keep deterministic direction paths after refresh', async ({ page }) => {
  // Anonymous UI fixture: five real word/key shapes, unrelated to product content results.
  await page.route('**/search-words.json', route => route.fulfill({ json: [['你好', 'nh'], ['你们', 'nm'], ['你在', 'nz'], ['你的', 'nd'], ['你家', 'nj']] }));
  await page.goto('/'); await page.locator('#search').click(); await page.keyboard.type('n');
  await expect(page.locator('#search-candidates button:enabled')).toHaveCount(5);
  await expect(page.locator('#search-prev')).toBeDisabled(); await expect(page.locator('#search-next')).toBeDisabled();
  await page.keyboard.press('ArrowUp'); await expect(page.locator('#search-literal')).toBeFocused();
  await page.keyboard.press('ArrowLeft'); await expect(page.locator('#search-literal')).toBeFocused();
  await page.keyboard.press('ArrowUp'); await expect(page.locator('[data-focus-id=search-candidate-0]')).toBeFocused();
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-focus-id=search-candidate-3]')).toBeFocused();
  await page.keyboard.press('ArrowDown'); await expect(page.locator('[data-focus-id=search-candidate-4]')).toBeFocused();
  await page.keyboard.press('ArrowLeft'); await expect(page.locator('[data-focus-id=search-candidate-4]')).toBeFocused();
  await page.keyboard.press('ArrowUp'); await expect(page.locator('[data-focus-id=search-candidate-0]')).toBeFocused();
  await page.keyboard.press('Backspace'); await expect(page.locator('[data-focus-id=search-key-a]')).toBeFocused();
  await expect(page.locator('#search-candidates button:enabled')).toHaveCount(0);
  await page.keyboard.press('ArrowUp'); await expect(page.locator('#search-literal')).toBeFocused();
  await page.keyboard.press('ArrowUp'); await expect(page.locator('[data-focus-id=search-key-a]')).toBeFocused();
  await page.keyboard.press('Escape'); await expect(page.locator('#search')).toBeFocused();
});

test('W01 synthetic persistence fixture survives document reload, clears only owned data and redacts its expectation', async ({ page }) => {
  // Anonymous synthetic fixture, not device secure-storage evidence.
  await page.addInitScript(() => {
    const key = 'fixture.synthetic.keymanager';
    const api = {
      saveData(_name: string, value: string, _password: null, saved: () => void) { sessionStorage.setItem(key, value); setTimeout(saved, 20); },
      getData() { const value = sessionStorage.getItem(key); if (value === null) throw Object.assign(new Error(), { name: 'NotFoundError' }); return value; },
      removeData() { sessionStorage.removeItem(key); },
    };
    Object.assign(globalThis, { tizen: { keymanager: api } });
  });
  await page.goto('/'); await page.locator('#secure-persist').click();
  await expect(page.locator('#status')).toContainText('keymanager.persistence_prepared_exit_reopen_required');
  await page.locator('#secure-persist').click(); await expect(page.locator('#status')).toContainText('keymanager.persistence_restart_required');
  await page.locator('#export').click(); await expect(page.locator('#export-output')).not.toHaveValue(/synthetic-persistence-nonsecret|bilisofa\.w01\.persistence|"nonce"|"boot"/);
  await page.reload(); await page.locator('#secure-persist').click();
  await expect(page.locator('#status')).toContainText('W01-secure-persistence：PASS');
  expect(await page.evaluate(() => sessionStorage.getItem('fixture.synthetic.keymanager'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('bilisofa.probe.keymanager-persistence.v1'))).toBeNull();
  await expect(page.locator('#secure-persist')).toBeFocused();
});

test('W01 persistence autorun exits only after a served report; manual operation cancels the automatic remainder', async ({ page }) => {
  await page.route('http://127.0.0.1:4173/', async route => {
    const response = await route.fetch(); await route.fulfill({ response, body: (await response.text()).replace('name="probe-auto" content="0"', 'name="probe-auto" content="2"') });
  });
  await page.addInitScript(() => {
    const values = new Map<string, string>(); let exits = 0;
    const api = {
      saveData(name: string, value: string, _password: null, saved: () => void) { values.set(name, value); setTimeout(saved, 100); },
      getData({ name }: { name: string }) { if (!values.has(name)) throw Object.assign(new Error(), { name: 'NotFoundError' }); return values.get(name); },
      removeData({ name }: { name: string }) { values.delete(name); },
    };
    class ReportWorker {
      onmessage?: (event: { data: unknown }) => void; stopped = false;
      postMessage(request: { version: number; scope: unknown; operation: string; control?: string }) {
        setTimeout(() => { if (!this.stopped) this.onmessage?.({ data: { version: request.version, scope: request.scope, operation: request.operation, verdict: request.control ? 'UNVERIFIED' : 'PASS', code: request.control ? 'http.stopped' : 'http.report_served_client_identity_unverified', phase: 'final' } }); }, 10);
      }
      terminate() { this.stopped = true; }
    }
    Object.assign(globalThis, { Worker: ReportWorker, tizen: { keymanager: api, systeminfo: { getPropertyValue: (_name: string, saved: (v: unknown) => void) => saved({ status: 'CONNECTED', ipAddress: '192.0.2.1' }) }, application: { getCurrentApplication: () => ({ appInfo: { id: 'BiliProbe1.Probe' }, exit: () => { exits++; } }) } }, fixtureExits: () => exits });
  });
  await page.goto('/'); await expect(page.locator('#results')).toContainText('W01-http · PASS');
  await expect.poll(() => page.evaluate(() => (globalThis as unknown as { fixtureExits(): number }).fixtureExits())).toBe(1);
  await page.evaluate(() => localStorage.removeItem('bilisofa.probe.keymanager-persistence.v1'));
  await page.reload(); await page.locator('#stop').click(); await page.waitForTimeout(250);
  await expect(page.locator('#results')).not.toContainText('W01-http');
  expect(await page.evaluate(() => (globalThis as unknown as { fixtureExits(): number }).fixtureExits())).toBe(0);
});

test('F02 guest popular UI uses safe real-shaped text, directional cards, paging, empty recovery and Back', async ({ page }) => {
  await page.addInitScript(() => {
    class PopularFixture {
      onmessage?: (event: { data: unknown }) => void; stopped = false;
      postMessage(request: { version: number; scope: unknown; operation: string; page?: number; control?: string }) {
        setTimeout(() => { if (!this.stopped) this.onmessage?.({ data: { version: 1, scope: request.scope, operation: 'guest-popular', closed: true, kind: request.control ? 'cancelled' : 'ok', status: request.control ? 0 : 200, ...(request.control ? {} : { apiCode: 0 }), code: request.control ? 'guest.cancelled' : 'guest.popular_ok', noMore: !!request.control || request.page === 2, items: request.control || request.page === 2 ? [] : [0, 1, 2, 3].map(i => ({ bvid: `BV000000000${i}`, title: i === 0 ? '<img onerror=alert(1)>合成安全文本' : `合成热门 ${i}`, owner: '匿名fixture', durationSec: 123, views: 1000 + i })) } }); }, 30);
      }
      terminate() { this.stopped = true; }
    }
    Object.assign(globalThis, { Worker: PopularFixture });
  });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await page.locator('#popular').click();
  await expect(page.locator('#popular-state')).toContainText('第 1 页 · 4 条 · HTTP 200');
  await expect(page.locator('#popular-cards button:visible')).toHaveCount(4); expect(await page.locator('#popular-dialog img').count()).toBe(0);
  await expect(page.locator('#popular-close')).toBeFocused(); await page.keyboard.press('ArrowDown');
  await expect(page.locator('[data-focus-id=popular-card-0]')).toBeFocused(); await page.keyboard.press('Enter');
  await expect(page.locator('#popular-detail')).toContainText('BV0000000000'); await expect(page.locator('#popular-detail')).toContainText('<img onerror=alert(1)>');
  await page.keyboard.press('ArrowDown'); await expect(page.locator('[data-focus-id=popular-card-2]')).toBeFocused();
  await page.keyboard.press('ArrowRight'); await expect(page.locator('[data-focus-id=popular-card-3]')).toBeFocused();
  await page.keyboard.press('ArrowLeft'); await expect(page.locator('[data-focus-id=popular-card-2]')).toBeFocused();
  await page.screenshot({ path: '/tmp/bilisofa-popular-desktop.png' });
  await page.locator('#popular-next').click(); await expect(page.locator('#popular-state')).toContainText('第 2 页 · 0 条');
  await expect(page.locator('#popular-detail')).toContainText('没有内容'); await expect(page.locator('#popular-next')).toBeDisabled();
  await page.locator('#popular-prev').click(); await expect(page.locator('#popular-cards button:visible')).toHaveCount(4);
  await page.keyboard.press('Escape'); await expect(page.locator('#popular')).toBeFocused(); await expect(page.locator('main')).not.toHaveAttribute('inert', '');
  await page.locator('#export').click(); await expect(page.locator('#export-output')).not.toHaveValue(/合成热门|BV0000000000|onerror|匿名fixture/);
  expect(errors).toEqual([]);
});

test('F02 guest popular HTTP rejection recovers by user action; Home rejects late data without reopening', async ({ page }) => {
  await page.addInitScript(() => {
    let calls = 0;
    class PopularFixture {
      onmessage?: (event: { data: unknown }) => void; stopped = false;
      postMessage(request: { scope: unknown; control?: string }) {
        const failed = ++calls === 1;
        setTimeout(() => { if (!this.stopped) this.onmessage?.({ data: { version: 1, scope: request.scope, operation: 'guest-popular', closed: true, kind: request.control ? 'cancelled' : failed ? 'http_error' : 'ok', status: request.control ? 0 : failed ? 412 : 200, ...(!request.control && !failed ? { apiCode: 0 } : {}), code: request.control ? 'guest.cancelled' : failed ? 'guest.http_412' : 'guest.popular_ok', items: [], noMore: true } }); }, request.control ? 10 : 150);
      }
      terminate() { this.stopped = true; }
    }
    Object.assign(globalThis, { Worker: PopularFixture });
  });
  await page.goto('/'); await page.locator('#popular').click(); await expect(page.locator('#popular-state')).toContainText('guest.http_412');
  await page.locator('#popular-reload').click(); await expect(page.locator('#popular-state')).toContainText('0 条');
  await page.locator('#popular-reload').click();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.locator('#popular-dialog')).toBeHidden(); await page.waitForTimeout(250); await expect(page.locator('#popular-dialog')).toBeHidden();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.locator('#inspect')).toBeFocused();
});

test('W01 basic build guest action reports missing native bundle and permits Back without leaking a pending request', async ({ page }) => {
  await page.goto('/'); await page.locator('#popular').click(); await expect(page.locator('#popular-state')).toContainText('guest.native_unavailable');
  await page.keyboard.press('Escape'); await expect(page.locator('#popular')).toBeFocused();
});

test('W01 guest popular autorun is cancelled by Back before the HTTP report stage', async ({ page }) => {
  await page.route('http://127.0.0.1:4173/', async route => { const response = await route.fetch(); await route.fulfill({ response, body: (await response.text()).replace('name="probe-auto" content="0"', 'name="probe-auto" content="4"') }); });
  await page.addInitScript(() => {
    class PopularFixture {
      onmessage?: (event: { data: unknown }) => void; stopped = false;
      postMessage(request: { scope: unknown; control?: string }) { setTimeout(() => { if (!this.stopped) this.onmessage?.({ data: { version: 1, scope: request.scope, operation: 'guest-popular', closed: true, kind: request.control ? 'cancelled' : 'ok', status: request.control ? 0 : 200, ...(request.control ? {} : { apiCode: 0 }), code: request.control ? 'guest.cancelled' : 'guest.popular_ok', items: [], noMore: true } }); }, request.control ? 10 : 300); }
      terminate() { this.stopped = true; }
    }
    Object.assign(globalThis, { Worker: PopularFixture });
  });
  await page.goto('/'); await expect(page.locator('#popular-dialog')).toBeVisible();
  await page.keyboard.press('Escape'); await page.waitForTimeout(450);
  await expect(page.locator('#popular-dialog')).toBeHidden(); await expect(page.locator('#results')).not.toContainText('W01-http');
});

const guestNativeShim = `
    var M = self.Module, bv='BV0000000001', status=200, ranged=0;
    var cdn='https://fixture.bilivideo.com/synthetic.m4s?deadline='+Math.floor(Date.now()/1000+3600)+'&sign=synthetic';
    var t=(video)=>({id:video?16:30216,baseUrl:cdn,mimeType:video?'video/mp4':'audio/mp4',codecs:video?'avc1.64001E':'mp4a.40.2',bandwidth:video?500000:66000,width:640,height:360,SegmentBase:{Initialization:'0-914',indexRange:'915-6546'}});
    M._guest_response_ptr=()=>0;M._guest_response_length=()=>M.HEAPU8.length;M._guest_http_status=()=>status;M._guest_curl_status=()=>0;M._guest_range_valid=()=>ranged;
    M.callMain=(args)=>{
      status=200;ranged=0;var data;
      if(args[0]==='bridge'){M._bridge_stop=()=>M.print('BRIDGE:stopped');M.print('BRIDGE:ready');setTimeout(()=>M.print('BRIDGE:served:1'),5);return;}
      if(args[0]==='guest-popular') data={list:[{bvid:bv,title:'合成热门',owner:{name:'合成UP'},duration:12,stat:{view:100}}],no_more:true};
      else if(args[0]==='guest-view') data={bvid:bv,cid:123,title:'合成详情',owner:{name:'合成UP'},state:0,rights:{pay:0,ugc_pay:0,is_stein_gate:0},pages:[{cid:123,page:1,from:'vupload',duration:12}]};
      else if(args[0]==='guest-playurl' && args[2]==='123') data={quality:16,timelength:12000,dash:{duration:12,video:[t(true)],audio:[t(false)]}};
      else if(args[0]==='guest-range' && args[2]===cdn){status=206;ranged=1;}
      else throw Error('unexpected stage');
      if(args[0]==='guest-playurl' && typeof backupMode!=='undefined')for(var track of [...data.dash.video,...data.dash.audio]){track.baseUrl='https://unrecognized.invalid/synthetic.m4s';track.backupUrl=[backupMode==='allowed'?cdn:'http://127.0.0.1/synthetic.m4s'];}
      if(args[0]==='guest-playurl' && typeof failPlanOnce!=='undefined' && failPlanOnce && ((typeof failAlways!=='undefined' && failAlways) || planCalls++===0))data.dash.duration='invalid';
      M.HEAPU8=new TextEncoder().encode(JSON.stringify({code:0,data}));M.print('GUEST:closed');
    }; M.onRuntimeInitialized();`;
test('W01/F06 source action uses the actual Worker through four closed native stages, keeps URLs private and Back restores focus', async ({ page }) => {
  await page.route('**/native/manifest.json', route => route.fulfill({ contentType: 'application/json', body: '{}' }));
  await page.route('**/native/probe.js', route => route.fulfill({ contentType: 'application/javascript', body: guestNativeShim }));
  await page.goto('/'); await page.locator('#popular').click();
  await expect(page.locator('#popular-state')).toContainText('1 条');
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown'); await expect(page.locator('#popular-source')).toBeFocused(); await page.keyboard.press('Enter');
  await expect(page.locator('#popular-state')).toContainText('播放源检查通过'); await expect(page.locator('#popular-detail')).toContainText('640×360');
  await expect(page.locator('#results')).toContainText('ugc.source_ranges_ok');
  expect(await page.locator('body').innerText()).not.toContain('sign=synthetic'); expect(await page.locator('body').innerText()).not.toContain('fixture.bilivideo.com');
  await page.screenshot({ path: '/tmp/bilisofa-ugc-source-desktop.png' });
  await page.keyboard.press('Escape'); await expect(page.locator('#popular')).toBeFocused();
  await page.locator('#popular').click(); await expect(page.locator('#popular-state')).toContainText('1 条'); await expect(page.locator('#popular-source')).toBeHidden();
});

test('W01 actual guest source Worker reports malformed view as a closed stage error without attempting a later request', async ({ page }) => {
  await page.route('**/native/manifest.json', route => route.fulfill({ contentType: 'application/json', body: '{}' }));
  await page.route('**/native/probe.js', route => route.fulfill({ contentType: 'application/javascript', body: `var M=self.Module; M.HEAPU8=new TextEncoder().encode('{}'); M._guest_response_ptr=()=>0; M._guest_response_length=()=>2; M._guest_http_status=()=>200; M._guest_curl_status=()=>0; M.callMain=(args)=>{if(args[0]!=='guest-view') throw Error('unexpected followup'); M.print('GUEST:closed');}; M.onRuntimeInitialized();` }));
  await page.goto('/');
  const result = await page.evaluate(() => new Promise(resolve => {
    const worker = new Worker('guest-video-worker.js');
    worker.onmessage = event => { worker.terminate(); resolve(event.data); };
    worker.postMessage({ version: 1, operation: 'guest-video-source', scope: { accountId: 'guest', generation: 1, mediaSessionId: 'source', requestId: 'r1' }, bvid: 'BV0000000001' });
  }));
  expect(result).toMatchObject({ closed: true, code: 'ugc.view_invalid_response' }); expect(Object.keys(result as object)).not.toContain('summary');
});

test('W04 actual pipeline Worker plus synthetic AVPlay keeps explicit playback, local lease, pause/seek, Back selection and Home cleanup', async ({ page }) => {
  await page.route('**/native/manifest.json', route => route.fulfill({ contentType: 'application/json', body: '{}' }));
  await page.route('**/native/probe.js', route => route.fulfill({ contentType: 'application/javascript', body: 'var failPlanOnce=true,planCalls=0;' + guestNativeShim }));
  await page.addInitScript(() => {
    let failPrepare = false;
    let state = 'NONE', time = 0, opens = 0, closes = 0, timer: ReturnType<typeof setInterval> | undefined;
    let listener: { oncurrentplaytime?: (n: number) => void; onstreamcompleted?: () => void } = {};
    const api = { getState: () => state, open(url: string) { if (!/^http:\/\/127\.0\.0\.1:40324\/[a-f0-9]{32}\/manifest\.mpd$/.test(url)) throw Error('outside lease'); state = 'IDLE'; opens++; time = 0; }, setListener(v: typeof listener) { listener = v; }, setDisplayRect() {}, prepareAsync(done: () => void, failed: () => void) { setTimeout(() => { if (failPrepare) { failed(); return; } if (state === 'IDLE') { state = 'READY'; done(); } }, 30); }, play() { state = 'PLAYING'; timer ??= setInterval(() => { if (state === 'PLAYING') { time += 200; listener.oncurrentplaytime?.(time); } }, 200); }, pause() { state = 'PAUSED'; }, seekTo(n: number, done: () => void) { time = n; listener.oncurrentplaytime?.(n); done(); }, stop() { state = 'IDLE'; }, close() { state = 'NONE'; closes++; clearInterval(timer); timer = undefined; } };
    Object.assign(globalThis, { fixtureStreamEnd: () => listener.onstreamcompleted?.(), fixturePrepareFail: (value: boolean) => { failPrepare = value; }, fixtureState: () => ({ opens, closes, state }), webapis: { avplay: api, appcommon: { AppCommonScreenSaverState: { SCREEN_SAVER_ON: 1, SCREEN_SAVER_OFF: 0 }, setScreenSaver() {} } } });
  });
  await page.goto('/'); await page.locator('#popular').click(); await expect(page.locator('#popular-state')).toContainText('1 条');
  expect(await page.evaluate(() => (globalThis as unknown as { fixtureState(): { opens: number } }).fixtureState().opens)).toBe(0);
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowRight'); await expect(page.locator('#popular-play')).toBeFocused(); await page.keyboard.press('Enter');
  await expect(page.locator('#media-status')).toContainText('playing'); await expect(page.locator('#results')).toContainText('ugc.source_refresh_once'); await expect(page.locator('#results')).toContainText('ugc.bridge_video_served'); await expect(page.locator('#popular-dialog')).toBeHidden();
  await page.locator('#media-toggle').click(); await expect(page.locator('#media-status')).toContainText('paused'); await page.locator('#media-seek').click(); await expect(page.locator('#media-status')).toContainText('5.0 / 12.0 秒');
  await page.keyboard.press('Escape'); await expect(page.locator('#popular-dialog')).toBeVisible(); await expect(page.locator('[data-focus-id=popular-card-0]')).toBeFocused();
  await page.evaluate(() => (globalThis as unknown as { fixturePrepareFail(value: boolean): void }).fixturePrepareFail(true));
  await page.locator('#popular-play').click(); await expect(page.locator('#popular-state')).toContainText('ugc.avplay_prepare_failed'); await expect(page.locator('#media-dialog')).toBeHidden();
  await page.evaluate(() => (globalThis as unknown as { fixturePrepareFail(value: boolean): void }).fixturePrepareFail(false));
  await page.locator('#popular-play').click(); await expect(page.locator('#media-status')).toContainText('playing');
  await expect(page.locator('#media-status')).toContainText('探针最长15分钟');
  await expect(page.locator('main')).toBeHidden(); await expect(page.locator('#media-toggle')).toBeFocused();
  await page.screenshot({ path: '/tmp/bilisofa-ugc-019-desktop.png' });
  await page.evaluate(() => (globalThis as unknown as { fixtureStreamEnd(): void }).fixtureStreamEnd());
  await expect(page.locator('#popular-dialog')).toBeVisible(); await expect(page.locator('[data-focus-id=popular-card-0]')).toBeFocused();
  await expect(page.locator('#results')).toContainText('ugc.stream_completed_visual_audio_review_required');
  await expect(page.locator('main')).toBeVisible();
  await page.locator('#popular-play').click(); await expect(page.locator('#media-status')).toContainText('playing');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.locator('#media-dialog')).toBeHidden(); await expect(page.locator('#popular-dialog')).toBeHidden();
  await expect(page.locator('main')).toBeVisible();
  await expect.poll(() => page.evaluate(() => (globalThis as unknown as { fixtureState(): { state: string } }).fixtureState().state)).toBe('NONE');
  await page.waitForTimeout(250); await expect(page.locator('#media-dialog')).toBeHidden();
  expect(await page.locator('body').innerText()).not.toContain('sign=synthetic');
});

test('W01 actual Worker distinguishes native body/header/range rejection from other transport errors without parsing partial data', async ({ page }) => {
  await page.route('**/native/manifest.json', route => route.fulfill({ contentType: 'application/json', body: '{}' }));
  let rc = 23, reason = 1;
  await page.route('**/native/probe.js', route => route.fulfill({ contentType: 'application/javascript', body: `var M=self.Module; M._guest_http_status=()=>200; M._guest_curl_status=()=>${rc}; M._guest_reject_reason=()=>${reason}; M.callMain=(args)=>{if(args[0]!=='guest-view')throw Error('unexpected followup'); M.print('GUEST:closed');}; M.onRuntimeInitialized();` }));
  await page.goto('/');
  for (const [error, rejected, code] of [[23, 1, 'response_too_large'], [23, 2, 'headers_too_large'], [23, 3, 'range_invalid'], [63, 1, 'response_too_large'], [28, 0, 'transport_28']] as const) {
    rc = error; reason = rejected;
    const result = await page.evaluate(() => new Promise(resolve => {
      const worker = new Worker('guest-video-worker.js');
      worker.onmessage = event => { worker.terminate(); resolve(event.data); };
      worker.postMessage({ version: 1, operation: 'guest-video-play', scope: { accountId: 'guest', generation: 1, mediaSessionId: 'source', requestId: 'r1' }, bvid: 'BV0000000001' });
    }));
    expect(result).toMatchObject({ closed: true, code: `ugc.view_${code}` }); expect(Object.keys(result as object)).not.toContain('summary');
  }
});

for (const cancel of [false, true]) test(`W04 malformed playurl refreshes at most once and ${cancel ? 'Back cancels during backoff' : 'a second invalid response stays failed'}`, async ({ page }) => {
  await page.route('**/native/manifest.json', route => route.fulfill({ contentType: 'application/json', body: '{}' }));
  await page.route('**/native/probe.js', route => route.fulfill({ contentType: 'application/javascript', body: 'var failPlanOnce=true,failAlways=true,planCalls=0;' + guestNativeShim }));
  await page.goto('/');
  const result = await page.evaluate(cancel => new Promise<{ final: unknown; refreshes: number }>(resolve => {
    const worker = new Worker('guest-video-worker.js'), scope = { accountId: 'guest', generation: 1, mediaSessionId: 'play', requestId: 'r1' }; let refreshes = 0;
    worker.onmessage = event => {
      if (event.data.code === 'ugc.source_refresh_once') { refreshes++; if (cancel) worker.postMessage({ version: 1, scope, operation: 'guest-video-play', control: 'stop' }); }
      if (event.data.closed) { worker.terminate(); resolve({ final: event.data, refreshes }); }
    };
    worker.postMessage({ version: 1, scope, operation: 'guest-video-play', bvid: 'BV0000000001' });
  }), cancel);
  expect(result.refreshes).toBe(1); expect(result.final).toMatchObject({ closed: true, code: cancel ? 'ugc.cancelled' : 'ugc.playurl_invalid_response' });
});

for (const allowed of [true, false]) test(`W04 actual Worker ${allowed ? 'uses validated backups for both range checks and bridge' : 'rejects every unsafe candidate before any CDN request'}`, async ({ page }) => {
  await page.route('**/native/manifest.json', route => route.fulfill({ contentType: 'application/json', body: '{}' }));
  const shim = guestNativeShim.replace("if(args[0]==='bridge'){", "if(args[0]==='bridge'){if(args[3]!==cdn||args[4]!==cdn)throw Error('unsafe bridge destination');");
  await page.route('**/native/probe.js', route => route.fulfill({ contentType: 'application/javascript', body: `var backupMode='${allowed ? 'allowed' : 'denied'}';` + shim }));
  await page.goto('/');
  const result = await page.evaluate(() => new Promise<{ codes: string[]; final: unknown }>(resolve => {
    const worker = new Worker('guest-video-worker.js'), scope = { accountId: 'guest', generation: 1, mediaSessionId: 'play', requestId: 'r1' }, codes: string[] = [];
    worker.onmessage = event => {
      codes.push(event.data.code);
      if (event.data.code === 'ugc.bridge_ready') worker.postMessage({ version: 1, scope, operation: 'guest-video-play', control: 'stop' });
      if (event.data.closed) { worker.terminate(); resolve({ codes, final: event.data }); }
    };
    worker.postMessage({ version: 1, scope, operation: 'guest-video-play', bvid: 'BV0000000001' });
  }));
  expect(result.final).toMatchObject({ closed: true, code: allowed ? 'ugc.bridge_stopped' : 'ugc.playurl_cdn_unavailable' });
  expect(result.codes).toEqual(allowed ? ['ugc.source_backup_selected', 'ugc.bridge_ready', 'ugc.bridge_stopped'] : ['ugc.playurl_cdn_unavailable']);
  expect(JSON.stringify(result)).not.toContain('sign='); expect(JSON.stringify(result)).not.toContain('unrecognized.invalid');
});

test('W01/F20 discovery without a TV address is blocked and Back returns to its invoker', async ({ page }) => {
  await page.goto('/'); await page.locator('#cast').click(); await expect(page.locator('#cast-close')).toBeFocused();
  await expect(page.locator('#cast-state')).toContainText('需要电视已连接普通局域网');
  await expect(page.locator('#results')).toContainText('cast.address_unavailable');
  await page.keyboard.press('Escape'); await expect(page.locator('#cast-dialog')).toBeHidden(); await expect(page.locator('#cast')).toBeFocused();
});
test('W01/F20 actual discovery Worker keeps a bounded native lease, fixed diagnostics, Back and Home cleanup', async ({ page }) => {
  await page.addInitScript(() => Object.assign(globalThis, { tizen: { systeminfo: { getPropertyValue(name: string, done: (v: object) => void) { done({ ipAddress: '10.0.0.9', status: name === 'WIFI_NETWORK' ? 'ON' : 'CONNECTED' }); } } } }));
  await page.route('**/native/manifest.json', route => route.fulfill({ contentType: 'application/json', body: '{}' }));
  await page.route('**/native/probe.js', route => route.fulfill({ contentType: 'application/javascript', body: `var M=self.Module;M._cast_rpc_enable=()=>{}; M.callMain=(a)=>{if(a[0]!=='cast'||a[1]!=='10.0.0.9'||!/^[a-f0-9-]{36}$/.test(a[2])||!/^[a-f0-9]{32}$/.test(a[3]))throw Error('bad owned identity');M._cast_stop=()=>M.print('CAST:closed:1:1:1:1:0:0:0');M.print('CAST:ready');setTimeout(()=>M.print('CAST:seen:2'),10);};M.onRuntimeInitialized();` }));
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await page.locator('#cast').click(); await expect(page.locator('#cast-state')).toContainText('设备描述已被请求');
  await expect(page.locator('#cast-close')).toBeFocused(); await expect(page.locator('main')).toHaveAttribute('inert', '');
  await page.screenshot({ path: '/tmp/bilisofa-cast-020-desktop.png' });
  await page.keyboard.press('Escape'); await expect(page.locator('#cast')).toBeFocused(); await expect(page.locator('#results')).toContainText('cast.native_closed_confirmed');
  await page.locator('#cast').click(); await expect(page.locator('#cast-state')).toContainText('设备描述已被请求');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.locator('#cast-dialog')).toBeHidden(); await expect(page.locator('main')).not.toHaveAttribute('inert', '');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.locator('#inspect')).toBeFocused(); await page.locator('#export').click();
  await expect(page.locator('#export-output')).not.toHaveValue(/10\.0\.0\.9|01234567|discovery-uuid/); expect(errors).toEqual([]);
});
test('W01/F20 cancelling address lookup never starts a late discovery listener', async ({ page }) => {
  await page.addInitScript(() => Object.assign(globalThis, { tizen: { systeminfo: { getPropertyValue(name: string, done: (v: object) => void) { setTimeout(() => done({ ipAddress: '10.0.0.9', status: name === 'WIFI_NETWORK' ? 'ON' : 'CONNECTED' }), 150); } } } }));
  let workerLoads = 0; page.on('request', request => { if (request.url().endsWith('/cast-worker.js')) workerLoads++; });
  await page.goto('/'); await page.locator('#cast').click(); await page.keyboard.press('Escape'); await page.waitForTimeout(250);
  await expect(page.locator('#cast-dialog')).toBeHidden(); await expect(page.locator('#cast')).toBeFocused(); expect(workerLoads).toBe(0);
});

for (const failure of [0, 131, 132]) test(`W01/F20 startup-only automation reports ${failure || 'ready and confirmed close'} before opening diagnostics`, async ({ page }) => {
  await page.route('http://127.0.0.1:4173/', async route => {
    const response = await route.fetch(); await route.fulfill({ response, body: (await response.text()).replace('name="probe-auto" content="0"', 'name="probe-auto" content="6"') });
  });
  await page.addInitScript(() => Object.assign(globalThis, { tizen: { systeminfo: { getPropertyValue(name: string, done: (v: object) => void) { done({ ipAddress: '10.0.0.9', status: name === 'WIFI_NETWORK' ? 'ON' : 'CONNECTED' }); } } } }));
  await page.route('**/native/manifest.json', route => route.fulfill({ contentType: 'application/json', body: '{}' }));
  const expected = failure ? `cast.failed_${failure}` : 'cast.native_closed_confirmed';
  await page.route('**/native/probe.js', route => route.fulfill({ contentType: 'application/javascript', body: `var M=self.Module;M._cast_rpc_enable=()=>{}; M.callMain=(a)=>{if(a[0]==='cast'){M._cast_stop=()=>setTimeout(()=>M.print('CAST:closed:0:0:0:0:0:0:0'),80);M.print(${failure ? JSON.stringify('CAST:failed:' + failure) : "'CAST:ready'"});}else if(a[0]==='http'){const r=JSON.parse(a[1]);if(!r.entries.some(e=>e.code===${JSON.stringify(expected)}))throw Error('report before native result');M._probe_stop=()=>M.print('HTTP:stopped');M.print('HTTP:ready');setTimeout(()=>M.print('HTTP:served'),10);}else throw Error('unexpected native operation');};M.onRuntimeInitialized();` }));
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await expect(page.locator('#results')).toContainText('W01-http · PASS');
  await expect(page.locator('#results')).toContainText(expected); await expect(page.locator('#cast-dialog')).toBeHidden();
  if (failure) await expect(page.locator('#results')).not.toContainText('W01-cast-cleanup · PASS');
  else await expect(page.locator('#results')).toContainText('W01-cast-cleanup · PASS');
  await page.locator('#export').click(); await expect(page.locator('#export-output')).not.toHaveValue(/10\.0\.0\.9|discovery-uuid/); expect(errors).toEqual([]);
});
test('W01/F20 cancelled startup automation cannot close a new manual discovery window or open diagnostics', async ({ page }) => {
  await page.route('http://127.0.0.1:4173/', async route => {
    const response = await route.fetch(); await route.fulfill({ response, body: (await response.text()).replace('name="probe-auto" content="0"', 'name="probe-auto" content="6"') });
  });
  await page.addInitScript(() => Object.assign(globalThis, { tizen: { systeminfo: { getPropertyValue(name: string, done: (v: object) => void) { setTimeout(() => done({ ipAddress: '10.0.0.9', status: name === 'WIFI_NETWORK' ? 'ON' : 'CONNECTED' }), 200); } } } }));
  await page.route('**/native/manifest.json', route => route.fulfill({ contentType: 'application/json', body: '{}' }));
  await page.route('**/native/probe.js', route => route.fulfill({ contentType: 'application/javascript', body: "var M=self.Module;M._cast_rpc_enable=()=>{};M.callMain=()=>{M._cast_stop=()=>M.print('CAST:closed:0:0:0:0:0:0:0');M.print('CAST:ready');};M.onRuntimeInitialized();" }));
  let reportWorkers = 0; page.on('request', request => { if (request.url().endsWith('/probe-worker.js')) reportWorkers++; });
  await page.goto('/'); await expect(page.locator('#cast-dialog')).toBeVisible(); await page.keyboard.press('Escape'); await page.locator('#cast').click();
  await expect(page.locator('#cast-state')).toContainText('五分钟内'); await page.waitForTimeout(300);
  await expect(page.locator('#cast-dialog')).toBeVisible(); await expect(page.locator('#cast-close')).toBeFocused(); expect(reportWorkers).toBe(0);
  await expect(page.locator('#results')).not.toContainText('W01-http');
});

for (const action of ['query', 'offer', 'malformed', 'missing-action', 'declaration', 'missing-metadata', 'extra-argument', 'nested-metadata', 'http-upgrade', 'tls-failure', 'unsafe-source']) test(`W01/F20 actual Worker handles bounded private SOAP ${action} through owned native getters`, async ({ page }) => {
  const ns = 'urn:schemas-upnp-org:service:AVTransport:1';
  const isOffer = ['offer', 'missing-metadata', 'extra-argument', 'nested-metadata', 'http-upgrade', 'tls-failure', 'unsafe-source'].includes(action);
  const method = isOffer ? 'SetAVTransportURI' : 'GetTransportInfo';
  const args = '<InstanceID>0</InstanceID>' + (isOffer ? `<CurrentURI>${['http-upgrade', 'tls-failure', 'unsafe-source'].includes(action) ? 'http' : 'https'}://${action === 'unsafe-source' ? 'outside.invalid' : 'cdn.bilivideo.com'}/upgcxcode/fixture.mp4?deadline=${Math.floor(Date.now() / 1000) + 300}&amp;sign=private-fixture-marker</CurrentURI>${action === 'missing-metadata' ? '' : `<CurrentURIMetaData>${action === 'nested-metadata' ? '<nested>private-fixture-marker</nested>' : ['http-upgrade', 'tls-failure', 'unsafe-source'].includes(action) ? 'private-fixture-marker' + 'x'.repeat(2200) : '&lt;private-fixture-marker/&gt;'}</CurrentURIMetaData>`}${['extra-argument', 'http-upgrade', 'tls-failure', 'unsafe-source'].includes(action) ? '<private_name>private-fixture-marker</private_name>' : ''}` : '');
  const xml = (action === 'declaration' ? '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' : '') + `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><u:${method} xmlns:u="${action === 'malformed' ? 'urn:outside' : ns}">${args}</u:${method}></s:Body></s:Envelope>`;
  const fact = (action === 'query' || action === 'declaration') ? 'transport_query' : ['offer', 'extra-argument'].includes(action) ? 'mp4_offer_rejected' : ['http-upgrade', 'tls-failure', 'unsafe-source'].includes(action) ? 'uri_offer_rejected' : action === 'malformed' ? 'invalid_action' : isOffer ? 'offer_invalid_arguments' : 'invalid_header';
  await page.addInitScript(() => Object.assign(globalThis, { tizen: { systeminfo: { getPropertyValue(name: string, done: (v: object) => void) { done({ ipAddress: '10.0.0.9', status: name === 'WIFI_NETWORK' ? 'ON' : 'CONNECTED' }); } } } }));
  await page.route('**/native/manifest.json', route => route.fulfill({ contentType: 'application/json', body: '{}' }));
  await page.route('**/native/probe.js', route => route.fulfill({ contentType: 'application/javascript', body: `var M=self.Module;M._cast_rpc_enable=()=>{};var pending=true,count=0,body=new TextEncoder().encode(${JSON.stringify(xml)}),action=new TextEncoder().encode(${JSON.stringify(action === 'missing-action' ? '' : '"' + ns + '#' + method + '"')});M.HEAPU8=new Uint8Array(12000);M.HEAPU8.set(body,64);M.HEAPU8.set(action,4500);M._cast_rpc_peer=id=>pending&&id===1?0x0a000009:0;M._cast_rpc_service=id=>pending&&id===1?3:0;M._cast_rpc_body=()=>64;M._cast_rpc_body_size=()=>body.length;M._cast_rpc_action=()=>4500;M._cast_rpc_buffer=()=>5000;M._cast_source_buffer=()=>9500;M._cast_source_begin=length=>{var candidate=new TextDecoder().decode(M.HEAPU8.subarray(9500,9500+length));if(!candidate.startsWith('https://cdn.bilivideo.com/upgcxcode/fixture.mp4?')||!candidate.includes('sign=private-fixture-marker'))throw Error('private HTTPS candidate');M.HEAPU8.fill(0,9500,9500+length+1);M.print('CAST:source:started');setTimeout(()=>M.print(${JSON.stringify(action === 'tls-failure' ? 'CAST:source:failed:0:60' : 'CAST:source:pass')}),10);return 1;};M._cast_rpc_reply=(id,status,length)=>{if(id!==1||!pending||++count>1||status!==${(action === 'query' || action === 'declaration') ? 200 : 500})throw Error('reply ownership/status');var response=new TextDecoder().decode(M.HEAPU8.subarray(5000,5000+length));if(!response.includes(${JSON.stringify((action === 'query' || action === 'declaration') ? 'NO_MEDIA_PRESENT' : '<errorCode>' + (['offer', 'extra-argument', 'http-upgrade', 'tls-failure', 'unsafe-source'].includes(action) ? 701 : 402) + '</errorCode>')})||response.includes('private-fixture-marker'))throw Error('private SOAP response');pending=false;M.HEAPU8.fill(0,64,64+body.length);setTimeout(()=>M.print('CAST:rpc:1'),0);return 1;};M.callMain=()=>{M._cast_stop=()=>M.print('CAST:closed:0:0:0:0:0:0:0');M.print('CAST:ready');setTimeout(()=>M.print('CAST:rpc:1'),10);};M.onRuntimeInitialized();` }));
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await page.locator('#cast').click(); await expect(page.locator('#results')).toContainText(`cast.soap_${fact}`);
  await expect(page.locator('#cast-state')).toContainText(['offer', 'extra-argument', 'http-upgrade'].includes(action) ? '源已就绪' : '最近四项');
  if (isOffer) await expect(page.locator('#results')).toContainText(['http-upgrade', 'tls-failure', 'unsafe-source'].includes(action) ? 'cast.soap_offer_uri_http' : 'cast.soap_offer_uri_supported');
  if (action === 'unsafe-source') { await expect(page.locator('#results')).toContainText('cast.source_policy_destination'); await expect(page.locator('#results')).not.toContainText('cast.source_started'); }
  if (['offer', 'extra-argument', 'http-upgrade', 'tls-failure'].includes(action)) await expect(page.locator('#results')).toContainText(action === 'tls-failure' ? 'cast.source_failed_0_60' : 'cast.source_pass');
  if (['http-upgrade', 'tls-failure'].includes(action)) { await expect(page.locator('#results')).toContainText('cast.source_upgrade_planned'); await expect(page.locator('#results')).toContainText('cast.soap_offer_metadata_oversized'); }
  if (action === 'missing-metadata') await expect(page.locator('#cast-history')).toContainText('cast.soap_offer_args_missing_metadata');
  if (action === 'extra-argument') await expect(page.locator('#results')).toContainText('cast.soap_offer_args_extra');
  if (action === 'nested-metadata') await expect(page.locator('#cast-history')).toContainText('cast.soap_offer_metadata_nested');
  await page.waitForTimeout(50); await page.keyboard.press('Escape'); await expect(page.locator('#results')).toContainText('cast.native_closed_confirmed');
  await expect(page.locator('#results')).toContainText('cast.soap_summary_v1_');
  await page.locator('#export').click(); await expect(page.locator('#export-output')).not.toHaveValue(/private-fixture-marker|deadline=|10\.0\.0\.9|CurrentURI|SOAPAction/); expect(errors).toEqual([]);
});


test('W01/F20 rapid fixed facts remain readable and closing preserves all facts in a bounded summary', async ({ page }) => {
  const { SOAP_PROBE_FACTS, decodeSoapProbeSummary, SOURCE_POLICY_REASONS, CAST_MEDIA_REQUESTS } = await import('../../packages/contracts/src/upnp.ts');
  await page.addInitScript(() => Object.assign(globalThis, { tizen: { systeminfo: { getPropertyValue(name: string, done: (v: object) => void) { done({ ipAddress: '10.0.0.9', status: name === 'WIFI_NETWORK' ? 'ON' : 'CONNECTED' }); } } } }));
  await page.route('**/cast-worker.js', route => route.fulfill({ contentType: 'application/javascript', body: `var request;self.onmessage=e=>{if(e.data.control==='stop'){self.postMessage({version:1,operation:'cast-discovery',scope:request.scope,closed:true,code:'cast.closed_1_1_1_1_1_0_0'});return;}request=e.data;const send=code=>self.postMessage({version:1,operation:'cast-discovery',scope:request.scope,closed:false,code});send('cast.ready');setTimeout(()=>{for(const fact of ${JSON.stringify(SOAP_PROBE_FACTS)})send('cast.soap_'+fact);for(const reason of ${JSON.stringify(SOURCE_POLICY_REASONS)})send('cast.source_policy_'+reason);for(const type of ['search','reply','description_request','service_request','control_rejected','setup_rejected','protocol_query'])send('cast.seen_'+type);for(const type of ['approved','ready','served','stopped','expired','unavailable','failed','issue_400_0'])send('cast.media_'+type);for(const kind of ${JSON.stringify(CAST_MEDIA_REQUESTS)})send('cast.media_request_'+kind);for(const type of ['candidate_valid','upgrade_planned','started','pass'])send('cast.source_'+type);},20);};` }));
  await page.goto('/'); await page.locator('#cast').click(); await expect(page.locator('#cast-state')).toContainText('源已就绪');
  await expect(page.locator('#cast-history li')).toHaveCount(4);
  for (const fact of ['candidate_valid','upgrade_planned','started','pass']) await expect(page.locator('#cast-history')).toContainText('cast.source_' + fact);
  await expect(page.locator('#cast-close')).toBeFocused();
  const bounds = await page.locator('#cast-close').boundingBox(); expect(bounds!.y + bounds!.height).toBeLessThan(1080);
  await page.screenshot({ path: '/tmp/bilisofa-cast-028-history.png' });
  await page.keyboard.press('Escape'); await expect(page.locator('#cast')).toBeFocused();
  await expect(page.locator('#results')).toContainText('cast.native_closed_confirmed');
  await page.locator('#export').click();
  const exported = JSON.parse(await page.locator('#export-output').inputValue());
  expect(exported.entries.length).toBeLessThanOrEqual(64);
  const summary = exported.entries.find((entry: { code: string }) => entry.code.startsWith('cast.soap_summary_v1_'));
  expect(decodeSoapProbeSummary(summary.code)).toEqual([...SOAP_PROBE_FACTS]);
  await page.evaluate(() => {
    const send = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (message: unknown) {
      const request = message as { report?: string };
      if (request.report) (globalThis as unknown as { capturedReport: string }).capturedReport = request.report;
      send.call(this, message);
    };
  });
  await page.locator('#http').click();
  const compact = await page.evaluate(() => JSON.parse((globalThis as unknown as { capturedReport: string }).capturedReport));
  expect(compact.entries.length).toBeLessThanOrEqual(8);
  expect(compact.entries).toContainEqual(expect.objectContaining({ code: summary.code }));
  expect(compact.entries).toContainEqual(expect.objectContaining({ code: 'cast.source_pass' }));
  expect(compact.entries).toContainEqual(expect.objectContaining({ code: 'cast.media_requests_v1_1f' }));
  await page.locator('#cast').click(); await expect(page.locator('#cast-history li')).toHaveCount(0);
  await page.keyboard.press('Escape');
});
