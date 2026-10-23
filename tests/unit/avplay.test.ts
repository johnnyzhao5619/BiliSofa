import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AvplayBackend, type AvplayApi } from '../../apps/tv/src/platform/avplay.ts';
import { diagnosticEntries } from '../../apps/tv/src/app/diagnostics.ts';
function harness(progressiveBuffering = false, prebufferSeeking = progressiveBuffering, initialization?: ConstructorParameters<typeof AvplayBackend>[5]) {
  let listener: Parameters<AvplayApi['setListener']>[0] = {};
  let state: ReturnType<AvplayApi['getState']> = 'NONE';
  const calls: string[] = [], callbacks: (() => void)[] = [], savers: number[] = [];
  const api: AvplayApi = {
    getState: () => state,
    open: () => { assert.equal(state, 'NONE'); state = 'IDLE'; calls.push('open'); },
    setListener: value => { listener = value; assert.equal(state, 'IDLE'); calls.push('listener'); },
    setDisplayRect: (x, y, w, h) => { assert.deepEqual([x, y, w, h], [0, 0, 1920, 1080]); calls.push('rect'); },
    prepareAsync: done => { calls.push('prepare'); callbacks.push(() => { state = 'READY'; done(); }); },
    play: () => { state = 'PLAYING'; calls.push('play'); }, pause: () => { state = 'PAUSED'; calls.push('pause'); },
    seekTo: (_time, done) => { calls.push('seek'); callbacks.push(done); },
    stop: () => { assert.ok(['READY', 'PLAYING', 'PAUSED'].includes(state)); state = 'IDLE'; calls.push('stop'); },
    close: () => { assert.notEqual(state, 'NONE'); state = 'NONE'; calls.push('close'); },
  };
  const backend = new AvplayBackend(api, { AppCommonScreenSaverState: { SCREEN_SAVER_ON: 1, SCREEN_SAVER_OFF: 0 }, setScreenSaver: (value, done) => { savers.push(value); done(); } }, raw => {
    if (raw !== 'https://synthetic.invalid/media') throw Error('policy'); return raw;
  }, progressiveBuffering, prebufferSeeking, initialization);
  return { backend, calls, callbacks, savers, api, listener: () => listener };
}
test('W01 G4 stream facts retain only decoder-reported bounded resolution bitrate and known codecs', async () => {
  const h = harness(); h.api.getCurrentStreamInfo = () => [
    { type: 'VIDEO', extra_info: JSON.stringify({ Width:'3840',Height:'2160',Bit_rate:' 24000000',fourCC:'HEVC',url:'https://private.invalid/token' }) },
    { type: 'AUDIO', extra_info: JSON.stringify({ fourCC:'AACL' }) },
  ];
  const ready = h.backend.prepare({url:'https://synthetic.invalid/media',kind:'vod'},()=>{},()=>{},()=>{});h.callbacks.shift()!();await ready;h.backend.play();
  assert.equal(h.backend.streamSummary(),'avplay.stream_v1_w3840_h2160_b24000000_vhevc_aaacl');
  assert.equal(h.calls.filter(c=>c==='play').length,1);h.backend.close();
});
test('W01 G4 malformed metadata and unsupported API never change playback or expose raw strings', async () => {
  const h = harness();const ready=h.backend.prepare({url:'https://synthetic.invalid/media',kind:'vod'},()=>{},()=>{},()=>{});h.callbacks.shift()!();await ready;h.backend.play();
  h.api.getCurrentStreamInfo=()=>[{type:'VIDEO',extra_info:JSON.stringify({Width:'99999999999',Height:-1,Bit_rate:Infinity,fourCC:'private-token'})}];
  assert.equal(h.backend.streamSummary(),'avplay.stream_v1_w0_h0_b0_vunknown_aunknown');
  h.api.getCurrentStreamInfo=()=>[{type:'VIDEO',extra_info:'not JSON private-token'}];assert.equal(h.backend.streamSummary(),'avplay.stream_unavailable');
  h.api.getCurrentStreamInfo=()=>{throw Error('private-token');};assert.equal(h.backend.streamSummary(),'avplay.stream_unavailable');assert.equal(h.api.getState(),'PLAYING');h.backend.close();
});
test('W01 G4 stream inspection never calls the SDK before preparation or after closure', async () => {
  const h=harness();let calls=0;h.api.getCurrentStreamInfo=()=>{calls++;return [];};assert.equal(h.backend.streamSummary(),'avplay.stream_unavailable');
  const ready=h.backend.prepare({url:'https://synthetic.invalid/media',kind:'vod'},()=>{},()=>{},()=>{});assert.equal(h.backend.streamSummary(),'avplay.stream_unavailable');
  h.callbacks.shift()!();await ready;h.backend.streamSummary();assert.equal(calls,1);h.backend.close();h.backend.streamSummary();assert.equal(calls,1);
});
test('W01 G4 metadata survives normal phone polling without displacing failure diagnostics', () => {
  const media={verdict:'UNVERIFIED',code:'avplay.stream_v1_w1920_h1080_b6000000_vh264_aaacl'};
  const noise=Array.from({length:12},(_,i)=>({verdict:'UNVERIFIED',code:'cast.poll_'+i}));
  assert.ok(diagnosticEntries([media,...noise]).includes(media));
  const failure={verdict:'FAIL',code:'cast.cleanup_unknown_restart_required'};
  assert.ok(diagnosticEntries([media,failure,...noise]).includes(failure));
  assert.ok(diagnosticEntries([media,...noise]).length<=8);
  const unavailable={verdict:'UNVERIFIED',code:'avplay.stream_unavailable'};
  assert.ok(diagnosticEntries([unavailable,...noise]).includes(unavailable));
});
test('W02/W04 AVPlay candidate orders IDLE listener, async prepare, logical display, legal stop/close', async () => {
  const { backend, calls, callbacks, savers } = harness();
  const prepare = backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, () => {}, () => {}, () => {});
  assert.deepEqual(calls, ['open', 'listener', 'rect', 'prepare']); callbacks.shift()!(); await prepare;
  backend.play(); backend.screensaver(false); backend.pause(); backend.close(); backend.close();
  assert.deepEqual(calls.slice(-4), ['play', 'pause', 'stop', 'close']); assert.equal(savers.at(-1), 1);
});
test('W02/W04 closing candidate rejects outstanding prepare/seek and blocks arbitrary source', async () => {
  const { backend, callbacks } = harness();
  const prepare = backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, () => {}, () => {}, () => {});
  backend.close(); await assert.rejects(prepare, { code: 'cancelled' });
  // A late callback cannot fulfill the cancelled promise; actual TV callback ordering remains unverified.
  callbacks.shift()!();
  assert.throws(() => backend.prepare({ url: 'http://127.0.0.1/private', kind: 'vod' }, () => {}, () => {}, () => {}));
});

test('W01 AVPlay failure diagnostics keep only known callback names and never raw exception text', async () => {
  for (const [value, expected] of [[{ name: 'InvalidAccessError', message: 'private-fixture-url' }, 'invalidaccesserror'], ['PLAYER_ERROR_NOT_SUPPORTED_FILE', 'player_error_not_supported_file'], [{ name: 'private-fixture-url', message: 'secret' }, 'unclassified']] as const) {
    const { backend, api } = harness(); api.prepareAsync = (_ok, error) => error(value);
    await assert.rejects(backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, () => {}, () => {}, () => {}));
    assert.equal(backend.failureSummary(), 'avplay.prepare_' + expected + '_si'); assert.ok(!backend.failureSummary().includes('private-fixture'));
  }
});
test('W01 AVPlay cancellation blocks late error classification and synchronous setup failure has a fixed stage', async () => {
  const { backend, api } = harness(); let failed: ((value?: unknown) => void) | undefined;
  api.prepareAsync = (_ok, error) => { failed = error; };
  const pending = backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, () => {}, () => {}, () => {});
  backend.close(); await assert.rejects(pending, { code: 'cancelled' }); const original = backend.failureSummary(); failed?.({ name: 'InvalidAccessError' }); assert.equal(backend.failureSummary(), original);
  api.setListener = () => { throw new Error('private-fixture-url'); };
  await assert.rejects(backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, () => {}, () => {}, () => {})); assert.equal(backend.failureSummary(), 'avplay.prepare_listener_failed');
});

test('W01 progressive MP4 explicitly configures bounded buffers in IDLE and leaves defaults when unsupported', async () => {
  const h = harness(true), settings: unknown[] = [];
  h.api.setBufferingParam = (...args) => { assert.equal(h.api.getState(), 'IDLE'); settings.push(args); };
  h.api.setTimeoutForBuffering = seconds => { assert.equal(h.api.getState(), 'IDLE'); settings.push(seconds); };
  const prepare = h.backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, () => {}, () => {}, () => {});
  h.callbacks.shift()!(); await prepare;
  assert.deepEqual(settings, [['PLAYER_BUFFER_FOR_PLAY', 'PLAYER_BUFFER_SIZE_IN_SECOND', 4], ['PLAYER_BUFFER_FOR_RESUME', 'PLAYER_BUFFER_SIZE_IN_SECOND', 4], 10]);
  assert.equal(h.backend.bufferingSummary(), 'avplay.buffer_play4_resume4_timeout10'); h.backend.close();
  const fallback = harness(true), ready = fallback.backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, () => {}, () => {}, () => {});
  fallback.callbacks.shift()!(); await ready; assert.equal(fallback.backend.bufferingSummary(), 'avplay.buffer_default'); fallback.backend.close();
});
test('W01 seek callback rejection with unchanged active state allows only user retry and rejects stale callbacks', async () => {
  const h = harness(), ready = h.backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, () => {}, () => {}, () => {});
  h.callbacks.shift()!(); await ready; h.backend.play();
  let late: ((value?: unknown) => void) | undefined;
  h.api.seekTo = (_ms, _ok, error) => { late = error; error({ name: 'InvalidAccessError', message: 'private-fixture-url' }); };
  await assert.rejects(h.backend.seek(5000), { code: 'network', retryable: true });
  assert.equal(h.backend.failureSummary(), 'avplay.seek_callback_invalidaccesserror_b0_t0_sp'); assert.equal(h.api.getState(), 'PLAYING'); assert.ok(!h.calls.includes('stop'));
  h.api.seekTo = (_ms, ok) => { h.listener().oncurrentplaytime?.(5000); ok(); };
  await h.backend.seek(5000); const result = h.backend.failureSummary(); assert.equal(result, 'avplay.seek_callback_success_b0_t1');
  late?.({ name: 'UnknownError', message: 'private-fixture-url' }); assert.equal(h.backend.failureSummary(), result); h.backend.close();
});
test('W01 seek distinguishes synchronous SDK rejection, unknown text and lost active state', async () => {
  const h = harness(), ready = h.backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, () => {}, () => {}, () => {});
  h.callbacks.shift()!(); await ready; h.backend.play();
  h.api.seekTo = () => { throw { name: 'UnknownError', message: 'private-fixture-url' }; };
  await assert.rejects(h.backend.seek(5000), { code: 'network', retryable: true }); assert.equal(h.backend.failureSummary(), 'avplay.seek_throw_unknownerror_b0_t0_sp');
  h.api.seekTo = (_ms, _ok, error) => { h.api.getState = () => 'IDLE'; error({ name: 'private-fixture-url' }); };
  await assert.rejects(h.backend.seek(5000), { code: 'network', retryable: false }); assert.equal(h.backend.failureSummary(), 'avplay.seek_callback_unclassified_b0_t0_si'); h.backend.close();
});
test('W01 seek beyond old 15s budget can complete at 20s without closing or synthesizing timeline', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const h = harness(), times: number[] = [], ready = h.backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, ms => times.push(ms), () => {}, () => {});
  h.callbacks.shift()!(); await ready; h.backend.play(); const seek = h.backend.seek(5000);
  h.listener().onbufferingstart?.(); t.mock.timers.tick(20000); assert.ok(!h.calls.includes('stop')); assert.deepEqual(times, []);
  h.listener().onbufferingcomplete?.(); h.callbacks.shift()!(); await seek;
  assert.equal(h.backend.failureSummary(), 'avplay.seek_callback_success_b0_t0'); assert.deepEqual(times, []); h.backend.close();
});
test('W01 missing seek callback closes at 30s, records buffering/target facts and ignores late SDK callbacks', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const h = harness(), ready = h.backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, () => {}, () => {}, () => {});
  h.callbacks.shift()!(); await ready; h.backend.play(); const seek = h.backend.seek(5000), rejected = assert.rejects(seek, { code: 'timeout', retryable: false });
  h.listener().onbufferingstart?.(); h.listener().oncurrentplaytime?.(5000);
  t.mock.timers.tick(29999); assert.ok(!h.calls.includes('stop')); t.mock.timers.tick(1); await rejected;
  const result = h.backend.failureSummary(); assert.equal(result, 'avplay.seek_timeout_b1_t1'); assert.equal(h.api.getState(), 'NONE');
  h.callbacks.shift()!(); assert.equal(h.backend.failureSummary(), result);
});

test('W01 progressive playing seek recreates only AVPlay at PREBUFFER_MODE offset and rejects old timeline events', async () => {
  const h = harness(true), offsets: string[] = [], times: number[] = [], urls: string[] = [];
  const open = h.api.open; h.api.open = url => { urls.push(url); open(url); };
  h.api.setStreamingProperty = (key, value) => { assert.equal(h.api.getState(), 'IDLE'); assert.equal(key, 'PREBUFFER_MODE'); offsets.push(value); };
  const ready = h.backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, ms => times.push(ms), () => {}, () => {});
  h.callbacks.shift()!(); await ready; h.backend.play(); const oldListener = h.listener();
  for (let i = 0; i < 2; i++) {
    const seek = h.backend.seek(5000); assert.equal(h.api.getState(), 'IDLE'); assert.equal(h.calls.filter(c => c === 'seek').length, 0);
    oldListener.oncurrentplaytime?.(99999); assert.ok(!times.includes(99999));
    h.callbacks.shift()!(); await seek; assert.equal(h.api.getState(), 'PLAYING'); h.listener().oncurrentplaytime?.(5000);
    assert.equal(h.backend.failureSummary(), 'avplay.seek_restart_started_b0_t0');
  }
  assert.deepEqual(offsets, ['5000', '5000']); assert.equal(urls.length, 3); assert.ok(urls.every(url => url === 'https://synthetic.invalid/media'));
  assert.deepEqual(times, [5000, 5000]); assert.equal(h.savers.at(-1), 0); h.backend.close();
});
test('W01 cancelling prebuffer seek cannot play the old binding or overwrite a newly prepared source', async () => {
  const h = harness(true); h.api.setStreamingProperty = () => {};
  const ready = h.backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, () => {}, () => {}, () => {}); h.callbacks.shift()!(); await ready; h.backend.play();
  const seek = h.backend.seek(5000), rejected = assert.rejects(seek, { code: 'cancelled' }), late = h.callbacks.shift()!; h.backend.close(); await rejected;
  const next = h.backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, () => {}, () => {}, () => {}); h.callbacks.shift()!(); await next;
  const outcome = h.backend.failureSummary(); late(); await Promise.resolve(); assert.equal(h.calls.filter(c => c === 'play').length, 1); assert.equal(h.backend.failureSummary(), outcome); h.backend.close();
});
test('W01 unsupported prebuffer setup is fatal and never retries through native seek or a new URL', async () => {
  const h = harness(true); h.api.setStreamingProperty = () => { throw { name: 'NotSupportedError', message: 'private-fixture-url' }; };
  const ready = h.backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, () => {}, () => {}, () => {}); h.callbacks.shift()!(); await ready; h.backend.play();
  await assert.rejects(h.backend.seek(5000), { code: 'network', retryable: false }); assert.equal(h.backend.failureSummary(), 'avplay.seek_restart_prebuffer_notsupportederror');
  assert.equal(h.api.getState(), 'NONE'); assert.equal(h.calls.filter(c => c === 'seek').length, 0); assert.equal(h.calls.filter(c => c === 'play').length, 1);
});
test('W01 prebuffer seek has its own 30s bound and late readiness never resumes playback', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); const h = harness(true); h.api.setStreamingProperty = () => {};
  const ready = h.backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, () => {}, () => {}, () => {}); h.callbacks.shift()!(); await ready; h.backend.play();
  const seek = h.backend.seek(5000), rejected = assert.rejects(seek, { code: 'timeout' }); t.mock.timers.tick(29999); assert.equal(h.api.getState(), 'IDLE');
  t.mock.timers.tick(1); await rejected; const outcome = h.backend.failureSummary(); assert.equal(outcome, 'avplay.seek_restart_timeout_b0_t0');
  assert.equal(h.api.getState(), 'NONE'); h.callbacks.shift()!(); await Promise.resolve(); assert.equal(h.calls.filter(c => c === 'play').length, 1); assert.equal(h.backend.failureSummary(), outcome);
});
test('W01 paused progressive seek holds prepared offset in READY until explicit resume and permits another paused seek', async () => {
  const h = harness(true, false), offsets: string[] = [], times: number[] = [];
  h.api.setStreamingProperty = (_key, value) => { assert.equal(h.api.getState(), 'IDLE'); offsets.push(value); };
  const ready = h.backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, ms => times.push(ms), () => {}, () => {});
  h.callbacks.shift()!(); await ready; h.backend.play(); h.backend.pause();
  for (const ms of [5000, 7000]) {
    const seek = h.backend.seek(ms); assert.equal(h.backend.durationMs(), 0); h.callbacks.shift()!(); await seek;
    assert.equal(h.api.getState(), 'READY'); assert.equal(h.calls.filter(c => c === 'play').length, 1);
    assert.equal(h.backend.failureSummary(), 'avplay.seek_restart_held_b0_t0'); assert.equal(h.savers.at(-1), 1);
  }
  assert.deepEqual(offsets, ['5000', '7000']); assert.deepEqual(times, []); assert.ok(!h.calls.includes('seek'));
  h.backend.play(); assert.equal(h.api.getState(), 'PLAYING'); assert.equal(h.calls.filter(c => c === 'play').length, 2); h.backend.close();
});
test('W01 Back during paused reprepare cancels late READY without hidden playback', async () => {
  const h = harness(true, false); h.api.setStreamingProperty = () => {};
  const ready = h.backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, () => {}, () => {}, () => {});
  h.callbacks.shift()!(); await ready; h.backend.play(); h.backend.pause();
  const seek = h.backend.seek(5000); h.backend.close(); await assert.rejects(seek, { code: 'cancelled' });
  h.callbacks.shift()!(); await Promise.resolve(); assert.equal(h.calls.filter(c => c === 'play').length, 1);
});

test('W01 default cast policy uses native seek even when prebuffer API exists', async () => {
  const h = harness(true, false); h.api.setStreamingProperty = () => assert.fail('failed device candidate is opt-in only');
  const ready = h.backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, () => {}, () => {}, () => {}); h.callbacks.shift()!(); await ready; h.backend.play();
  const seek = h.backend.seek(5000); h.callbacks.shift()!(); await seek; assert.equal(h.calls.filter(v => v === 'open').length, 1); assert.equal(h.calls.filter(v => v === 'seek').length, 1); h.backend.close();
});
test('W01 prepare records a synchronous SDK exception or actual non-READY callback state instead of pending', async () => {
  const a = harness(); a.api.prepareAsync = () => { throw { name: 'InvalidAccessError', message: 'private-fixture-url' }; };
  await assert.rejects(a.backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, () => {}, () => {}, () => {})); assert.equal(a.backend.failureSummary(), 'avplay.prepare_throw_invalidaccesserror_si'); a.backend.close();
  const b = harness(); b.api.prepareAsync = ok => ok(); await assert.rejects(b.backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, () => {}, () => {}, () => {})); assert.equal(b.backend.failureSummary(), 'avplay.prepare_ready_state_i'); b.backend.close();
});

test('W01 cast prepare can become READY after 20s without a premature close or automatic play', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); const h = harness(true, false);
  const pending = h.backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, () => {}, () => {}, () => {});
  h.listener().onbufferingstart?.(); t.mock.timers.tick(20000); assert.equal(h.api.getState(), 'IDLE'); assert.ok(!h.calls.includes('close'));
  h.listener().onbufferingcomplete?.(); h.callbacks.shift()!(); await pending; assert.equal(h.api.getState(), 'READY'); assert.ok(!h.calls.includes('play')); h.backend.close();
});
test('W01 prepare keeps separate legacy15/cast30 deadlines and captures state before closing', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  for (const cast of [false, true]) {
    const h = harness(cast, false), pending = h.backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, () => {}, () => {}, () => {});
    const checked = assert.rejects(pending, { code: 'timeout' }); h.listener().onbufferingstart?.();
    t.mock.timers.tick((cast ? 30000 : 15000) - 1); assert.equal(h.api.getState(), 'IDLE'); t.mock.timers.tick(1); await checked;
    const result = h.backend.failureSummary(); assert.equal(result, 'avplay.prepare_timeout_b1_si'); assert.equal(h.api.getState(), 'NONE'); h.callbacks.shift()!(); assert.equal(h.backend.failureSummary(), result);
  }
});

test('W01 AVPlay duration getter is blocked during asynchronous prepare and native seek', async () => {
  const h = harness(true, false); let calls = 0; h.api.getDuration = () => { calls++; return 240000; };
  const prepared = h.backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, () => {}, () => {}, () => {});
  assert.equal(h.backend.durationMs(), 0); assert.equal(calls, 0); h.callbacks.shift()!(); await prepared; assert.equal(h.backend.durationMs(), 240000);
  h.backend.play(); h.backend.pause(); const pending = h.backend.seek(5000); const prior = calls;
  for (let i = 0; i < 10; i++) assert.equal(h.backend.durationMs(), 0); assert.equal(calls, prior);
  h.callbacks.shift()!(); await pending; assert.equal(h.backend.durationMs(), 240000); assert.equal(calls, prior + 1); h.backend.close();
});

test('W01 successful prebuffer callback in IDLE permits held pause, another seek and explicit resume only', async () => {
  const h = harness(true, false); let prebuffer = false, state: ReturnType<AvplayApi['getState']> = 'NONE';
  h.api.getState = () => state; h.api.open = () => { state = 'IDLE'; h.calls.push('open'); }; h.api.setListener = () => {};
  h.api.stop = () => { state = 'IDLE'; }; h.api.close = () => { state = 'NONE'; };
  h.api.play = () => { state = 'PLAYING'; h.calls.push('play'); }; h.api.pause = () => { state = 'PAUSED'; };
  h.api.setStreamingProperty = () => { prebuffer = true; };
  h.api.prepareAsync = done => { h.callbacks.push(() => { state = prebuffer ? 'IDLE' : 'READY'; done(); }); };
  h.api.getDuration = () => { assert.notEqual(state, 'IDLE'); return 240000; };
  const ready = h.backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, () => {}, () => {}, () => {});
  h.callbacks.shift()!(); await ready; h.backend.play(); h.backend.pause();
  for (let i = 0; i < 2; i++) {
    const seek = h.backend.seek(5000); h.callbacks.shift()!(); await seek;
    assert.equal(state, 'IDLE'); assert.equal(h.backend.failureSummary(), 'avplay.seek_restart_held_b0_t0');
    assert.equal(h.backend.durationMs(), 0); assert.equal(h.calls.filter(c => c === 'play').length, 1);
  }
  h.backend.play(); assert.equal(state, 'PLAYING'); assert.equal(h.calls.filter(c => c === 'play').length, 2); h.backend.close();
  assert.throws(() => h.backend.play(), { code: 'invalid' });
});
test('W01 plain IDLE and prebuffer before callback cannot bypass play state checks', async () => {
  const h = harness(true, false); h.api.setStreamingProperty = () => {};
  const ready = h.backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, () => {}, () => {}, () => {});
  assert.throws(() => h.backend.play(), { code: 'invalid' }); h.callbacks.shift()!(); await ready; h.backend.play(); h.backend.pause();
  const seek = h.backend.seek(5000); assert.throws(() => h.backend.play(), { code: 'invalid' }); h.backend.close();
  await assert.rejects(seek, { code: 'cancelled' }); h.callbacks.shift()!(); assert.equal(h.calls.filter(c => c === 'play').length, 1);
});


test('W01 known large index can prepare beyond 30s only with continuing transport progress', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let now = 0, last = 0; const h = harness(true, false, { mib: 42, clock: () => now, latestProgress: () => last });
  const pending = h.backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, () => {}, () => {}, () => {});
  for (let i = 1; i <= 4; i++) { now = last = i * 10000; t.mock.timers.tick(10000); }
  assert.equal(h.api.getState(), 'IDLE'); assert.ok(!h.calls.includes('play'));
  h.callbacks.shift()!(); await pending; now = 300000; t.mock.timers.tick(300000);
  assert.equal(h.api.getState(), 'READY'); h.backend.close();
});

test('W01 large-index preparation closes after 20s without transport progress and discards late ready', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); let now = 0;
  const h = harness(true, false, { mib: 42, clock: () => now, latestProgress: () => 0 });
  const pending = h.backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, () => {}, () => {}, () => {});
  const failed = assert.rejects(pending, { code: 'timeout' }); now = 20000; t.mock.timers.tick(20000); await failed;
  assert.equal(h.backend.failureSummary(), 'avplay.prepare_init_stalled_b0_si');
  h.callbacks.shift()!(); assert.equal(h.api.getState(), 'READY'); assert.ok(!h.calls.includes('play'));
  // The fixture callback changes its fake SDK state; the adapter never resumes it.
});

test('W01 continuing progress cannot extend the absolute large-index cap', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); let now = 0;
  const h = harness(true, false, { mib: 128, clock: () => now, latestProgress: () => now });
  const pending = h.backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, () => {}, () => {}, () => {});
  const failed = assert.rejects(pending, { code: 'timeout' }); now = 180000; t.mock.timers.tick(180000); await failed;
  assert.equal(h.backend.failureSummary(), 'avplay.prepare_timeout_b0_si'); assert.equal(h.api.getState(), 'NONE');
});

test('W01 cancelling large-index preparation clears both owned timers', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); let now = 0;
  const h = harness(true, false, { mib: 42, clock: () => now, latestProgress: () => now });
  const pending = h.backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, () => {}, () => {}, () => {});
  const failed = assert.rejects(pending, { code: 'cancelled' }); h.backend.close(); await failed;
  const count = h.calls.filter(c => c === 'close').length; now = 300000; t.mock.timers.tick(300000);
  assert.equal(h.calls.filter(c => c === 'close').length, count); assert.ok(!h.calls.includes('play'));
});

test('W01 small or invalid initialization sizes keep the existing 30s limit', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  for (const mib of [0, 8, 9.5, 129, Number.NaN]) {
    const h = harness(true, false, { mib, clock: () => 0, latestProgress: () => 0 });
    const pending = h.backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, () => {}, () => {}, () => {});
    const failed = assert.rejects(pending, { code: 'timeout' }); t.mock.timers.tick(30000); await failed;
    assert.equal(h.backend.failureSummary(), 'avplay.prepare_timeout_b0_si');
  }
});

test('W01 invalid or throwing transport activity cannot keep a large prepare alive', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  for (const latestProgress of [() => Number.NaN, () => 999999, () => { throw new Error('private-not-logged'); }]) {
    let now = 0; const h = harness(true, false, { mib: 42, clock: () => now, latestProgress });
    const pending = h.backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, () => {}, () => {}, () => {});
    const failed = assert.rejects(pending, { code: 'timeout' }); now = 20000; t.mock.timers.tick(20000); await failed;
    assert.equal(h.backend.failureSummary(), 'avplay.prepare_init_stalled_b0_si');
  }
});

test('W01 large-index paused reprepare can cross 30s with fresh progress and remains silent until resume', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); let now = 0, last = 0;
  const h = harness(true, false, { mib: 42, clock: () => now, latestProgress: () => last });
  h.api.setStreamingProperty = (_key, value) => assert.equal(value, '5000');
  const ready = h.backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, () => {}, () => {}, () => {});
  h.callbacks.shift()!(); await ready; h.backend.play(); h.backend.pause();
  now = 10000; const seek = h.backend.seek(5000);
  for (let i = 1; i <= 4; i++) { now = last = 10000 + i * 10000; t.mock.timers.tick(10000); }
  assert.equal(h.api.getState(), 'IDLE'); assert.equal(h.calls.filter(c => c === 'play').length, 1);
  h.callbacks.shift()!(); await seek; assert.equal(h.backend.failureSummary(), 'avplay.seek_restart_held_b0_t0');
  now += 200000; t.mock.timers.tick(200000); assert.equal(h.api.getState(), 'READY');
  h.backend.play(); assert.equal(h.calls.filter(c => c === 'play').length, 2); h.backend.close();
});

test('W01 old initial-read progress cannot keep a stalled large-index reprepare alive', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); let now = 0;
  const h = harness(true, false, { mib: 42, clock: () => now, latestProgress: () => 1000 });
  h.api.setStreamingProperty = () => {};
  const ready = h.backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, () => {}, () => {}, () => {});
  h.callbacks.shift()!(); await ready; h.backend.play(); h.backend.pause(); now = 60000;
  const seek = h.backend.seek(5000), failed = assert.rejects(seek, { code: 'timeout' });
  now = 80000; t.mock.timers.tick(20000); await failed;
  const result = h.backend.failureSummary(); assert.equal(result, 'avplay.seek_restart_init_stalled_b0_si');
  h.callbacks.shift()!(); assert.equal(h.backend.failureSummary(), result); assert.equal(h.calls.filter(c => c === 'play').length, 1);
});

test('W01 large-index reprepare retains its absolute size budget despite ongoing reads', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); let now = 0;
  const h = harness(true, false, { mib: 42, clock: () => now, latestProgress: () => now });
  h.api.setStreamingProperty = () => {};
  const ready = h.backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, () => {}, () => {}, () => {});
  h.callbacks.shift()!(); await ready; h.backend.play(); h.backend.pause(); now = 50000;
  const seek = h.backend.seek(5000), failed = assert.rejects(seek, { code: 'timeout' });
  now += 178000; t.mock.timers.tick(178000); await failed;
  assert.equal(h.backend.failureSummary(), 'avplay.seek_restart_timeout_b0_t0'); assert.equal(h.api.getState(), 'NONE');
});

test('W01 Home cancels both large-index reprepare timers without late play or failure overwrite', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); let now = 0;
  const h = harness(true, false, { mib: 42, clock: () => now, latestProgress: () => now });
  h.api.setStreamingProperty = () => {};
  const ready = h.backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, () => {}, () => {}, () => {});
  h.callbacks.shift()!(); await ready; h.backend.play(); h.backend.pause();
  const seek = h.backend.seek(5000), failed = assert.rejects(seek, { code: 'cancelled' }); h.backend.close(); await failed;
  const result = h.backend.failureSummary(), closed = h.calls.filter(c => c === 'close').length;
  now = 300000; t.mock.timers.tick(300000); h.callbacks.shift()!(); await Promise.resolve();
  assert.equal(h.calls.filter(c => c === 'close').length, closed); assert.equal(h.calls.filter(c => c === 'play').length, 1); assert.equal(h.backend.failureSummary(), result);
});

test('W01 direct native seek keeps 30s even when its source has a known large index', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); let now = 0;
  const h = harness(true, false, { mib: 42, clock: () => now, latestProgress: () => now });
  h.api.setStreamingProperty = () => assert.fail('playing native seek must not reprepare');
  const ready = h.backend.prepare({ url: 'https://synthetic.invalid/media', kind: 'vod' }, () => {}, () => {}, () => {});
  h.callbacks.shift()!(); await ready; h.backend.play();
  const seek = h.backend.seek(5000), failed = assert.rejects(seek, { code: 'timeout' });
  now = 30000; t.mock.timers.tick(30000); await failed;
  assert.equal(h.backend.failureSummary(), 'avplay.seek_timeout_b0_t0'); assert.equal(h.calls.filter(c => c === 'open').length, 1);
});

test('W01 source transition requires actual decoder NONE after close; a returned close call alone is insufficient', () => {
  const h = harness(); assert.equal(h.backend.closureConfirmed(), true);
  h.api.getState = () => 'IDLE'; h.api.close = () => {};
  h.backend.close(); assert.equal(h.backend.closureConfirmed(), false);
  h.api.getState = () => { throw new Error('private runtime details'); };
  assert.equal(h.backend.closureConfirmed(), false);
});

test('G4 rate setter is gated before prepare, during pending operations, pause and after close', async () => {
  const h = harness(); const rates: number[] = []; h.api.setSpeed = n => rates.push(n);
  assert.equal(h.backend.setProbeRate(2), 'busy');
  const ready = h.backend.prepare({url:'https://synthetic.invalid/media',kind:'vod'},()=>{},()=>{},()=>{});
  assert.equal(h.backend.setProbeRate(2), 'busy'); h.callbacks.shift()!(); await ready; h.backend.play();
  const seek = h.backend.seek(5000); assert.equal(h.backend.setProbeRate(2), 'busy'); h.callbacks.shift()!(); await seek;
  assert.equal(h.backend.setProbeRate(2), 'accepted'); assert.equal(h.backend.setProbeRate(1), 'accepted');
  h.backend.pause(); assert.equal(h.backend.setProbeRate(2), 'busy'); h.backend.close(); assert.equal(h.backend.setProbeRate(2), 'busy'); assert.deepEqual(rates,[2,1]);
});
test('G4 rate SDK absence and known unsupported remain distinct from unknown exceptions', async () => {
  const h = harness(); const ready=h.backend.prepare({url:'https://synthetic.invalid/media',kind:'vod'},()=>{},()=>{},()=>{});h.callbacks.shift()!();await ready;h.backend.play();
  assert.equal(h.backend.setProbeRate(2),'unsupported');
  h.api.setSpeed=()=>{throw {name:'NotSupportedError',message:'private-source'};};assert.equal(h.backend.setProbeRate(2),'unsupported');
  h.api.setSpeed=()=>{throw {name:'private-source'};};assert.equal(h.backend.setProbeRate(2),'failed');assert.equal(h.backend.failureSummary(),'avplay.rate_unclassified');h.backend.close();
});
test('G4 rate rejects live input and buffering without issuing a speed command', async () => {
  const h=harness();let calls=0;h.api.setSpeed=()=>{calls++;};
  const live=h.backend.prepare({url:'https://synthetic.invalid/media',kind:'live'},()=>{},()=>{},()=>{});h.callbacks.shift()!();await live;h.backend.play();assert.equal(h.backend.setProbeRate(2),'busy');h.backend.close();
  const vod=h.backend.prepare({url:'https://synthetic.invalid/media',kind:'vod'},()=>{},()=>{},()=>{});h.callbacks.shift()!();await vod;h.backend.play();h.listener().onbufferingstart?.();assert.equal(h.backend.setProbeRate(2),'busy');h.listener().onbufferingcomplete?.();assert.equal(h.backend.setProbeRate(2),'accepted');assert.equal(calls,1);h.backend.close();
});
