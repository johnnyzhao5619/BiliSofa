import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NvaDecoder, encodeNvaFrame, nvaControl } from '../../packages/cast/src/nva.ts';
import { CastSession } from '../../packages/cast/src/session.ts';
const hex = (s: string) => new Uint8Array(Buffer.from(s, 'hex'));
// Anonymous vectors written from the published candidate frame layout.
const pause = hex('e002000000010107436f6d6d616e64055061757365');
const seek = hex('e003000000040107436f6d6d616e64045365656b0000000c7b227365656b5473223a357d');
test('W01/F20 candidate wire vectors round trip commands, responses and heartbeat without identities', () => {
  const d = new NvaDecoder(), frames = d.push(new Uint8Array([...pause, ...seek, ...hex('c001000000030000000c7b22766f6c756d65223a317d'), ...hex('e400ffffffff')]));
  assert.deepEqual(frames, [{ kind: 'command', sequence: 1, method: 'Pause' }, { kind: 'command', sequence: 4, method: 'Seek', data: { seekTs: 5 } }, { kind: 'response', sequence: 3, data: { volume: 1 } }, { kind: 'ping', sequence: 0xffffffff }]);
  assert.deepEqual(encodeNvaFrame(frames[0]!), pause); assert.deepEqual(encodeNvaFrame(frames[1]!), seek); d.finish();
});
test('W01/F20 candidate accepts every byte split and coalescing; input mutation cannot alter owned partial bytes', () => {
  for (let split = 0; split <= seek.length; split++) {
    const d = new NvaDecoder(), a = seek.slice(0, split), b = seek.slice(split), frames = d.push(a); a.fill(0);
    frames.push(...d.push(b)); assert.deepEqual(frames, [{ kind: 'command', sequence: 4, method: 'Seek', data: { seekTs: 5 } }]); d.finish();
  }
  const d = new NvaDecoder(), result = [...seek].flatMap(byte => d.push(new Uint8Array([byte]))); assert.equal(result.length, 1); d.finish();
});
test('W01/F20 malformed frame, oversized length, incomplete close and invalid UTF-8 poison the connection without resynchronizing', () => {
  const badFlag = pause.slice(); badFlag[1] = 0xff;
  const badTag = pause.slice(); badTag[8] = 0;
  const badMethod = pause.slice(); badMethod[16] = 13;
  const huge = seek.slice(0, 24); new DataView(huge.buffer).setUint32(20, 0xffffffff);
  const badUtf = seek.slice(); badUtf[25] = 0xff;
  for (const bytes of [hex('000000000000'), badFlag, badTag, badMethod, huge, badUtf, new Uint8Array(8193)]) {
    const d = new NvaDecoder(); assert.throws(() => d.push(bytes), /invalid/); assert.throws(() => d.push(pause), /unknown/);
  }
  const d = new NvaDecoder(); d.push(seek.slice(0, -1)); assert.throws(() => d.finish(), /invalid/); assert.throws(() => d.push(pause), /unknown/);
});
test('W01/F20 JSON budgets reject primitives, deep trees, prototype keys and excessive frame batches', () => {
  const frame = (json: string) => { const data = new TextEncoder().encode(json), bytes = new Uint8Array(10 + data.length); bytes.set(hex('c00100000001')); new DataView(bytes.buffer).setUint32(6, data.length); bytes.set(data, 10); return bytes; };
  for (const json of ['[]', 'null', '{"__proto__":{}}', '{"x":1e999}', '{"x":"' + 'x'.repeat(1025) + '"}', '{"x":' + '['.repeat(9) + '0' + ']'.repeat(9) + '}', '{"x":[' + '0,'.repeat(130) + '0]}']) assert.throws(() => new NvaDecoder().push(frame(json)), /invalid/);
  assert.throws(() => new NvaDecoder().push(new Uint8Array(Array.from({ length: 17 }, () => [...pause]).flat())), /invalid/);
  assert.equal(new NvaDecoder().push(new Uint8Array(Array.from({ length: 16 }, () => [...pause]).flat())).length, 16);
  assert.throws(() => encodeNvaFrame({ kind: 'ping', sequence: 0x100000000 }), /invalid/);
});
test('W01/F20 narrow control mapping retains sender approval and replay guard; sending danmaku or account writes is denied', () => {
  const session = new CastSession(), d = new NvaDecoder(), [p, s] = d.push(new Uint8Array([...pause, ...seek]));
  assert.deepEqual(nvaControl(s!), { type: 'seek', timeMs: 5000 });
  assert.throws(() => session.command('phone', 's', p!.sequence, nvaControl(p!)), /permission/);
  session.accept('phone', 's', true); assert.deepEqual(session.command('phone', 's', p!.sequence, nvaControl(p!)), { type: 'pause' });
  assert.throws(() => session.command('phone', 's', p!.sequence, nvaControl(p!)), /invalid/);
  session.transfer('remote'); assert.throws(() => session.command('phone', 's', 4, nvaControl(s!)), /permission/);
  for (const method of ['SendDanmaku', 'Like', 'LoginWithCode', 'Play', 'GetVolume']) assert.throws(() => nvaControl({ kind: 'command', sequence: 2, method }), /permission/);
  assert.throws(() => nvaControl({ kind: 'command', sequence: 2, method: 'Pause', data: { url: 'https://outside.invalid' } }), /permission/);
  assert.throws(() => nvaControl({ kind: 'command', sequence: 2, method: 'Seek', data: { seekTs: 1, token: 'synthetic' } }), /invalid/);
});
