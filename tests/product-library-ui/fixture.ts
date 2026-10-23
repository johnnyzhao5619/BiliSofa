import { expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import {deflateSync} from 'node:zlib';
import { setup as mediaSetup } from '../w04-media-ui/fixture.ts';
const identity = readFileSync('tests/identity-ui/native-fixture.js', 'utf8').replace('__VARIANT__', 'normal');
const native = { watchlater: readFileSync('tests/library-ui/native-fixture.js', 'utf8'), history: readFileSync('tests/history-ui/native-fixture.js', 'utf8'), folders: readFileSync('tests/favorites-ui/native-fixture.js', 'utf8') };
export const bv = 'BV0000000001';
function raster():Buffer{const crc=(data:Buffer)=>{let value=0xffffffff;for(const byte of data){value^=byte;for(let i=0;i<8;i++)value=value&1?(value>>>1)^0xedb88320:value>>>1;}return(value^0xffffffff)>>>0;};const chunk=(type:string,data:Buffer)=>{const b=Buffer.alloc(data.length+12);b.writeUInt32BE(data.length);b.write(type,4);data.copy(b,8);b.writeUInt32BE(crc(b.subarray(4,-4)),b.length-4);return b;};const header=Buffer.alloc(13);header.writeUInt32BE(2);header.writeUInt32BE(2,4);header[8]=8;header[9]=2;return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.from([0,40,90,130,40,90,130,0,40,90,130,40,90,130]))),chunk('IEND',Buffer.alloc(0))]);}

export async function setup(page: Page, records = true) {
  let lane: keyof typeof native = 'watchlater', variant = 'normal', reads = 0;
  await page.route('**/recommend/manifest.json', r => r.fulfill({ body: '{}' }));
  await page.route('**/recommend/probe.js', r => r.fulfill({ contentType: 'text/javascript', body: readFileSync('tests/recommend-ui/native-fixture.js', 'utf8').replace('__VARIANT__', 'normal') }));
  await page.route('**/identity/manifest.json', r => r.fulfill({ body: '{}' }));
  await page.route('**/identity/probe.js', r => r.fulfill({ contentType: 'text/javascript', body: identity }));
  await page.route('**/library/manifest.json', r => r.fulfill({ body: '{}' }));
  await page.route('https://i0.hdslb.com/**',r=>r.fulfill({contentType:'image/png',headers:{'Access-Control-Allow-Origin':'*'},body:raster()}));
  await page.route('**/library/probe.js', r => { reads++; return r.fulfill({ contentType: 'text/javascript', body: native[lane].replace('__VARIANT__', variant).replace('arc_info:i===3?null:{title',"arc_info:i===3?null:{pic:'https://i0.hdslb.com/bfs/archive/library.png',title") }); });
  await page.addInitScript(({ bv, records }) => {
    if (!localStorage.getItem('product-library-seeded')) {
      localStorage.setItem('product-library-seeded', 'yes');
      if (records) {
        const point = { bvid: bv, part: 1, timeMs: 2000, durationMs: 8000, updatedAt: 1 };
        localStorage.setItem('bilisofa.local.v1.guest', JSON.stringify({ schema: 1, preferences: { resumePrompt: true, jumpSeconds: 10 }, resume: [point] }));
        localStorage.setItem('bilisofa.parts.v1.guest', JSON.stringify({ schema: 1, resume: [{ ...point, part: 2, timeMs: 3000, durationMs: 9000, updatedAt: 2 }] }));
        localStorage.setItem('bilisofa.resume-labels.v1.guest', JSON.stringify({ schema: 1, items: [{ bvid: bv, part: 1, title: '合成完整视频', partTitle: '第一P', updatedAt: 1 }, { bvid: bv, part: 2, title: '合成完整视频', partTitle: '第二P', updatedAt: 2 }] }));
        localStorage.setItem('bilisofa.queue.v2.guest', JSON.stringify({ schema: 2, continuous: false, items: [{ bvid: bv, title: '合成完整视频', part: 1 }, { bvid: bv, title: '合成完整视频', part: 2 }] }));
      }
      localStorage.setItem('bilisofa.w01.progress-once.v1', 'unknown');
    }
    const secret = JSON.stringify({ schema: 1, id: 'bili_101', uid: '101', name: '合成账号', expiresAt: Date.now() + 600000, cookieLines: '.bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic-only\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\tsynthetic-csrf\n.bilibili.com\tTRUE\t/\tTRUE\t0\tDedeUserID\t101\n' });
    Object.assign(globalThis, { tizen: { keymanager: { getData({ name }: {
            name: string;
          }) { if (name !== 'bilisofa.session.v1.slot0')
            throw { name: 'NotFoundError' }; return secret; }, saveData() { throw Error('fixture.write_forbidden'); }, removeData() { throw Error('fixture.delete_forbidden'); } } } });
  }, { bv, records });
  const errors = await mediaSetup(page, false);
  return { errors, mode: (next: keyof typeof native, value = 'normal') => { lane = next; variant = value; }, reads: () => reads };
}
export const cards = (p: Page) => p.locator('#pages .tv-library-grid button');
export async function library(p: Page) { await p.getByRole('button', { name: '我的', exact: true }).click(); await expect(p.getByRole('heading', { name: '我的', exact: true })).toBeVisible(); }
export async function use(p: Page) { await p.getByRole('button', { name: '账号', exact: true }).click(); await p.getByRole('button', { name: '使用 合成账号', exact: true }).click(); await expect(p.locator('[data-focus-id=nav-home]')).toHaveAttribute('aria-current', 'page'); }
export async function home(p: Page, value: boolean) { await p.evaluate(value => { Object.defineProperty(document, 'hidden', { configurable: true, value }); document.dispatchEvent(new Event('visibilitychange')); }, value); }
