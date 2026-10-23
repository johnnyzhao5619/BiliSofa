import { test } from 'node:test';
import assert from 'node:assert/strict';
import { overlayDefaults, parseOverlayBinding, parseOverlayPreferences, parseSubtitleCues } from '../../packages/contracts/src/media-overlays.ts';
import { OverlaySession } from '../../packages/media/src/overlay-session.ts';
import { OverlayProfiles } from '../../apps/tv/src/platform/overlay-preferences-store.ts';
import { parseDanmaku } from '../../packages/media/src/danmaku.ts';
import { OverlayTimeline, parseSubtitle } from '../../packages/media/src/timeline.ts';
const binding = { accountId: 'guest', generation: 1, mediaSessionId: 'media-1', itemKey: 'BV0000000001:p1' }, view = { width: 1920, height: 1080 };
const item = (id = 'd1', timeMs = 1000, mode = 'scroll') => ({ id, timeMs, mode, color: 0xffffff, content: '<script>文字</script>' });
const cues = { body: [{ from: 1, to: 3, content: '第一行\n第二行' }, { from: 5, to: 8, content: '<img src=x>' }] };
function deferred<T>() { let resolve!: (v: T) => void, reject!: (error: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }

test('W05 overlay settings reject outside fields, coercion, nonfinite values and unbounded filters', () => {
  assert.deepEqual(parseOverlayPreferences(overlayDefaults()), overlayDefaults());
  for (const v of [{ ...overlayDefaults(), cookie: 'private' }, { ...overlayDefaults(), schema: 2 }, { ...overlayDefaults(), danmaku: { ...overlayDefaults().danmaku, density: 1.5 } }, { ...overlayDefaults(), danmaku: { ...overlayDefaults().danmaku, area: '0.5' } }, { ...overlayDefaults(), danmaku: { ...overlayDefaults().danmaku, opacity: NaN } }, { ...overlayDefaults(), danmaku: { ...overlayDefaults().danmaku, filters: ['词', '词'] } }, { ...overlayDefaults(), subtitles: { ...overlayDefaults().subtitles, offsetMs: 60001 } }]) assert.throws(() => parseOverlayPreferences(v));
  for (const v of [{ ...binding, generation: -1 }, { ...binding, accountId: '../outside' }, { ...binding, itemKey: 'https://outside.invalid/' }, { ...binding, cookie: 'private' }]) assert.throws(() => parseOverlayBinding(v));
});
test('W05 subtitle parser supports plain multiline, exact time boundaries and immutable records', () => {
  const timeline = new OverlayTimeline(), records = parseSubtitle(cues); timeline.replace(records); records[0]!.content = 'changed';
  assert.equal(timeline.at(1000)[0]?.content, '第一行\n第二行'); assert.equal(timeline.at(3000).length, 0);
  const output = timeline.at(1500); output[0]!.content = 'outside'; assert.equal(timeline.at(1500)[0]?.content, '第一行\n第二行');
  assert.equal(timeline.at(5000, 1000).length, 0); assert.equal(timeline.at(6000, 1000)[0]?.content, '<img src=x>');
  for (const v of [[{ id: 'a', startMs: 1, endMs: 2, content: '\u0000' }], [{ id: 'a', startMs: 1, endMs: Infinity, content: 'x' }], [{ id: 'a', startMs: 1, endMs: 2, content: 'x' }, { id: 'a', startMs: 2, endMs: 3, content: 'x' }]]) assert.throws(() => parseSubtitleCues(v));
  assert.throws(() => timeline.at(1000, 0, 1.5));
});
test('W05 normalized danmaku rejects unknown executable modes, extras and aggregate allocation floods', () => {
  assert.throws(() => parseDanmaku([item('bas', 1, 'BAS')]), { code: 'unsupported' });
  assert.throws(() => parseDanmaku([{ ...item(), url: 'https://outside.invalid/' }]), { code: 'invalid' });
  assert.throws(() => parseDanmaku(Array.from({ length: 5000 }, (_, i) => ({ ...item(String(i)), content: '字'.repeat(512) }))), { code: 'invalid' });
});
test('W05 overlays derive positions from real media time, freeze on pause, clear on seeking and reconstruct backward', async () => {
  const s = new OverlaySession(); s.bind(binding); await s.loadDanmaku(async () => [item()]); await s.loadSubtitles(async () => cues);
  const first = s.frame(1500, 'playing', view), later = s.frame(2500, 'playing', view);
  assert.ok(later.danmaku[0]!.x < first.danmaku[0]!.x); assert.deepEqual(s.frame(1500, 'paused', view), first);
  assert.deepEqual(s.frame(1500, 'playing', view), first); assert.equal(s.frame(1500, 'seeking', view).danmaku.length, 0);
  assert.equal(s.frame(9500, 'playing', view).danmaku.length, 0); assert.equal(s.frame(0, 'playing', view).subtitles.length, 0);
  assert.equal(s.frame(5500, 'playing', view).subtitles[0]?.content, '<img src=x>');
  for (const state of ['loading', 'ended', 'error', 'closed'] as const) assert.equal(s.frame(1500, state, view).subtitles.length, 0);
});
test('W05 density, layout collision, region, filtering, font/opacity and subtitle offset remain independent', async () => {
  const s = new OverlaySession(); s.bind(binding); const prefs = overlayDefaults(); prefs.danmaku.area = .25; prefs.danmaku.density = 2; prefs.danmaku.filters = ['拦截']; prefs.subtitles.offsetMs = 1000; s.configure(prefs);
  await s.loadDanmaku(async () => [item('a', 1000, 'top'), item('b', 1000, 'bottom'), item('c'), { ...item('d'), content: '拦截' }]); await s.loadSubtitles(async () => cues);
  const frame = s.frame(1500, 'playing', view); assert.equal(frame.danmaku.length, 2); assert.ok(frame.danmaku.every(p => p.y < 270)); assert.equal(frame.subtitles.length, 0);
  assert.equal(s.frame(2200, 'playing', view).subtitles.length, 1); assert.equal(new Set(frame.danmaku.map(p => p.y)).size, 2);
  prefs.danmaku.filters.length = 0; prefs.danmaku.enabled = false; s.configure(prefs); assert.equal(s.frame(2200, 'playing', view).danmaku.length, 0); assert.equal(s.frame(2200, 'playing', view).subtitles.length, 1);
  const snapshot = s.frame(2200, 'playing', view); snapshot.preferences.subtitles.enabled = false; assert.equal(s.frame(2200, 'playing', view).subtitles.length, 1);
});
test('W05 old account/source reads abort and cannot publish late data or errors', async () => {
  const s = new OverlaySession(); s.bind(binding); const pending = deferred<unknown>(); let oldSignal: AbortSignal | undefined;
  const loading = s.loadSubtitles(async (b, signal) => { assert.equal(b.accountId, 'guest'); oldSignal = signal; return pending.promise; });
  s.bind({ ...binding, accountId: 'bili_101', generation: 2, mediaSessionId: 'media-2' }); assert.equal(oldSignal?.aborted, true);
  await s.loadSubtitles(async () => ({ body: [] })); pending.resolve(cues); await loading; assert.deepEqual(s.status().subtitles, { state: 'empty' }); assert.equal(s.frame(1500, 'playing', view).subtitles.length, 0);
  const failed = deferred<unknown>(), attempt = s.loadDanmaku(() => failed.promise); s.bind(binding); failed.reject(Error('private response')); await attempt; assert.deepEqual(s.status().danmaku, { state: 'idle' });
});
test('W05 newer subtitle language request wins even when the older track finishes last', async () => {
  const s = new OverlaySession(); s.bind(binding); const old = deferred<unknown>(); let signal: AbortSignal | undefined;
  const first = s.loadSubtitles(async (_b, v) => { signal = v; return old.promise; }); await s.loadSubtitles(async () => ({ body: [{ from: 1, to: 3, content: '新语言' }] }));
  assert.equal(signal?.aborted, true); old.resolve(cues); await first; assert.equal(s.frame(1500, 'paused', view).subtitles[0]?.content, '新语言');
});
test('W05 cancellation settles even an uncooperative reader, and deadline is distinct from empty data', async () => {
  const s = new OverlaySession(10); s.bind(binding); let signal: AbortSignal | undefined;
  await s.loadDanmaku(async (_binding, v) => { signal = v; return new Promise(() => {}); });
  assert.equal(signal?.aborted, true); assert.deepEqual(s.status().danmaku, { state: 'error', code: 'timeout' });
  const pending = s.loadSubtitles(async () => new Promise(() => {})); s.close(); await pending; assert.deepEqual(s.status().subtitles, { state: 'idle' });
  for (const budget of [0, 1.5, 60001]) assert.throws(() => new OverlaySession(budget));
});
test('W05 scrolling lane checks the faster following text cannot catch a still-visible predecessor', async () => {
  const s = new OverlaySession(); s.bind(binding); const prefs = overlayDefaults(); prefs.danmaku.area = .25; s.configure(prefs);
  await s.loadDanmaku(async () => [{ ...item('one', 0), content: '短' }, { ...item('two', 1500), content: '短' }, { ...item('catching', 4000), content: '长'.repeat(30) }]);
  const frame = s.frame(4500, 'playing', { width: 320, height: 180 }); assert.deepEqual(frame.danmaku.map(p => p.id), ['one', 'two']);
  assert.ok(frame.danmaku[1]!.x - (frame.danmaku[0]!.x + frame.danmaku[0]!.width) >= 16);
});
test('W05 missing data, invalid data and read failure differ; teardown cancels and clears without replay', async () => {
  const s = new OverlaySession(); s.bind(binding); await s.loadDanmaku(async () => []); assert.equal(s.status().danmaku.state, 'empty');
  await s.loadSubtitles(async () => ({ body: 'bad' })); assert.deepEqual(s.status().subtitles, { state: 'error', code: 'invalid' });
  await s.loadSubtitles(async () => { throw Error('cookie must not leak'); }); assert.deepEqual(s.status().subtitles, { state: 'error', code: 'network' });
  const pending = deferred<unknown>(); let signal: AbortSignal | undefined; const work = s.loadDanmaku(async (_b, v) => { signal = v; return pending.promise; }); s.close(); s.close(); assert.equal(signal?.aborted, true); pending.resolve([item()]); await work;
  assert.equal(s.frame(1500, 'playing', view).danmaku.length, 0); await assert.rejects(s.loadSubtitles(async () => cues), { code: 'cancelled' }); assert.throws(() => s.bind(binding), { code: 'cancelled' });
});
function stores() { const values = new Map<string, string>(); let ignore = false; const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { if (!ignore) values.set(k, v); }, removeItem: (k: string) => { if (!ignore) values.delete(k); } }; return { values, storage, profiles: new OverlayProfiles(storage), ignore: () => { ignore = true; } }; }
test('W05 overlay preferences persist in independent guest/A/B partitions without touching old stores', () => {
  const h = stores(), prefs = overlayDefaults(); prefs.subtitles.offsetMs = -500; h.values.set('bilisofa.local.v1.bili_101', 'old playback'); h.values.set('bilisofa.retained-writes.v1', 'unknown');
  assert.equal(h.profiles.profile('bili_101').save(prefs), 'saved'); assert.deepEqual(new OverlayProfiles(h.storage).profile('bili_101').read(), { kind: 'ok', value: prefs });
  assert.deepEqual(h.profiles.profile('guest').read(), { kind: 'ok', value: overlayDefaults() }); assert.deepEqual(h.profiles.profile('bili_202').read(), { kind: 'ok', value: overlayDefaults() });
  assert.equal(h.profiles.profile('bili_101').clear(), 'deleted'); assert.equal(h.values.get('bilisofa.local.v1.bili_101'), 'old playback'); assert.equal(h.values.get('bilisofa.retained-writes.v1'), 'unknown'); assert.throws(() => h.profiles.profile('../bad'));
});
test('W05 corrupted/future preferences never auto-overwrite and denied writes are unconfirmed', () => {
  const h = stores(), p = h.profiles.profile('guest'), key = 'bilisofa.overlays.v1.guest';
  for (const [raw, kind] of [['{bad', 'corrupt'], [JSON.stringify({ ...overlayDefaults(), schema: 2 }), 'future']]) { h.values.set(key, raw!); assert.equal(p.read().kind, kind); assert.equal(p.save(overlayDefaults()), kind); assert.equal(h.values.get(key), raw); }
  p.clear(); h.ignore(); assert.equal(p.save(overlayDefaults()), 'unconfirmed'); assert.equal(new OverlayProfiles(undefined).profile('guest').save(overlayDefaults()), 'unavailable');
});
