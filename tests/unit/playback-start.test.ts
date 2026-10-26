import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DomainError, type MediaSource } from '../../packages/contracts/src/index.ts';
import type { VodAccess, VodReadResult } from '../../packages/contracts/src/vod-runtime.ts';
import { parseVideoViewResult } from '../../packages/contracts/src/public-kernel.ts';
import { VodPrefetch } from '../../apps/tv/src/app/vod-prefetch.ts';
import { MediaSession, type OwnedPlayerBackend } from '../../packages/media/src/session.ts';
const flush = () => new Promise<void>(yes => setImmediate(yes));
const until = async (check: () => boolean) => { for (let i = 0; i < 400 && !check(); i++) await new Promise(r => setTimeout(r, 2)); assert.ok(check()); };
/** ADR-110: an access that counts reads and closes; `read` resolves with a marker per call. */
function fakeAccess(log: string[], options: { fail?: boolean; usable?: () => boolean } = {}): VodAccess {
  let reads = 0;
  return {
    read: async query => { reads++; log.push(`read:${query.bvid}:${query.part}:${reads}`); if (options.fail) throw new DomainError('network'); return { marker: reads } as unknown as VodReadResult; },
    transport: () => ({ run: async () => {}, close: async () => {} }),
    close: async () => { log.push('close'); },
    ...(options.usable ? { usable: options.usable } : {}),
  };
}
const q = { bvid: 'BV1xx411c7mD', part: 2 };

test('ADR-110 prefetch: the player gets the same access and read; another item, an old read, a dead access or a failed read are never handed over', async () => {
  const log: string[] = []; let now = 0, opens = 0;
  const open = async () => { opens++; return fakeAccess(log); };
  const p = new VodPrefetch(q, open, () => now);
  await flush(); assert.deepEqual(log, ['read:BV1xx411c7mD:2:1'], 'the read starts while the detail page is shown');
  assert.equal(p.adopt({ ...q, part: 3 }), undefined, 'another part opens its own access');
  const opener = p.adopt(q)!; assert.ok(opener); assert.equal(p.adopt(q), undefined, 'one handover');
  const access = await opener(); assert.deepEqual(await access.read(q, new AbortController().signal), { marker: 1 });
  assert.deepEqual(log, ['read:BV1xx411c7mD:2:1'], 'the player reuses the prefetched read'); await access.read(q, new AbortController().signal); assert.equal(log.length, 2, 'later reads go to the access');
  await p.close(); assert.ok(!log.includes('close'), 'an adopted access belongs to the player now');
  await opener(); assert.equal(opens, 2, 'a second call (reconnect after a timeout) opens a fresh access');
  const stale = new VodPrefetch(q, open, () => now); now = 300000; assert.equal(stale.adopt(q), undefined, 'stream addresses older than five minutes are read again'); await stale.close();
  now = 0; const dead = new VodPrefetch(q, async () => fakeAccess([], { usable: () => false }), () => now); await flush(); assert.equal(dead.adopt(q), undefined, 'a closed or poisoned access is not handed over'); await dead.close();
  const failed = new VodPrefetch(q, async () => fakeAccess([], { fail: true }), () => now); await flush(); await flush(); assert.equal(failed.adopt(q), undefined, 'a failed read is not handed over'); await failed.close();
  const left: string[] = [], unused = new VodPrefetch(q, async () => fakeAccess(left), () => now); await flush(); await unused.close(); assert.ok(left.includes('close'), 'leaving the detail page closes the access');
});

/** A backend whose prepare can honour a start position. */
function backend(calls: string[], options: { startsAt?: boolean; refuseStart?: boolean; ignoreStart?: boolean }) {
  let tick: (ms: number) => void = () => {}, state = 'NONE';
  const value: OwnedPlayerBackend = {
    ...(options.startsAt ? { startsAt: true } : {}),
    prepare: async (_source, onTime, _end, _error, startMs) => { calls.push(startMs === undefined ? 'prepare' : `prepare@${startMs}`); tick = onTime; if (startMs !== undefined && options.refuseStart) throw new DomainError('network'); state = 'READY'; },
    play: () => { calls.push('play'); state = 'PLAYING'; }, pause: () => { state = 'PAUSED'; },
    seek: async ms => { calls.push(`seek@${ms}`); tick(ms); }, close: () => { state = 'NONE'; }, closureConfirmed: () => state === 'NONE', screensaver: () => {}, durationMs: () => 600000,
  };
  return { value, tick: (ms: number) => tick(ms) };
}
async function resume(options: { startsAt?: boolean; refuseStart?: boolean; ignoreStart?: boolean }) {
  const calls: string[] = [], b = backend(calls, options), source: MediaSource = { kind: 'vod', url: 'http://127.0.0.1:40324/' + 'a'.repeat(32) + '/manifest.mpd' };
  const session = new MediaSession({ run: async (_signal, ready) => { ready(source); await new Promise(() => {}); }, close: async () => {} }, () => b.value, () => {}, 2000);
  session.start(120000); await until(() => calls.includes('play'));
  return { calls, session, tick: b.tick };
}
test('ADR-110 resume: prepare at the position when the backend can; otherwise, or after a refusal, prepare at 0 and seek; an ignored position is corrected once', async () => {
  const a = await resume({ startsAt: true }); assert.deepEqual(a.calls, ['prepare@120000', 'play'], 'no buffering at 0 and no seek'); a.tick(120400); await new Promise(r => setTimeout(r, 150)); assert.ok(!a.calls.some(c => c.startsWith('seek'))); await a.session.close();
  const b = await resume({}); assert.deepEqual(b.calls, ['prepare', 'seek@120000', 'play'], 'a backend without the capability keeps the old order'); await b.session.close();
  const c = await resume({ startsAt: true, refuseStart: true }); assert.deepEqual(c.calls, ['prepare@120000', 'prepare', 'seek@120000', 'play'], 'a refused start position falls back'); await c.session.close();
  const d = await resume({ startsAt: true }); d.tick(400); await until(() => d.calls.includes('seek@120000')); assert.equal(d.calls.filter(x => x.startsWith('seek')).length, 1, 'a start near 0 is corrected by one seek'); await d.session.close();
});

test('ADR-110 view result: bounded parts with the full count, fixed failure words only', () => {
  const scope = { accountId: 'guest', generation: 1, mediaSessionId: 'detail', requestId: 'view' };
  const ok = { version: 1, scope, operation: 'public-video-view', closed: true, kind: 'ok', detail: { partCount: 120, parts: Array.from({ length: 48 }, (_, i) => ({ part: i + 1, title: 'P' + (i + 1), durationMs: 60000 })), owner: '合成UP' } };
  assert.equal(parseVideoViewResult(ok).kind, 'ok');
  for (const bad of [{ ...ok, detail: { ...ok.detail, parts: Array.from({ length: 49 }, (_, i) => ({ part: i + 1, title: 'P', durationMs: 1 })) } }, { ...ok, detail: { ...ok.detail, partCount: 0 } }, { ...ok, detail: { ...ok.detail, url: 'https://outside.invalid/' } },
    { version: 1, scope, operation: 'public-video-view', closed: true, kind: 'error', code: 'outside text' }, { ...ok, scope: { ...scope, accountId: 'bili_1' } }]) assert.throws(() => parseVideoViewResult(bad));
  assert.equal(parseVideoViewResult({ version: 1, scope, operation: 'public-video-view', closed: true, kind: 'error', code: 'timeout' }).kind, 'error');
});
