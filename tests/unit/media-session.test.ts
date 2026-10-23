import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { MediaSource } from '../../packages/contracts/src/index.ts';
import { MediaSession, type MediaTransport, type OwnedPlayerBackend, type MediaClosure, type MediaObservation } from '../../packages/media/src/session.ts';
const source: MediaSource = { url: 'http://127.0.0.1:40324/' + 'a'.repeat(32) + '/manifest.mpd', kind: 'vod' };
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
function harness(options: { holdPrepare?: boolean; unknownDecoder?: boolean; holdClose?: boolean; closeError?: boolean; budgetMs?: number; duration?: number; observe?: (value: MediaObservation) => void } = {}) {
  const calls: string[] = []; let ready!: (source: MediaSource) => void, time!: (ms: number) => void, end!: () => void, fail!: () => void;
  let prepared!: () => void, seekDone!: () => void, closeAck!: () => void, terminal!: () => void, decoder = true;
  const outcomes: { outcome: string; closure: MediaClosure }[] = [];
  const backend: OwnedPlayerBackend = {
    prepare(_source, tick, ended, failed) { calls.push('prepare'); decoder = false; time = tick; end = ended; fail = failed; return options.holdPrepare ? new Promise<void>(yes => { prepared = yes; }) : Promise.resolve(); },
    play() { calls.push('play'); }, pause() { calls.push('pause'); }, seek() { calls.push('seek'); return new Promise<void>(yes => { seekDone = yes; }); },
    close() { calls.push('decoder-close'); decoder = !options.unknownDecoder; }, screensaver(value) { calls.push('saver-' + value); }, closureConfirmed: () => decoder, durationMs: () => options.duration ?? 0,
  };
  const transport: MediaTransport = {
    run(signal, callback) { ready = callback; calls.push('transport-run'); signal.addEventListener('abort', () => { calls.push('abort'); }); return new Promise<void>(yes => { terminal = yes; }); },
    close() { calls.push('transport-close'); if (options.closeError) throw Error('private-cdn-token'); return options.holdClose ? new Promise<void>(yes => { closeAck = yes; }) : Promise.resolve(); },
  };
  const session = new MediaSession(transport, () => backend, (outcome, closure) => outcomes.push({ outcome, closure }), options.budgetMs ?? 1000, options.observe);
  return { session, calls, outcomes, ready: () => ready(source), time: (ms: number) => time(ms), end: () => end(), fail: () => fail(), prepare: () => prepared(), seek: () => seekDone(), ack: () => closeAck(), terminal: () => terminal() };
}
test('W02 media owner closes decoder before abort/transport and shares actual acknowledgement', async () => {
  const h = harness({ holdClose: true }); h.session.start(); await flush(); h.ready(); await flush();
  assert.equal(h.session.snapshot().state, 'playing'); const closing = h.session.close(); assert.equal(h.session.close(), closing); await flush();
  assert.ok(h.calls.lastIndexOf('decoder-close') < h.calls.indexOf('abort')); assert.ok(h.calls.indexOf('abort') < h.calls.indexOf('transport-close'));
  assert.equal(h.session.snapshot().state, 'closing'); h.ack(); assert.deepEqual(await closing, { closed: true, decoderClosed: true, transportClosed: true }); assert.throws(() => h.session.start());
});
test('W02 cancelled prepare cannot play or certify an end after owner close', async () => {
  const h = harness({ holdPrepare: true }); h.session.start(); await flush(); h.ready(); await flush(); await h.session.close(); h.prepare(); await flush();
  assert.ok(!h.calls.includes('play')); h.time(9999); h.end(); await flush(); assert.deepEqual(h.outcomes, []); assert.equal(h.session.snapshot().timeMs, 0);
});
test('W02 seek serial gate blocks duplicate dispatch, preserves pause, and never manufactures target time', async () => {
  const h = harness(); h.session.start(); await flush(); h.ready(); await flush(); h.time(20000); h.session.toggle(); assert.equal(h.session.snapshot().state, 'paused');
  const seek = h.session.seek(5000); await flush(); await assert.rejects(h.session.seek(5000), { code: 'invalid' }); h.session.toggle();
  h.seek(); await seek; assert.equal(h.session.snapshot().state, 'paused'); assert.equal(h.session.snapshot().timeMs, 20000); assert.equal(h.calls.filter(c => c === 'seek').length, 1);
  h.time(5100); h.session.toggle(); assert.equal(h.session.snapshot().state, 'playing'); assert.equal(h.session.snapshot().timeMs, 5100); await h.session.close();
});
test('W02 native close timeout stays unknown after late ACK and still reports actual decoder fact', async () => {
  const h = harness({ holdClose: true, budgetMs: 25 }); h.session.start(); await flush(); h.ready(); await flush();
  const closed = await h.session.close(); assert.deepEqual(closed, { closed: false, decoderClosed: true, transportClosed: false }); h.ack(); await flush(); assert.equal(await h.session.close(), closed);
});
test('W02 unknown decoder closure blocks reuse even when native cleanup acknowledges', async () => {
  const h = harness({ unknownDecoder: true }); h.session.start(); await flush(); h.ready(); await flush();
  assert.deepEqual(await h.session.close(), { closed: false, decoderClosed: false, transportClosed: true });
});
test('W02 end and error only notify after both closures; repeated terminal callbacks cannot resurrect', async () => {
  for (const failure of [false, true]) {
    const h = harness({ holdClose: true }); h.session.start(); await flush(); h.ready(); await flush(); if (failure) h.fail(); else h.end();
    await new Promise(r => setTimeout(r, 105)); await flush(); assert.equal(h.outcomes.length, 0); h.ack(); await flush();
    assert.equal(h.outcomes.length, 1); assert.equal(h.outcomes[0]!.outcome, failure ? 'failed' : 'ended'); assert.equal(h.outcomes[0]!.closure.closed, true);
    h.terminal(); h.ready(); await flush(); assert.equal(h.outcomes.length, 1);
  }
});
test('W02 duplicated readiness never implicitly replaces decoder; transport errors drain and redact', async () => {
  const h = harness({ closeError: true }); h.session.start(); await flush(); h.ready(); await flush(); h.ready(); await flush();
  assert.equal(h.calls.filter(c => c === 'prepare').length, 1); assert.equal(h.outcomes[0]!.closure.closed, false); assert.ok(!JSON.stringify(h.outcomes).includes('private-cdn-token'));
});
test('W02 closing before transport entry never starts or prepares late work', async () => {
  const h = harness(); h.session.start(); await h.session.close(); await flush(); assert.ok(!h.calls.includes('transport-run')); assert.ok(!h.calls.includes('prepare'));
});

test('W02 local resume seeks after preparation before play and waits for an actual target tick', async () => {
  const h=harness({duration:80000});h.session.start(12000);await flush();h.ready();await flush();assert.ok(h.calls.includes('seek'));assert.ok(!h.calls.includes('play'));assert.equal(h.session.snapshot().timeMs,0);
  h.seek();await flush();assert.ok(h.calls.includes('play'));assert.equal(h.session.snapshot().timeMs,0);h.time(12100);assert.equal(h.session.snapshot().timeMs,12100);await h.session.close();
});
test('W02 completion and explicit close observe the last actual position before player time is reset', async () => {
  const observations:MediaObservation[]=[];const h=harness({duration:80000,observe:value=>observations.push(value)});h.session.start();await flush();h.ready();await flush();h.time(79000);h.end();await flush();
  assert.ok(observations.some(o=>o.reason==='ended'&&o.timeMs===79000&&o.durationMs===80000));await h.session.close();assert.equal(h.session.snapshot().timeMs,0);
});
test('W02 closing during initial resume prevents a late seek from starting playback or saving a target as a tick', async () => {
  const h=harness({duration:80000});h.session.start(12000);await flush();h.ready();await flush();await h.session.close();h.seek();await flush();assert.ok(!h.calls.includes('play'));assert.equal(h.session.snapshot().timeMs,0);
});
test('F06 a replacement source can prepare and seek while paused without a hidden play/pause pair', async () => {
  const h = harness({ duration: 80000 }); h.session.start(12000, true); await flush(); h.ready(); await flush();
  assert.ok(h.calls.includes('seek')); assert.ok(!h.calls.includes('play'));
  h.seek(); await flush(); assert.equal(h.session.snapshot().state, 'paused');
  assert.ok(!h.calls.includes('play')); assert.ok(!h.calls.includes('pause')); assert.equal(h.session.snapshot().timeMs, 0);
  h.session.toggle(); assert.equal(h.session.snapshot().state, 'playing'); assert.equal(h.calls.filter(c => c === 'play').length, 1);
  await h.session.close();
});
