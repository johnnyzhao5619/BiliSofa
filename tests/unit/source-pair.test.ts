import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DomainError } from '../../packages/contracts/src/index.ts';
import { VodCheckError, VodNativeApi, type VodApiNative } from '../../platform/wasm-network/src/vod-native-api.ts';
import type { PrivateVodPlan } from '../../packages/contracts/src/vod-private.ts';

const deadline = Math.floor(Date.now() / 1000) + 7200;
const url = (host: string, name: string) => `https://${host}/upgcxcode/${name}.m4s?e=x&deadline=${deadline}`;
const plan = { video: { url: url('upos-sz-mirrorcosov.bilivideo.com', 'v') }, audio: { url: url('upos-sz-mirrorcosov.bilivideo.com', 'a') } } as unknown as PrivateVodPlan;
type Leg = { http: number; curl: number; valid: number; total: number };
const good = (total: number): Leg => ({ http: 206, curl: 0, valid: 1, total });

/** Synthetic ADR-112 source module: both legs answer together with one VODAPI:pair frame, or the session ends. */
function module(legs: [Leg, Leg] | 'deadline', options: { pair?: boolean } = {}) {
  const heap = new Uint8Array(16384), calls: string[] = [], set: string[] = [];
  let client!: VodNativeApi, current: [Leg, Leg] | undefined;
  const input = () => new TextDecoder().decode(heap.subarray(0, heap.indexOf(0)));
  const native: VodApiNative = {
    HEAPU8: heap, callMain() { calls.push('main'); client.receive('VODAPI:ready'); },
    _vod_input_ptr: () => 0, _vod_input_capacity: () => 4096, _vod_body_ptr: () => 8192, _vod_body_length: () => 0,
    _vod_http_status: () => 206, _vod_curl_status: () => 0, _vod_response_clear() {}, _vod_import_cookies: () => 1,
    _vod_begin(operation) { calls.push('begin:' + operation); client.receive('VODAPI:response:' + operation); return 1; },
    _vod_source_valid: () => 1, _vod_source_total: () => 4096,
    _vod_stop() { calls.push('stop'); client.receive('VODAPI:closed'); },
    ...(options.pair === false ? {} : {
      _vod_pair_set(leg: number) { set.push(`${leg}:${new URL(input()).pathname}`); heap.fill(0, 0, 4097); return 1; },
      _vod_pair_begin() {
        calls.push('pair');
        if (legs === 'deadline') { client.receive('VODAPI:deadline'); client.receive('VODAPI:closed'); return 1; }
        current = legs; client.receive('VODAPI:pair'); return 1;
      },
      _vod_pair_http: (leg: number) => current![leg]!.http, _vod_pair_curl: (leg: number) => current![leg]!.curl,
      _vod_pair_valid: (leg: number) => current![leg]!.valid, _vod_pair_total: (leg: number) => current![leg]!.total,
      _vod_pair_clear() { calls.push('clear'); },
    }),
  };
  client = new VodNativeApi(native, 25);
  return { client, calls, set };
}
const signal = () => new AbortController().signal;

test('ADR-112 a source module with the pair checks both tracks in one request and closes before returning', async () => {
  const m = module([good(160000), good(32000)]);
  assert.deepEqual(await m.client.inspect(plan, signal()), { video: 160000, audio: 32000 });
  assert.deepEqual(m.calls, ['main', 'pair', 'clear', 'stop']); assert.deepEqual(m.set, ['0:/upgcxcode/v.m4s', '1:/upgcxcode/a.m4s']);
});

test('ADR-112 one failed leg names only its track and keeps the other total; both failed name both', async () => {
  const one = module([good(160000), { http: 504, curl: 0, valid: 0, total: 0 }]);
  await assert.rejects(one.client.inspect(plan, signal()), (e: unknown) => e instanceof VodCheckError && e.track === 1 && e.http === 504 &&
    e.failures.length === 1 && e.known.video === 160000 && e.known.audio === undefined);
  const both = module([{ http: 0, curl: 28, valid: 0, total: 0 }, { http: 0, curl: 7, valid: 0, total: 0 }]);
  await assert.rejects(both.client.inspect(plan, signal()), (e: unknown) => e instanceof VodCheckError && e.track === 0 &&
    JSON.stringify(e.failures) === JSON.stringify([{ track: 0, code: 'network', http: 0, transport: 28 }, { track: 1, code: 'network', http: 0, transport: 7 }]) && Object.keys(e.known).length === 0);
  const lost = module('deadline');
  await assert.rejects(lost.client.inspect(plan, signal()), (e: unknown) => e instanceof VodCheckError && e.code === 'timeout' && e.failures.map(f => f.track).join() === '0,1');
});

test('ADR-112 a leg that answered but is not a valid 512-byte source stays invalid, never a line switch', async () => {
  const m = module([good(160000), { http: 206, curl: 0, valid: 0, total: 0 }]);
  await assert.rejects(m.client.inspect(plan, signal()), (e: unknown) => e instanceof DomainError && !(e instanceof VodCheckError) && e.code === 'invalid');
});

test('ADR-112 known totals are not checked again; a module without the pair checks one track at a time', async () => {
  const m = module([good(160000), good(32000)]);
  assert.deepEqual(await m.client.inspect(plan, signal(), { video: 160000 }), { video: 160000, audio: 4096 });
  assert.deepEqual(m.calls, ['main', 'begin:3', 'stop'], 'only the audio check, through the single path');
  const old = module([good(1), good(1)], { pair: false });
  assert.deepEqual(await old.client.inspect(plan, signal()), { video: 4096, audio: 4096 }); assert.deepEqual(old.calls, ['main', 'begin:3', 'begin:3', 'stop']);
});
