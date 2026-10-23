import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeDanmakuSegment, parsePlayerMetadata, parseSubtitleBody, subtitleSource } from '../../packages/bili-client/src/overlay-data.ts';
import { parseOverlayCommand, parseOverlayRequest, parseOverlayResult, parseOverlayValue } from '../../packages/contracts/src/overlay-read.ts';
import { OverlayNativeApi } from '../../platform/wasm-network/src/overlay-native-api.ts';
import type { VodApiNative } from '../../platform/wasm-network/src/vod-native-api.ts';
const url = 'https://aisubtitle.hdslb.com/bfs/subtitle/synthetic.json?auth_key=synthetic', bvid = 'BV0000000001';
const account = { schema: 1 as const, id: 'bili_101', uid: '101', name: '合成', expiresAt: Date.now() + 600000, cookieLines: '.bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\t' + 'a'.repeat(32) + '\n.bilibili.com\tTRUE\t/\tTRUE\t0\tDedeUserID\t101\n' };
const track = { key: 's0', language: 'zh-CN', label: '中文', automatic: false };
function metadata(cid = 222) { return { code: 0, data: { bvid, aid: 123, cid, subtitle: { subtitles: [{ lan: 'zh-CN', lan_doc: '中文', subtitle_url: url, ai_type: 0 }] } } }; }
function uint(value: bigint | number): number[] { let n = BigInt(value); const bytes: number[] = []; do { const b = Number(n & 127n); n >>= 7n; bytes.push(b | (n ? 128 : 0)); } while (n); return bytes; }
function number(field: number, n: number | bigint) { return [...uint(field * 8), ...uint(n)]; }
function bytes(field: number, v: number[]) { return [...uint(field * 8 + 2), ...uint(v.length), ...v]; }
function string(field: number, v: string) { return bytes(field, [...new TextEncoder().encode(v)]); }
function element(mode: number, id: string, content = '<script>普通文字</script>', progress = 1500) { return bytes(1, [...number(2, progress), ...number(3, mode), ...number(5, 0xffffff), ...string(7, content), ...string(12, id)]); }
test('W05 primary protobuf schema decodes uint64-string IDs and ordinary modes while ignoring arbitrary-code modes', () => {
  const input = new Uint8Array([...element(1, '18446744073709551615'), ...element(4, '2'), ...element(5, '3'), ...element(7, '4', 'x'.repeat(6000)), ...element(9, '5'), ...bytes(5, [0, 1, 2])]);
  const values = decodeDanmakuSegment(input); assert.equal(values.length, 3); assert.deepEqual(values.map(v => v.mode), ['scroll', 'bottom', 'top']); assert.equal(values[0]!.id, '18446744073709551615'); assert.equal(values[0]!.content, '<script>普通文字</script>');
  assert.deepEqual(decodeDanmakuSegment(new Uint8Array()), []);
});
test('W05 protobuf rejects truncated lengths, overflow, unsupported wire groups, duplicate fields/IDs and malformed text', () => {
  for (const input of [[10, 10, 1], [0], [11], [128, 128, 128, 128, 128, 128, 128, 128, 128, 2], [...element(1, '1'), ...element(1, '1')], bytes(1, [...number(3, 1), ...number(3, 1)]), bytes(1, [...number(3, 1), ...bytes(7, [255]), ...string(12, '1')])]) assert.throws(() => decodeDanmakuSegment(new Uint8Array(input)), { code: 'invalid' });
});
test('W05 metadata binds source identity and exposes language keys without raw subtitle URLs', () => {
  const value = parsePlayerMetadata(JSON.stringify(metadata()), { bvid, cid: '222', aid: '123' }); assert.deepEqual(value.tracks[0]!.summary, track); assert.equal(value.tracks[0]!.url, url);
  const publicValue = parseOverlayValue({ kind: 'metadata', tracks: value.tracks.map(t => t.summary), loginRequired: false }); assert.ok(!JSON.stringify(publicValue).includes('hdslb')); assert.ok(!JSON.stringify(publicValue).includes('auth_key'));
  for (const binding of [{ bvid, cid: '111', aid: '123' }, { bvid: 'BV0000000002', cid: '222', aid: '123' }, { bvid, cid: '222', aid: '456' }]) assert.throws(() => parsePlayerMetadata(JSON.stringify(metadata()), binding));
  assert.deepEqual(parseSubtitleBody('{"body":[{"from":1.25,"to":2.5,"content":"中文\\n第二行"}]}')[0], { id: 'subtitle-0', startMs: 1250, endMs: 2500, content: '中文\n第二行' });
});
test('W05 subtitle destination policy rejects local/foreign/userinfo/ports/path-normalization and keeps signed query bytes', () => {
  assert.equal(subtitleSource(url), url); assert.equal(subtitleSource('//i0.hdslb.com/bfs/subtitle/test.json?b=2&a=1'), 'https://i0.hdslb.com/bfs/subtitle/test.json?b=2&a=1');
  for (const value of ['http://aisubtitle.hdslb.com/bfs/subtitle/a.json', 'https://127.0.0.1/bfs/subtitle/a.json', 'https://aisubtitle.hdslb.com.outside.invalid/bfs/subtitle/a.json', 'https://a@aisubtitle.hdslb.com/bfs/subtitle/a.json', 'https://aisubtitle.hdslb.com:443/bfs/subtitle/a.json', 'https://aisubtitle.hdslb.com/bfs/subtitle/../subtitle/a.json', 'https://aisubtitle.hdslb.com/bfs/subtitle/a.json#fragment', 'https://aisubtitle.hdslb.com/bfs/subtitle/%2e/a.json']) assert.throws(() => subtitleSource(value));
});
test('W05 read contracts reject caller URLs/credentials, source spoofing and mismatched response shapes', () => {
  const request = { version: 1, operation: 'media-overlay-read', scope: { accountId: 'guest', generation: 1, mediaSessionId: 'one', requestId: 'read1' }, target: { bvid, part: 2 }, command: { kind: 'metadata' } };
  assert.deepEqual(parseOverlayRequest(request), request);
  for (const bad of [{ ...request, target: { bvid, part: 2, url } }, { ...request, account }, { ...request, command: { kind: 'danmaku', segment: 0 } }, { ...request, command: { kind: 'subtitles', track: { ...track, url } } }]) assert.throws(() => parseOverlayRequest(bad));
  assert.throws(() => parseOverlayCommand({ kind: 'send', content: 'forbidden' })); assert.throws(() => parseOverlayResult({ version: 1, operation: request.operation, scope: request.scope, closed: false, kind: 'error', code: 'unknown' }));
});
function fixture(option: 'normal' | 'mismatch' | 'hold' | 'unknown' = 'normal') {
  const heap = new Uint8Array(2097152), calls: number[] = [], inputs: string[] = []; let api!: OverlayNativeApi, length = 0, authenticated = false;
  const native: VodApiNative = { HEAPU8: heap, callMain() { api.receive('VODAPI:ready'); }, _vod_input_ptr: () => 0, _vod_input_capacity: () => 4096, _vod_body_ptr: () => 8192, _vod_body_length: () => length, _vod_http_status: () => 200, _vod_curl_status: () => 0, _vod_import_cookies() { authenticated = true; heap.fill(0, 0, 4097); return 1; }, _vod_response_clear() { heap.fill(0, 8192); length = 0; }, _vod_source_total: () => 0, _vod_source_valid: () => 0,
    _vod_begin(operation) {
      const end = heap.indexOf(0); inputs.push(new TextDecoder().decode(heap.subarray(0, end))); calls.push(operation); if (option === 'hold') return 1;
      const m = metadata(operation === 4 ? Number(inputs.at(-1)!.split('|')[1]) : 222);
      const data = operation === 0 ? { code: authenticated ? 0 : -101, data: { isLogin: authenticated, ...(authenticated ? { mid: option === 'mismatch' ? 202 : 101 } : {}), wbi_img: { img_url: 'https://i0.hdslb.com/bfs/wbi/' + 'a'.repeat(32) + '.png', sub_url: 'https://i0.hdslb.com/bfs/wbi/' + 'b'.repeat(32) + '.png' } } } : operation === 1 ? { code: 0, data: { bvid, aid: 123, cid: 111, state: 0, title: '合成', owner: { name: '合成' }, rights: { pay: 0, ugc_pay: 0, is_stein_gate: 0 }, pages: [{ cid: 111, page: 1, from: 'vupload', part: '1', duration: 20 }, { cid: 222, page: 2, from: 'vupload', part: '2', duration: 20 }] } } : operation === 4 ? m : { body: [{ from: 1, to: 2, content: '<img src=x>' }] };
      const season = { code: 0, result: { season_id: 123, title: '合成季', evaluate: '简介', user_status: { login: authenticated ? 1 : 0, area_limit: 0, follow: 0 }, new_ep: { desc: '第1集' }, episodes: [{ id: 11, ep_id: 11, cid: 111, bvid, title: '1', long_title: '第1集', badge: '', status: 2, duration: 20000, rights: { area_limit: 0 }, showDrmLoginDialog: false, is_view_hide: false }] } };
      const body = operation === 6 ? new Uint8Array(element(1, '123')) : new TextEncoder().encode(JSON.stringify(operation === 7 ? season : data)); heap.set(body, 8192); length = body.length; api.receive('VODAPI:response:' + operation); return 1;
    }, _vod_stop() { authenticated = false; heap.fill(0); length = 0; api.receive(option === 'unknown' ? 'VODAPI:unclosed' : 'VODAPI:closed'); },
  }; api = new OverlayNativeApi(native, 40); return { api, calls, inputs, heap };
}
test('W05 native reads selected P and anonymous subtitle URL only after verified fresh metadata, then closes before return', async () => {
  const f = fixture(); const value = await f.api.read({ bvid, part: 2 }, { kind: 'subtitles', track }, new AbortController().signal, '222', account);
  assert.deepEqual(f.calls, [0, 1, 4, 5]); assert.match(f.inputs[2]!, /^BV0000000001\|222\|/); assert.equal(f.inputs[3], url); assert.equal(value.kind, 'subtitles'); assert.ok(!JSON.stringify(value).includes('auth_key')); assert.ok(f.heap.every(v => v === 0));
});
test('W05 native signed segment read decodes only normalized text and rejects another account UID before source lookup', async () => {
  const f = fixture(); const result = await f.api.read({ bvid, part: 2 }, { kind: 'danmaku', segment: 2 }, new AbortController().signal, '222');
  assert.deepEqual(f.calls, [0, 1, 6]); assert.match(f.inputs[2]!, /^222\|123\|2\|/); assert.equal(result.kind === 'danmaku' ? result.items.length : -1, 1); assert.ok(f.heap.every(v => v === 0));
  const bad = fixture('mismatch'); await assert.rejects(bad.api.read({ bvid, part: 2 }, { kind: 'metadata' }, new AbortController().signal, '222', account), { code: 'login' }); assert.deepEqual(bad.calls, [0]);
});
test('W05 abort waits the real close frame; unconfirmed native close never yields a successful result', async () => {
  const f = fixture('hold'), controller = new AbortController(), read = f.api.read({ bvid, part: 2 }, { kind: 'metadata' }, controller.signal, '222'); setTimeout(() => controller.abort(), 3); await assert.rejects(read, { code: 'cancelled' }); assert.ok(f.heap.every(v => v === 0));
  const bad = fixture('unknown'); await assert.rejects(bad.api.read({ bvid, part: 2 }, { kind: 'metadata' }, new AbortController().signal, '222'), { code: 'unknown' });
});
test('W05 refreshed metadata must match the private CID of active playback before any subtitle or danmaku request', async () => {
  const f = fixture(); await assert.rejects(f.api.read({ bvid, part: 2 }, { kind: 'danmaku', segment: 1 }, new AbortController().signal, '111'), { code: 'cancelled' }); assert.deepEqual(f.calls, [0, 1]); assert.ok(f.heap.every(v => v === 0));
});
test('W05 PGC overlay resolves the selected season episode again and checks its actual playback CID', async () => {
  const f = fixture(); const result = await f.api.read({ bvid, part: 1, seasonId: '123' }, { kind: 'subtitles', track }, new AbortController().signal, '111'); assert.equal(result.kind, 'subtitles'); assert.deepEqual(f.calls, [0, 7, 1, 4, 5]); assert.match(f.inputs[3]!, /^BV0000000001\|111\|/);
});
