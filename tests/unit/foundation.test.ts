import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SessionManager } from '../../packages/bili-client/src/session.ts';
import { WriteCoordinator } from '../../packages/bili-client/src/write.ts';
import { PageAccumulator } from '../../packages/bili-client/src/pagination.ts';
import { allowRedirect, allowedApiUrl } from '../../packages/bili-client/src/network-policy.ts';
import { PlayerCoordinator } from '../../packages/media/src/player.ts';
import { OverlayTimeline, parseSubtitle } from '../../packages/media/src/timeline.ts';
import { CastSession, parseCastCommand } from '../../packages/cast/src/session.ts';
import { LifecycleCoordinator } from '../../apps/tv/src/app/lifecycle.ts';
import { ProbePreferences } from '../../apps/tv/src/platform/preferences.ts';
import { shouldConfirm } from '../../apps/tv/src/ui/input.ts';
import type { PlayerBackend } from '../../packages/contracts/src/index.ts';
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((r, j) => { resolve = r; reject = j; });
  return { promise, resolve, reject };
}
test('W02/F13 old account response is rejected, signal aborted, no pending request retained', async () => {
  const sessions = new SessionManager(); sessions.switchAccount('A');
  const response = deferred<unknown>(); let signal: AbortSignal | undefined;
  const read = sessions.read((_scope, s) => { signal = s; return response.promise; }, String);
  sessions.switchAccount('B'); assert.equal(signal?.aborted, true); response.resolve('private-A');
  await assert.rejects(read, { code: 'cancelled' });
  assert.equal(await sessions.read(async () => 'public-B', String), 'public-B');
});
test('W02 request ownership ends when task finishes and all requests cancel on dispose', () => {
  const sessions = new SessionManager(); const task = sessions.begin();
  assert.equal(sessions.accepts(task.scope), true); task.finish(); assert.equal(sessions.accepts(task.scope), false);
  const next = sessions.begin(); sessions.dispose(); assert.equal(next.signal.aborted, true);
});
test('W02/F14 confirm duplicate is blocked during send and after unknown outcome', async () => {
  const writes = new WriteCoordinator(); const intent = { accountId: 'A', generation: 1, action: 'coin', targetId: 'video' };
  const response = deferred<'unknown'>(); let sends = 0;
  await assert.rejects(writes.submit(intent, async () => 'confirmed', false), { code: 'permission' });
  const write = writes.submit(intent, () => { sends++; return response.promise; }, true);
  await assert.rejects(writes.submit(intent, async () => 'confirmed', true), { code: 'unknown' });
  response.resolve('unknown'); assert.equal(await write, 'unknown');
  await assert.rejects(writes.submit({ ...intent, generation: 3 }, async () => 'confirmed', true), { code: 'unknown' });
  assert.equal(sends, 1);
  assert.equal(await writes.reconcile(intent, async () => { throw new Error('offline'); }), 'unknown');
  assert.equal(await writes.reconcile(intent, async () => 'not-applied'), 'not-applied');
  assert.equal(await writes.submit(intent, async () => 'confirmed', true), 'confirmed');
});
test('W02/F14 send exceptions produce unknown rather than retryable failure', async () => {
  const writes = new WriteCoordinator(); const intent = { accountId: 'A', generation: 1, action: 'like', targetId: 'v' };
  assert.equal(await writes.submit(intent, async () => { throw new Error('timeout'); }, true), 'unknown');
  assert.equal(await writes.reconcile(intent, async () => 'applied'), 'confirmed');
  assert.throws(() => writes.releaseConfirmed({ ...intent, targetId: 'other' }), { code: 'unknown' });
});
test('W03 paginated overlap deduplicates, reset rejects stale page and retry preserves cursor', async () => {
  const pages = new PageAccumulator<{ id: string }>();
  await pages.next(async () => ({ items: [{ id: '1' }, { id: '2' }], nextCursor: 'next' }));
  await assert.rejects(pages.next(async cursor => { assert.equal(cursor, 'next'); throw new Error('offline'); }));
  await pages.next(async cursor => { assert.equal(cursor, 'next'); return { items: [{ id: '2' }, { id: '3' }], nextCursor: null }; });
  assert.deepEqual(pages.values().map(v => v.id), ['1', '2', '3']);
  pages.reset(); const old = deferred<{ items: { id: string }[]; nextCursor: null }>(); const pending = pages.next(() => old.promise);
  pages.reset(); old.resolve({ items: [{ id: 'old-account' }], nextCursor: null }); await pending; assert.deepEqual(pages.values(), []);
});
test('W02 URL policies reject credential redirects, userinfo, ports and forged suffixes', () => {
  assert.equal(allowedApiUrl('https://api.bilibili.com/x/web-interface/nav', true).hostname, 'api.bilibili.com');
  for (const url of ['http://api.bilibili.com/', 'https://api.bilibili.com.attacker.invalid/', 'https://user:secret@api.bilibili.com/', 'https://api.bilibili.com:444/', 'https://127.0.0.1/']) {
    assert.throws(() => allowedApiUrl(url, false), { code: 'permission' });
  }
  assert.throws(() => allowRedirect('https://api.bilibili.com/', 'https://passport.bilibili.com/', true), { code: 'permission' });
  assert.equal(allowRedirect('https://api.bilibili.com/', '/safe', true).pathname, '/safe');
});
function fakePlayer() {
  const preparations: ReturnType<typeof deferred<void>>[] = [], seeks: number[] = [], screensaver: boolean[] = [];
  let time: (ms: number) => void = () => {}, end = () => {}, error = () => {}, closes = 0;
  const backend: PlayerBackend = {
    prepare: (_source, t, e, err) => { time = t; end = e; error = err; const p = deferred<void>(); preparations.push(p); return p.promise; },
    play: () => {}, pause: () => {}, seek: async ms => { seeks.push(ms); }, close: () => { closes++; }, screensaver: active => { screensaver.push(active); },
  };
  return { backend, preparations, seeks, screensaver, time: () => time, end: () => end, error: () => error, closes: () => closes };
}
test('W02/F06 late prepare/time/end/error cannot resurrect or close the new player', async () => {
  const fake = fakePlayer(), player = new PlayerCoordinator(fake.backend);
  const old = player.open({ url: 'https://example.invalid/one', kind: 'vod' });
  const oldTime = fake.time(), oldEnd = fake.end(), oldError = fake.error();
  const current = player.open({ url: 'https://example.invalid/two', kind: 'vod' });
  fake.preparations[0]!.resolve(); await assert.rejects(old, { code: 'cancelled' });
  fake.preparations[1]!.resolve(); await current; player.play();
  oldTime(1000); oldEnd(); oldError(); assert.equal(player.state, 'playing'); assert.equal(player.timeMs, 0);
  fake.time()(5000); assert.equal(player.timeMs, 5000); player.pause(); assert.equal(fake.screensaver.at(-1), true);
  player.close(); player.close(); assert.equal(player.state, 'idle');
});
test('W02/F06 seek serializes and queued seeks are invalidated by close; live rejects seek', async () => {
  const fake = fakePlayer(), player = new PlayerCoordinator(fake.backend);
  const opening = player.open({ url: 'https://example.invalid/video', kind: 'vod' }); fake.preparations[0]!.resolve(); await opening;
  await Promise.all([player.seek(1000), player.seek(2000)]); assert.deepEqual(fake.seeks, [1000, 2000]);
  const queued = player.seek(3000); player.close(); await assert.rejects(queued, { code: 'cancelled' });
  const live = player.open({ url: 'https://example.invalid/live', kind: 'live' }); fake.preparations[1]!.resolve(); await live;
  await assert.rejects(player.seek(10), { code: 'invalid' });
});
test('W05/F09 subtitles convert seconds once and derive active cues from actual time after backwards seek', () => {
  const timeline = new OverlayTimeline();
  timeline.replace(parseSubtitle({ body: [{ from: 1, to: 3, content: '<script>outside text</script>' }, { from: 4, to: 5, content: '中文' }] }));
  assert.equal(timeline.at(1000)[0]?.startMs, 1000); assert.equal(timeline.at(3000).length, 0);
  assert.equal(timeline.at(4200)[0]?.content, '中文'); assert.equal(timeline.at(1500)[0]?.id, 'subtitle-0');
  assert.equal(timeline.at(1100, 200).length, 0); timeline.clear(); assert.equal(timeline.at(2000).length, 0);
  assert.throws(() => parseSubtitle({ body: [{ from: 2, to: 1, content: 'invalid' }] }), { code: 'invalid' });
});
test('W06/F20 receiver session rejects unapproved/new senders, stale sequence and account-write/URL commands', () => {
  const cast = new CastSession(); assert.throws(() => cast.accept('phone-A', 's1', false), { code: 'permission' });
  cast.accept('phone-A', 's1', true); assert.throws(() => cast.accept('phone-B', 's2', true), { code: 'permission' });
  assert.deepEqual(cast.command('phone-A', 's1', 1, { type: 'seek', timeMs: 9000 }), { type: 'seek', timeMs: 9000 });
  assert.throws(() => cast.command('phone-A', 's1', 1, { type: 'play' }), { code: 'invalid' });
  cast.transfer('remote'); assert.throws(() => cast.command('phone-A', 's1', 2, { type: 'play' }), { code: 'permission' });
  cast.transfer('sender'); assert.throws(() => cast.command('phone-B', 's1', 2, { type: 'play' }), { code: 'permission' });
  assert.throws(() => parseCastCommand({ type: 'coin' }), { code: 'permission' });
  assert.throws(() => parseCastCommand({ type: 'play', url: 'http://private.invalid/' }), { code: 'invalid' });
  cast.end(); assert.throws(() => cast.command('phone-A', 's1', 3, { type: 'stop' }), { code: 'permission' });
});
test('W02/F12 hide during resume revalidation cancels resurrection; resources close once per transition', async () => {
  const check = deferred<void>(); let saves = 0, suspends = 0, resumes = 0;
  const lifecycle = new LifecycleCoordinator({ save: () => saves++, suspend: () => suspends++, revalidate: () => check.promise, resume: () => resumes++ });
  await lifecycle.setHidden(true); await lifecycle.setHidden(true); const pending = lifecycle.setHidden(false);
  await lifecycle.setHidden(true); check.resolve(); await pending;
  assert.equal(resumes, 0); assert.equal(saves, 2); assert.equal(suspends, 2);
  lifecycle.dispose(); await lifecycle.setHidden(false); assert.equal(resumes, 0);
});
test('W02/F12 storage corruption/quota failure handled; private-shaped object rejected', () => {
  let raw: string | null = null;
  const preferences = new ProbePreferences({ getItem: () => raw, setItem: (_key, value) => { raw = value; }, removeItem: () => { raw = null; } });
  assert.equal(preferences.write(7), true); assert.equal(preferences.read()?.marker, 7);
  raw = '{corrupt'; assert.equal(preferences.read(), undefined);
  raw = JSON.stringify({ version: 1, marker: 7, token: 'synthetic' }); assert.equal(preferences.read(), undefined);
  const denied = new ProbePreferences({ getItem: () => { throw Error('denied'); }, setItem: () => { throw Error('quota'); }, removeItem: () => {} });
  assert.equal(denied.write(1), false); assert.equal(denied.read(), undefined);
});
test('W02/F03/F14 composition and repeat cannot confirm a retained write', () => {
  const key = { isComposing: false, keyCode: 13, repeat: false };
  assert.equal(shouldConfirm(key, false, false), true);
  assert.equal(shouldConfirm({ ...key, keyCode: 229 }, false, false), false);
  assert.equal(shouldConfirm({ ...key, isComposing: true }, false, false), false);
  assert.equal(shouldConfirm({ ...key, repeat: true }, false, false), false);
  assert.equal(shouldConfirm(key, true, false), false); assert.equal(shouldConfirm(key, false, true), false);
});
test('W01/F06 play and pause cannot overlap pending seeks; close invalidates the busy owner', async () => {
  const fake = fakePlayer(), player = new PlayerCoordinator(fake.backend), commands: string[] = [];
  const waits: ReturnType<typeof deferred<void>>[] = [];
  fake.backend.play = () => { commands.push('play'); }; fake.backend.pause = () => { commands.push('pause'); };
  fake.backend.seek = () => { const wait = deferred<void>(); waits.push(wait); return wait.promise; };
  const opening = player.open({ url: 'https://example.invalid/video', kind: 'vod' }); fake.preparations[0]!.resolve(); await opening; player.play();
  const first = player.seek(5000); assert.equal(player.seeking, true); player.pause(); player.play();
  await Promise.resolve(); assert.deepEqual(commands, ['play']); waits[0]!.resolve(); await first;
  assert.equal(player.seeking, false); player.pause(); assert.equal(player.state, 'paused');
  const second = player.seek(5000); await Promise.resolve(); player.play(); assert.deepEqual(commands, ['play', 'pause']);
  waits[1]!.resolve(); await second; player.play(); assert.equal(player.state, 'playing');
  const old = player.seek(5000); await Promise.resolve(); player.close();
  const current = player.open({ url: 'https://example.invalid/new', kind: 'vod' }); fake.preparations[1]!.resolve(); await current;
  const fresh = player.seek(5000); await Promise.resolve(); waits[2]!.resolve(); await assert.rejects(old, { code: 'cancelled' });
  assert.equal(player.seeking, true); waits[3]!.resolve(); await fresh; assert.equal(player.seeking, false); player.close();
});
