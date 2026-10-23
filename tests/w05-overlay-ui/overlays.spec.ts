import { test, expect, type Page } from '@playwright/test';
import { buildSync } from 'esbuild';
import type { OverlaySession } from '../../packages/media/src/overlay-session.ts';
import type { MediaOverlayView } from '../../apps/tv/src/ui/media-overlays.ts';
const bundle = buildSync({ stdin: { contents: "export {OverlaySession} from './packages/media/src/overlay-session.ts'; export {MediaOverlayView} from './apps/tv/src/ui/media-overlays.ts';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, format: 'iife', globalName: 'W05', target: 'es2022' }).outputFiles[0]!.text;
interface Fixture { session: OverlaySession; view: MediaOverlayView; render(time: number, state?: 'playing' | 'paused' | 'seeking'): void; }
async function setup(page: Page) {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.setContent('<!doctype html><html><body style="background:#182330;color:white"><div id="media" style="position:fixed;inset:0"><p style="position:absolute;top:35%;left:35%;font-size:40px">W05 合成画面 · 无真实视频</p></div><button id="control" style="position:fixed;left:48px;top:40px;z-index:2;width:200px;height:80px">播放器控制</button></body></html>');
  await page.addScriptTag({ content: bundle });
  await page.evaluate(async () => {
    const api = (globalThis as unknown as { W05: { OverlaySession: new () => OverlaySession; MediaOverlayView: new (doc: Document, parent: HTMLElement) => MediaOverlayView; } }).W05;
    const session = new api.OverlaySession(); session.bind({ accountId: 'guest', generation: 1, mediaSessionId: 'synthetic-1', itemKey: 'BV0000000001:p1' });
    await session.loadDanmaku(async () => [{ id: 'd1', timeMs: 1000, mode: 'scroll', color: 0xffffff, content: '<img src=x onerror=alert(1)>纯文本' }, { id: 'd2', timeMs: 1000, mode: 'top', color: 0x00ff00, content: '顶部弹幕' }, { id: 'd3', timeMs: 1000, mode: 'bottom', color: 0xffff00, content: '底部弹幕' }]);
    await session.loadSubtitles(async () => ({ body: [{ from: 1, to: 4, content: '<script>不执行</script>\n第二行字幕' }] }));
    const view = new api.MediaOverlayView(document, document.getElementById('media')!);
    const fixture: Fixture = { session, view, render: (time, state = 'playing') => view.render(session.frame(time, state, { width: 1920, height: 1080 })) };
    Object.assign(globalThis, { overlayFixture: fixture }); document.getElementById('control')!.focus(); fixture.render(1500);
  });
  return errors;
}
const render = (page: Page, time: number, state: 'playing' | 'paused' | 'seeking' = 'playing') => page.evaluate(({ time, state }) => (globalThis as unknown as { overlayFixture: Fixture }).overlayFixture.render(time, state), { time, state });
test('W05 passive overlays show only text, preserve control focus and allow pointer input through the layer', async ({ page }, info) => {
  const errors = await setup(page); await expect(page.locator('.danmaku-line')).toHaveCount(3); await expect(page.locator('.subtitle-lines p')).toHaveText('<script>不执行</script>\n第二行字幕');
  await expect(page.locator('img,iframe,.media-overlay-view script')).toHaveCount(0); await expect(page.locator('#control')).toBeFocused();
  expect(await page.locator('.media-overlay-view').getAttribute('aria-hidden')).toBe('true'); expect(await page.locator('.media-overlay-view').evaluate(el => getComputedStyle(el).pointerEvents)).toBe('none');
  expect(await page.evaluate(() => document.elementFromPoint(100, 80)?.id)).toBe('control'); await page.locator('#control').click(); await expect(page.locator('#control')).toBeFocused();
  await page.screenshot({ path: info.outputPath('overlay-text-and-focus.png') }); expect(errors).toEqual([]);
});
test('W05 paused media time freezes movement, seek clears both layers, backward seek restores and elapsed cues disappear', async ({ page }) => {
  const errors = await setup(page), original = await page.locator('.danmaku-line').first().getAttribute('style');
  await render(page, 1500, 'paused'); expect(await page.locator('.danmaku-line').first().getAttribute('style')).toBe(original);
  await render(page, 2500); expect(await page.locator('.danmaku-line').first().getAttribute('style')).not.toBe(original);
  await render(page, 2500, 'seeking'); await expect(page.locator('.danmaku-line,.subtitle-lines p')).toHaveCount(0);
  await render(page, 1500); expect(await page.locator('.danmaku-line').first().getAttribute('style')).toBe(original);
  await render(page, 9500); await expect(page.locator('.danmaku-line,.subtitle-lines p')).toHaveCount(0); await expect(page.locator('#control')).toBeFocused(); expect(errors).toEqual([]);
});
test('W05 content replacement clears previous text and owner teardown removes all overlay DOM idempotently', async ({ page }) => {
  const errors = await setup(page); await page.evaluate(() => {
    const f = (globalThis as unknown as { overlayFixture: Fixture }).overlayFixture;
    f.session.bind({ accountId: 'bili_101', generation: 2, mediaSessionId: 'synthetic-2', itemKey: 'BV0000000001:p2' }); f.render(1500);
  }); await expect(page.locator('.danmaku-line,.subtitle-lines p')).toHaveCount(0);
  await page.evaluate(() => { const f = (globalThis as unknown as { overlayFixture: Fixture }).overlayFixture; f.session.close(); f.view.close(); f.view.close(); f.render(1500); });
  await expect(page.locator('.media-overlay-view')).toHaveCount(0); await expect(page.locator('#control')).toBeFocused(); expect(errors).toEqual([]);
});
