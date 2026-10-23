import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VodNativeApi, type VodApiNative } from '../../platform/wasm-network/src/vod-native-api.ts';
import { selectVodPlan } from '../../packages/bili-client/src/vod-catalog.ts';
import type { PrivateAccount } from '../../packages/contracts/src/private-account.ts';
const bvid = 'BV0000000001', id = 'a'.repeat(32);
const account: PrivateAccount = { schema: 1, id: 'bili_101', uid: '101', name: '合成身份', expiresAt: Date.now() + 3600000,
  cookieLines: '.bilibili.com\tTRUE\t/\tTRUE\t0\tSESSDATA\tsynthetic-session\n.bilibili.com\tTRUE\t/\tTRUE\t0\tbili_jct\tsynthetic-csrf\n' };
function fixture(options: { mismatch?: boolean; hold?: boolean; unknownClose?: boolean; noClose?: boolean; deadline?: boolean } = {}) {
  const calls: number[] = [], inputs: string[] = [];
  let client!: VodNativeApi, bodyLength = 0, privateCookie = '', inNative = false;
  const heap = new Uint8Array(65536);
  const readInput = () => new TextDecoder().decode(heap.subarray(0, heap.indexOf(0)));
  const video = { id: 16, codecs: 'avc1.64001e', mimeType: 'video/mp4', width: 640, height: 360, frameRate: '30', bandwidth: 500000,
    baseUrl: `https://synthetic.bilivideo.com/v.m4s?deadline=${Math.floor(Date.now() / 1000) + 7200}`, SegmentBase: { Initialization: '0-31', indexRange: '32-900' } };
  const native: VodApiNative = {
    HEAPU8: heap, callMain() { inNative = true; client.receive('VODAPI:ready'); inNative = false; },
    _vod_input_ptr: () => 0, _vod_input_capacity: () => 4096, _vod_body_ptr: () => 8192, _vod_body_length: () => bodyLength,
    _vod_http_status: () => calls.at(-1) === 3 ? 206 : 200, _vod_curl_status: () => 0,
    _vod_response_clear() { heap.fill(0, 8192); bodyLength = 0; },
    _vod_import_cookies() { assert.equal(inNative, false); privateCookie = readInput(); heap.fill(0, 0, 4097); return 1; },
    _vod_begin(operation) {
      assert.equal(inNative, false); calls.push(operation); inputs.push(readInput());
      if (options.hold) return 1;
      if (options.deadline) { inNative = true; client.receive('VODAPI:deadline'); client.receive('VODAPI:closed'); inNative = false; return 1; }
      const value = operation === 0 ? { code: privateCookie ? 0 : -101, data: { isLogin: !!privateCookie, ...(privateCookie ? { mid: options.mismatch ? 202 : 101 } : {}),
        wbi_img: { img_url: 'https://i0.hdslb.com/bfs/wbi/' + 'a'.repeat(32) + '.png', sub_url: 'https://i0.hdslb.com/bfs/wbi/' + 'b'.repeat(32) + '.png' } } } :
        operation === 1 ? { code: 0, data: { bvid, cid: 111, state: 0, title: '合成视频', owner: { name: '合成UP' }, rights: { pay: 0, ugc_pay: 0, is_stein_gate: 0 }, pages: [
          { cid: 111, page: 1, from: 'vupload', part: '合成P1', duration: 80 }, { cid: 222, page: 2, from: 'vupload', part: '合成P2', duration: 95 }] } } :
        { code: 0, data: { timelength: 95000, dash: { duration: 95, video: [video], audio: [{ ...video, id: 30216, codecs: 'mp4a.40.2', mimeType: 'audio/mp4', bandwidth: 64000 }] } } };
      const bytes = new TextEncoder().encode(JSON.stringify(value)); heap.set(bytes, 8192); bodyLength = bytes.length;
      inNative = true; client.receive(`VODAPI:response:${operation}`); inNative = false; return 1;
    },
    _vod_source_valid: () => 1, _vod_source_total: () => 160000,
    _vod_stop() { privateCookie = ''; heap.fill(0); bodyLength = 0; if (!options.noClose) client.receive(options.unknownClose ? 'VODAPI:unclosed' : 'VODAPI:closed'); },
  };
  client = new VodNativeApi(native, 25);
  return { client, calls, inputs, heap, native };
}
test('W04 native catalog binds identity and selected P, defers C-stack reentry and closes before returning private metadata', async () => {
  const f = fixture(), result = await f.client.catalog(bvid, 2, id, new AbortController().signal, account);
  assert.deepEqual(f.calls, [0, 1, 2]); assert.match(f.inputs[2]!, /^BV0000000001\|222\|/); assert.equal(result.catalog.summary.item.part, 2);
  assert.ok(!JSON.stringify(result.catalog.summary).includes('deadline=')); assert.ok(f.heap.every(v => v === 0));
  const plan = selectVodPlan(result.catalog, { catalogId: id, videoKey: 'v0', audioKey: 'a0' }, { video: ['avc'], audio: ['aac'], qualities: [16], maxWidth: 640, maxHeight: 640, maxFps: 30, rates: [1, 2] });
  assert.deepEqual(await f.client.inspect(plan, new AbortController().signal), { video: 160000, audio: 160000 }); assert.deepEqual(f.calls, [0, 1, 2, 3, 3]);
});
test('W04 identity mismatch cannot advance into view/playurl and native cleanup still completes', async () => {
  const f = fixture({ mismatch: true }); await assert.rejects(f.client.catalog(bvid, 1, id, new AbortController().signal, account), { code: 'login' });
  assert.deepEqual(f.calls, [0]); assert.ok(f.heap.every(v => v === 0));
});
test('W04 same-stack native deadline and close are distinct frames, not reentry or an unknown-cleanup false failure', async () => {
  const f = fixture({ deadline: true }); await assert.rejects(f.client.catalog(bvid, 1, id, new AbortController().signal), { code: 'timeout' });
  assert.ok(f.heap.every(v => v === 0));
});
test('W04 cancelled read drains actual native close and late unclosed/timeout permanently blocks reuse', async () => {
  const f = fixture({ hold: true }), controller = new AbortController();
  const pending = f.client.catalog(bvid, 1, id, controller.signal);
  await new Promise(resolve => setImmediate(resolve)); controller.abort(); await assert.rejects(pending, { code: 'cancelled' });
  assert.ok(f.heap.every(v => v === 0));
  for (const options of [{ unknownClose: true }, { noClose: true }]) {
    const failed = fixture(options);
    await assert.rejects(failed.client.catalog(bvid, 2, id, new AbortController().signal), { code: 'unknown' });
    failed.client.receive('VODAPI:closed');
    await assert.rejects(failed.client.catalog(bvid, 2, id, new AbortController().signal), { code: 'unknown' });
  }
});
test('W04 missing native response is bounded and only a real close acknowledgement permits a later explicit read', async () => {
  const f = fixture({ hold: true });
  await assert.rejects(f.client.catalog(bvid, 1, id, new AbortController().signal), { code: 'timeout' });
  assert.ok(f.heap.every(v => v === 0));
  // This is an explicit next read, with a newly opened native batch, never an automatic retry.
  await assert.rejects(f.client.catalog(bvid, 1, id, new AbortController().signal), { code: 'timeout' });
  assert.deepEqual(f.calls, [0, 0]);
});
