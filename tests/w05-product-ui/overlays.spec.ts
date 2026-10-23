import {test,expect,type Page} from '@playwright/test';
import {tick,snapshot} from '../w04-media-ui/fixture.ts';
import {overlay} from './overlays-fixture.ts';
test('W05 production playback/Worker shows parsed subtitle and protobuf text, language change/prefs preserve playback and Back clears only the pane', async ({ page }, info) => {
  const f = await overlay(page); await expect(page.locator('.subtitle-lines')).toContainText('中文 <script>纯文本</script>'); await tick(page, 1500); await expect(page.locator('.danmaku-line')).toHaveText('真实链路合成弹幕1'); await expect(page.locator('.vod-overlay-plane script,img[src=x]')).toHaveCount(0);
  await page.getByRole('button', { name: '弹幕 / 字幕', exact: true }).click(); await expect(page.getByRole('button', { name: '返回播放', exact: true })).toBeFocused();
  await page.getByRole('button', { name: /^字幕语言/ }).click(); await page.getByRole('button', { name: 'English', exact: true }).click(); await expect(page.locator('.subtitle-lines')).toContainText('EN <script>纯文本</script>');
  await page.getByRole('button', { name: '字幕延后0.5秒', exact: true }).click(); await expect(page.getByRole('button', { name: /字幕偏移：0.5秒/ })).toBeVisible();
  await page.getByRole('button', { name: '弹幕：开启', exact: true }).click(); await expect(page.locator('.danmaku-line')).toHaveCount(0); expect((await snapshot(page)).state).toBe('PLAYING');
  await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: '弹幕 / 字幕', exact: true })).toBeFocused();
  await expect.poll(async () => { const sub = await page.locator('.subtitle-lines').boundingBox(), controls = await page.locator('.vod-panel').boundingBox(); return !!sub && !!controls && sub.y + sub.height < controls.y; }).toBe(true);
  await page.screenshot({ path: info.outputPath('vod-subtitle-layer.png') });
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('bilisofa.overlays.v1.guest')!)); expect(stored.subtitles.language).toBe('en'); expect(stored.subtitles.offsetMs).toBe(500);
  await page.getByRole('button', { name: '返回原卡', exact: true }).click(); await expect(page.locator('.vod-overlay-plane')).toHaveCount(0); expect((await snapshot(page)).state).toBe('NONE'); expect(f.errors).toEqual([]);
});
test('W05 missing subtitle/empty protobuf differs from refusal and optional reads never stop video or automatically retry', async ({ page }) => {
  const f = await overlay(page, 'empty'); await page.getByRole('button', { name: '弹幕 / 字幕', exact: true }).click(); await expect(page.locator('.overlay-settings [role=status]')).toContainText('当前内容/身份没有字幕'); await expect(page.locator('.overlay-settings [role=status]')).toContainText('本段没有普通弹幕'); expect((await snapshot(page)).state).toBe('PLAYING'); expect(f.calls.filter(op => op === 4)).toHaveLength(1); expect(f.errors).toEqual([]);
});
test('W05 metadata network refusal stays separate from media, manual reread/filters use one shell and Home removes all overlays', async ({ page }) => {
  const f = await overlay(page, 'fail'); await page.getByRole('button', { name: '弹幕 / 字幕', exact: true }).click(); await expect(page.locator('.overlay-settings [role=status]')).toContainText('字幕读取失败（overlay.network）'); expect((await snapshot(page)).state).toBe('PLAYING'); expect(f.calls.filter(op => op === 4)).toHaveLength(1);
  await page.getByRole('button', { name: '关键词过滤：0项', exact: true }).click(); await page.getByRole('button', { name: '添加过滤词 · 首字母输入', exact: true }).click(); await page.getByRole('button', { name: '使用字母/数字', exact: true }).focus(); await page.keyboard.type('abc'); await page.getByRole('button', { name: '使用字母/数字', exact: true }).click(); await page.getByRole('button', { name: '确认过滤词', exact: true }).click(); await expect(page.getByRole('button', { name: 'abc', exact: true })).toBeVisible();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }); await expect(page.locator('.vod-overlay-plane')).toHaveCount(0); expect((await snapshot(page)).state).toBe('NONE'); expect(f.errors).toEqual([]);
});
test('W05 Home stops the decoder promptly while the optional native read close acknowledgement is still pending', async ({ page }) => {
  const f = await overlay(page, 'slow'); await expect.poll(() => f.calls.includes(4)).toBe(true); expect((await snapshot(page)).state).toBe('PLAYING');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect.poll(async () => (await snapshot(page)).state, { timeout: 300 }).toBe('NONE'); await expect(page.locator('.vod-overlay-plane')).toHaveCount(0); await expect(page.locator('#overlays')).toBeEmpty(); expect(f.errors).toEqual([]);
});
test('W05 selected P2 refreshes private source binding and overlay reads without losing the actual part or decoder ownership', async ({ page }) => {
  const f = await overlay(page); await expect(page.locator('.subtitle-lines')).toContainText('中文');
  await page.getByRole('button', { name: '选择分P', exact: true }).click(); await page.getByRole('button', { name: 'P2 · 第二P', exact: true }).click();
  await expect(page.locator('.vod-panel h2')).toContainText('P2'); await expect(page.locator('.subtitle-lines')).toContainText('中文'); await expect.poll(() => f.parts.at(-1)).toBe(222); expect(f.parts).toContain(111);
  expect((await snapshot(page)).opened).toBe(2); await page.getByRole('button', { name: '返回原卡', exact: true }).click(); await expect(page.locator('.vod-overlay-plane')).toHaveCount(0); expect((await snapshot(page)).state).toBe('NONE'); expect(f.errors).toEqual([]);
});
async function motionFrames(page: Page) {
  return page.evaluate(async () => {
    const result: { x: number; media: number }[] = [];
    for (let i = 0; i < 10; i++) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const node = document.querySelector('.danmaku-line');
      const media = (globalThis as unknown as { mediaFixture: { snapshot(): { time: number } } }).mediaFixture.snapshot().time;
      result.push({ x: node ? new DOMMatrix(getComputedStyle(node).transform).m41 : Number.NaN, media });
    } return result;
  });
}
test('Sparse one-second native ticks still produce continuous horizontal frames, while pause freezes actual text', async ({ page }) => {
  const f = await overlay(page, 'sparse'); await expect(page.locator('.danmaku-line')).toHaveCount(1);
  const moving = await motionFrames(page); expect(moving.every(n => Number.isFinite(n.x))).toBe(true);
  const betweenTicks = moving.slice(1).filter((n, i) => n.media === moving[i]!.media && n.x < moving[i]!.x);
  expect(betweenTicks.length).toBeGreaterThanOrEqual(7);
  await page.getByRole('button', { name: '暂停 / 继续', exact: true }).click(); await expect(page.locator('.vod-panel [role=status]')).toHaveText('已暂停');
  const paused = await motionFrames(page); expect(new Set(paused.map(n => n.x)).size).toBe(1); expect((await snapshot(page)).state).toBe('PAUSED');
  await page.getByRole('button', { name: '返回原卡', exact: true }).click(); expect(f.errors).toEqual([]);
});
test('Control layer auto-hides, frees subtitle space, consumes wake keys once and preserves nested modal/Back ownership', async ({ page }, info) => {
  const f = await overlay(page); const wake = page.getByRole('button', { name: '播放控制已隐藏，按确认或方向键显示；返回离开播放', exact: true });
  await page.getByRole('button', { name: '弹幕 / 字幕', exact: true }).focus();
  await expect(wake).toBeVisible({ timeout: 7000 }); await expect(wake).toBeFocused();
  await expect(page.locator('.subtitle-lines')).toHaveCSS('bottom', '60px'); await expect(page.getByRole('button', { name: '暂停 / 继续', exact: true })).not.toBeVisible();
  await page.screenshot({ path: info.outputPath('controls-hidden-subtitles.png') });
  await page.keyboard.press('Enter'); await expect(page.getByRole('button', { name: '弹幕 / 字幕', exact: true })).toBeFocused(); await expect(page.locator('.overlay-settings')).toHaveCount(0); expect((await snapshot(page)).state).toBe('PLAYING');
  await page.getByRole('button', { name: '隐藏控制栏', exact: true }).click(); await expect(wake).toBeFocused();
  await page.keyboard.press('ArrowUp'); await expect(page.getByRole('button', { name: '隐藏控制栏', exact: true })).toBeFocused();
  await page.getByRole('button', { name: '弹幕 / 字幕', exact: true }).click();
  await page.waitForTimeout(5500); await expect(page.getByRole('button', { name: '返回播放', exact: true })).toBeFocused(); await expect(page.locator('.vod-panel')).not.toHaveClass(/vod-controls-hidden/);
  await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: '弹幕 / 字幕', exact: true })).toBeFocused();
  await page.keyboard.press('Escape'); await expect(wake).toBeFocused(); expect((await snapshot(page)).state).toBe('PLAYING');
  await page.keyboard.press('Escape'); await expect(page.locator('.vod-panel')).toHaveCount(0); expect((await snapshot(page)).state).toBe('NONE'); expect(f.errors).toEqual([]);
});
