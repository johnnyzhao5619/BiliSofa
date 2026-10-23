import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { setup as mediaSetup, snapshot, tick } from '../w04-media-ui/fixture.ts';
const original = readFileSync('tests/media-ui/native-fixture.js', 'utf8').replace('__VARIANT__', 'normal');
const legacy = original.replace("duration:80,owner:", "pic:'https://i0.hdslb.com/bfs/archive/cover'+i+'.png',duration:80,owner:");
// Generated test raster, no external images or device evidence.
function image(): Buffer { const crc = (b: Buffer) => { let c = 0xffffffff; for (const n of b) {
    c ^= n;
    for (let i = 0; i < 8; i++)
        c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
} return (c ^ 0xffffffff) >>> 0; }; const chunk = (type: string, data: Buffer) => { const b = Buffer.alloc(data.length + 12); b.writeUInt32BE(data.length); b.write(type, 4); data.copy(b, 8); b.writeUInt32BE(crc(b.subarray(4, -4)), b.length - 4); return b; }; const w = 800, h = 450, header = Buffer.alloc(13); header.writeUInt32BE(w); header.writeUInt32BE(h, 4); header[8] = 8; header[9] = 2; const rows = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
        const i = y * (w * 3 + 1) + 1 + x * 3;
        rows[i] = 30 + Math.floor(x / 8);
        rows[i + 1] = 60 + Math.floor(y / 4);
        rows[i + 2] = 100 + Math.floor(x / 10);
    } return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]); }
async function setup(page: Page, mode = 'normal') {
    await page.route('https://i0.hdslb.com/**', r => mode === 'bad-art' ? r.fulfill({ contentType: 'image/svg+xml', body: '<svg onload="bad()"/>', headers: { 'Access-Control-Allow-Origin': '*' } }) : r.fulfill({ contentType: 'image/png', body: image(), headers: { 'Access-Control-Allow-Origin': '*' } }));
    const errors = await mediaSetup(page, false);
    await page.route('**/native/probe.js', r => r.fulfill({ contentType: 'text/javascript', body: mode === 'read-failed' ? legacy.replace("size ? 200 : 206", "operation==='guest-popular'?412:size ? 200 : 206") : legacy }));
    await page.reload();
    return errors;
}
const cards = (p: Page) => p.locator('.tv-grid .tv-card');
test('U1 auto home has four raster cards, actual focus, detail cancellation and a stable return after playback', async ({ page }) => {
    const errors = await setup(page);
    await expect(cards(page)).toHaveCount(4);
    await expect(cards(page).first()).toBeFocused();
    await expect(cards(page).locator('img')).toHaveCount(4);
    await expect(page.locator('.tv-grid img[src^="blob:"]')).toHaveCount(4);
    await expect(page.locator('.tv-grid img[onerror]')).toHaveCount(0);
    await page.screenshot({ path: '.local/u1-home.png' });
    await page.keyboard.press('ArrowRight');
    await expect(cards(page).nth(1)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: '播放', exact: true })).toBeFocused();
    await page.screenshot({ path: '.local/u1-detail.png' });
    await page.keyboard.press('Escape');
    await expect(cards(page).nth(1)).toBeFocused();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: '播放', exact: true }).click();
    await expect(page.getByRole('button', { name: '暂停 / 继续', exact: true })).toBeEnabled();
    expect((await snapshot(page)).state).toBe('PLAYING');
    await page.getByRole('button', { name: '返回原卡', exact: true }).click();
    await expect(cards(page).nth(1)).toBeFocused();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(errors).toEqual([]);
});
test('U1 first-column left and Back enter navigation; top switching restores the content anchor without a stack of pages', async ({ page }) => {
    await setup(page);
    await expect(cards(page)).toHaveCount(4);
    await cards(page).nth(2).focus();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: '首页', exact: true })).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(cards(page).nth(2)).toBeFocused();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: '我的', exact: true }).click();
    await expect(page.getByRole('heading', { name: '我的', exact: true })).toBeVisible();
    if(!(await page.locator('[data-focus-id=nav-library]').evaluate(node=>node===document.activeElement)))await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await expect(cards(page).nth(2)).toBeFocused();
    await cards(page).first().focus();
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByRole('button', { name: '首页', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toContainText('退出 BiliSofa');
    await page.getByRole('button', { name: '继续使用' }).click();
    await expect(page.getByRole('button', { name: '首页', exact: true })).toBeFocused();
});
test('U1 failed artwork keeps selectable text and never turns into executable outside markup', async ({ page }) => {
    await setup(page, 'bad-art');
    await expect(cards(page)).toHaveCount(4);
    await expect(cards(page).locator('img')).toHaveCount(0);
    await cards(page).first().click();
    await expect(page.getByRole('heading', { name: '<img src=x>合成视频0' })).toBeVisible();
    await expect(page.locator('.tv-detail img')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(cards(page).first()).toBeFocused();
});
test('U1 a failed first read exposes refresh and usable navigation, with no retry storm', async ({ page }) => {
    let count = 0;
    page.on('request', r => { if (r.url().endsWith('/native/probe.js'))
        count++; });
    await setup(page, 'read-failed');
    await expect(page.locator('.tv-status')).toContainText('视频暂未加载');
    await expect(cards(page)).toHaveCount(0);
    await expect(page.getByRole('button', { name: '刷新', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: '我的', exact: true }).click();
    await expect(page.getByRole('button', { name: '本机播放队列', exact: true })).toBeEnabled();
    expect(count).toBeLessThanOrEqual(2);
});
test('U1 explicit continue/from-start does not open a second resume prompt, and Home closes the media owner', async ({ page }) => {
    await setup(page);
    await expect(cards(page)).toHaveCount(4);
    await cards(page).first().click();
    await page.getByRole('button', { name: '播放', exact: true }).click();
    await expect(page.getByRole('button', { name: '暂停 / 继续', exact: true })).toBeEnabled();
    await tick(page, 4000);
    await page.getByRole('button', { name: '返回原卡', exact: true }).click();
    await cards(page).first().click();
    await expect(page.getByRole('button', { name: /继续观看 ·/ })).toBeVisible();
    await page.getByRole('button', { name: '从头播放', exact: true }).click();
    await expect(page.getByRole('button', { name: '暂停 / 继续', exact: true })).toBeEnabled();
    await expect(page.locator('[data-focus-id="vod-resume"]')).toHaveCount(0);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await expect.poll(async () => (await snapshot(page)).state).toBe('NONE');
    await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('U1 search uses local initials, real search Worker paging and returns to the same search card', async ({ page }) => {
    await setup(page);
    await expect(cards(page)).toHaveCount(4);
    await page.getByRole('button', { name: '搜索', exact: true }).click();
    await page.getByRole('button', { name: '输入关键词', exact: true }).click();
    await page.keyboard.press('n');
    await page.keyboard.press('h');
    await expect(page.locator('[data-focus-id="keyword-candidate-0"]')).toHaveText('你好');
    await page.locator('[data-focus-id="keyword-candidate-0"]').click();
    await page.getByRole('button', { name: '确认关键词并搜索', exact: true }).click();
    await expect(cards(page)).toHaveCount(4);
    await expect(page.locator('.tv-status')).toContainText('你好');
    await page.getByRole('button', { name: '下一页', exact: true }).click();
    await expect(page.locator('.tv-status')).toContainText('第 2 页');
    await page.getByRole('button', { name: '上一页', exact: true }).click();
    await expect(page.locator('.tv-status')).toContainText('第 1 页');
    await cards(page).nth(1).click();
    await page.keyboard.press('Escape');
    await expect(cards(page).nth(1)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: '搜索', exact: true })).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(cards(page).nth(1)).toBeFocused();
});
test('U1 public image requests omit credentials/referrers, cap concurrent work and revoke owned blob URLs on navigation', async ({ page }) => {
    await page.addInitScript(() => { const fetchOriginal = globalThis.fetch.bind(globalThis), created = new Set<string>(); const operations: {
        credentials: RequestCredentials | undefined;
        redirect: RequestRedirect | undefined;
        referrerPolicy: ReferrerPolicy | undefined;
    }[] = []; let active = 0, peak = 0; globalThis.fetch = async (input, init) => { if (!String(input).startsWith('https://i0.hdslb.com/'))
        return fetchOriginal(input, init); operations.push({ credentials: init?.credentials, redirect: init?.redirect, referrerPolicy: init?.referrerPolicy }); active++; peak = Math.max(peak, active); try {
        return await fetchOriginal(input, init);
    }
    finally {
        active--;
    } }; const create = URL.createObjectURL, revoke = URL.revokeObjectURL; URL.createObjectURL = function (blob) { const url = create.call(URL, blob); created.add(url); return url; }; URL.revokeObjectURL = function (url) { created.delete(url); revoke.call(URL, url); }; Object.assign(globalThis, { artFixture: { snapshot: () => ({ operations, peak, live: created.size }) } }); });
    await setup(page);
    await expect(cards(page).locator('img')).toHaveCount(4);
    const read = () => page.evaluate(() => (globalThis as unknown as {
        artFixture: {
            snapshot(): {
                operations: unknown[];
                peak: number;
                live: number;
            };
        };
    }).artFixture.snapshot());
    const before = await read();
    expect(before.peak).toBeLessThanOrEqual(2);
    expect(before.operations).toHaveLength(4);
    for (const operation of before.operations)
        expect(operation).toEqual({ credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer' });
    await page.getByRole('button', { name: '我的', exact: true }).click();
    await expect.poll(async () => (await read()).live).toBe(0);
});
