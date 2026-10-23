import { type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { setup } from '../w04-media-ui/fixture.ts';
const native = readFileSync('tests/w05-product-ui/overlay-native-fixture.js', 'utf8');
function uint(n: number): number[] { const result: number[] = []; do { const b = n & 127; n = Math.floor(n / 128); result.push(b | (n ? 128 : 0)); } while (n); return result; }
function number(k: number, n: number) { return [...uint(k * 8), ...uint(n)]; }
function string(k: number, s: string) { const bytes = [...new TextEncoder().encode(s)]; return [...uint(k * 8 + 2), ...uint(bytes.length), ...bytes]; }
function segment(index = 1) { const body = [...number(2, (index - 1) * 360000 + 1000), ...number(3, 1), ...number(5, 0xffffff), ...string(7, `真实链路合成弹幕${index}`), ...string(12, String(index))]; return Buffer.from([10, ...uint(body.length), ...body]); }
export async function overlay(page: Page, variant: 'normal' | 'empty' | 'fail' | 'slow' | 'sparse' = 'normal') {
  const calls: number[] = [], parts: number[] = [];
  await page.route('**/overlay-read/probe.js', route => route.fulfill({ contentType: 'text/javascript', body: native.replace('__CLOSE_DELAY__', variant === 'slow' ? '1000' : '0') }));
  await page.route('**/synthetic-overlay-api', async route => {
    const { operation, value } = route.request().postDataJSON() as { operation: number; value: string }; calls.push(operation);
    if (operation === 4) parts.push(Number(value.split('|')[1]));
    if (variant === 'fail' && operation === 4) { await route.fulfill({ status: 412, body: 'refused' }); return; }
    if (operation === 6) { await route.fulfill({ body: variant === 'empty' ? Buffer.alloc(0) : segment(Number(value.split('|')[2])), contentType: 'application/octet-stream' }); return; }
    const lang = value.includes('english') ? 'EN' : '中文';
    const body = operation === 0 ? { code: -101, data: { isLogin: false, wbi_img: { img_url: 'https://i0.hdslb.com/bfs/wbi/' + 'a'.repeat(32) + '.png', sub_url: 'https://i0.hdslb.com/bfs/wbi/' + 'b'.repeat(32) + '.png' } } } :
      operation === 1 ? { code: 0, data: { bvid: value, aid: 123, cid: 111, state: 0, title: '合成', owner: { name: '合成' }, rights: { pay: 0, ugc_pay: 0, is_stein_gate: 0 }, pages: [{ cid: 111, page: 1, from: 'vupload', part: 'P1', duration: 800 }, { cid: 222, page: 2, from: 'vupload', part: 'P2', duration: 800 }] } } :
      operation === 4 ? { code: 0, data: { bvid: value.split('|')[0], aid: 123, cid: Number(value.split('|')[1]), subtitle: { subtitles: variant === 'empty' ? [] : [{ lan: 'zh-CN', lan_doc: '简体中文', subtitle_url: 'https://aisubtitle.hdslb.com/bfs/subtitle/chinese.json' }, { lan: 'en', lan_doc: 'English', subtitle_url: 'https://aisubtitle.hdslb.com/bfs/subtitle/english.json' }] } } } :
      { body: [{ from: 0, to: 800, content: lang + ' <script>纯文本</script>\n第二行' }] };
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  });
  const errors = await setup(page, true, 'package', false, variant === 'sparse' ? 1000 : 100); return { calls, parts, errors };
}
