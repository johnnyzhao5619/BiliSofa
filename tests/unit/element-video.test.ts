import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ElementVideoBackend, type ElementVideoHost } from '../../apps/tv/src/platform/element-video.ts';
import { PLAYBACK_RATES } from '../../packages/contracts/src/playback-rate.ts';
import { PlayerCoordinator } from '../../packages/media/src/player.ts';

const source = { kind: 'vod' as const, url: 'http://127.0.0.1:40324/' + 'a'.repeat(32) + '/manifest.mpd' };
class Video extends EventTarget {
  currentSrc = ''; readyState = 0; networkState = 0; duration = NaN; paused = true; seeking = false;
  error: { code: number } | null = null;
  controls = true; autoplay = false; loop = false; preload = ''; tabIndex = 0;
  style = { pointerEvents: '' }; attributes = new Map<string, string>();
  loads = 0; plays = 0; removed = false; autoReset = true; resetThrows = false;
  historicalCurrentSrc = false;
  private position = 0; private speed = 1;
  clampRate = false; failRestore = false;
  playResult: Promise<void> | undefined;
  get src(): string { return this.attributes.get('src') ?? ''; }
  set src(value: string) { this.attributes.set('src', value); }
  get currentTime(): number { return this.position; }
  set currentTime(value: number) { this.position = value; this.seeking = true; }
  get playbackRate(): number { return this.speed; }
  set playbackRate(value: number) { this.speed = this.clampRate ? this.failRestore ? 3 : value === 1 ? 1 : 1.75 : value; }
  setAttribute(key: string, value: string): void { this.attributes.set(key, value); }
  getAttribute(key: string): string | null { return this.attributes.get(key) ?? null; }
  removeAttribute(key: string): void { this.attributes.delete(key); }
  load(): void {
    ++this.loads;
    if (this.src) { this.currentSrc = this.src; this.networkState = 2; return; }
    if (this.resetThrows) throw new Error('synthetic reset failure');
    if (this.autoReset) this.empty();
  }
  empty(): void { if (!this.historicalCurrentSrc) this.currentSrc = ''; this.readyState = this.networkState = 0; this.paused = true; this.dispatchEvent(new Event('emptied')); }
  metadata(seconds = 120): void { this.duration = seconds; this.readyState = 1; this.dispatchEvent(new Event('loadedmetadata')); }
  tick(seconds: number): void { this.position = seconds; this.dispatchEvent(new Event('timeupdate')); }
  finishSeek(seconds: number): void { this.position = seconds; this.seeking = false; this.dispatchEvent(new Event('seeked')); }
  play(): Promise<void> { ++this.plays; this.paused = false; return this.playResult ?? Promise.resolve(); }
  pause(): void { this.paused = true; }
  remove(): void { this.removed = true; }
}
function harness(ms = 100) {
  const videos: Video[] = [], ticks: number[] = [], savers: boolean[] = [];
  let claimed = false, deny = false, releases = 0, errors = 0, ends = 0;
  const host: ElementVideoHost = {
    claimDecoder() { if (claimed || deny) return undefined; claimed = true; return () => { releases++; claimed = false; }; },
    createVideo() { const video = new Video(); videos.push(video); return video as unknown as HTMLVideoElement; },
    attach() {}, screensaver(value) { savers.push(value); },
  };
  const backend = new ElementVideoBackend(host, ms);
  const begin = () => backend.prepare(source, n => ticks.push(n), () => ends++, () => errors++);
  return { backend, videos, ticks, savers, begin, host,
    deny() { deny = true; }, get claimed() { return claimed; }, get releases() { return releases; }, get errors() { return errors; }, get ends() { return ends; },
    async ready() { const task = begin(); videos.at(-1)!.metadata(); await task; return videos.at(-1)!; },
  };
}
test('R07 candidate rejects outside sources and a refused decoder claim before creating or loading any media', async () => {
  const h = harness();
  for (const url of [source.url.replace('127.0.0.1', 'localhost'), source.url + '?x=1', source.url.replace('manifest.mpd', 'cast.mp4'), 'https://synthetic.invalid/movie']) {
    await assert.rejects(h.backend.prepare({ kind: 'vod', url }, () => {}, () => {}, () => {}), { code: 'permission' });
  }
  await assert.rejects(h.backend.prepare({ ...source, kind: 'live' }, () => {}, () => {}, () => {}), { code: 'permission' });
  assert.equal(h.videos.length, 0); h.deny(); await assert.rejects(h.begin(), { code: 'unknown' }); assert.equal(h.videos.length, 0);
});
test('R07 candidate accepts all exact fractional setters only while playing; actual ticks are independent evidence', async () => {
  const h = harness(), video = await h.ready();
  assert.equal(video.tabIndex, -1); assert.equal(video.getAttribute('aria-hidden'), 'true'); assert.equal(video.controls, false);
  assert.equal(h.backend.durationMs(), 120000); assert.equal(h.backend.setRate(1.25), 'busy');
  h.backend.play(); for (const rate of PLAYBACK_RATES) assert.equal(h.backend.setRate(rate), 'accepted');
  assert.deepEqual(h.ticks, []); video.tick(3.215); assert.deepEqual(h.ticks, [3215]);
  video.dispatchEvent(new Event('waiting')); assert.equal(h.backend.setRate(.25), 'busy');
  video.dispatchEvent(new Event('playing')); assert.equal(h.backend.setRate(.25), 'accepted');
  h.backend.pause(); assert.equal(h.backend.setRate(1.5), 'busy'); h.backend.close(); assert.equal(h.backend.closureConfirmed(), true);
  assert.equal(h.claimed, false); assert.equal(h.releases, 1); assert.equal(video.removed, true);
});
test('R07 clamped/throwing rate cannot return accepted; failed restoration signals unknown and retains decoder ownership until close', async () => {
  const h = harness(), video = await h.ready(); h.backend.play(); video.clampRate = true;
  assert.equal(h.backend.setRate(.25), 'unsupported'); assert.equal(video.playbackRate, 1); assert.equal(h.errors, 0);
  video.failRestore = true; assert.equal(h.backend.setRate(1.25), 'failed'); assert.equal(h.errors, 1); assert.equal(h.backend.failureReason(), 'unknown');
  assert.equal(video.paused, true); assert.equal(h.claimed, true); h.backend.close(); assert.equal(h.claimed, false);
});
test('R07 paused positioning never starts video, waits for seeked, checks actual target and publishes no synthetic position', async () => {
  const h = harness(), video = await h.ready(); h.backend.play(); h.backend.pause();
  const seek = h.backend.seek(5000); assert.equal(h.backend.setRate(1.5), 'busy'); assert.equal(video.plays, 1); assert.equal(video.paused, true);
  video.finishSeek(5.02); await seek; assert.deepEqual(h.ticks, []); assert.equal(video.paused, true); assert.equal(video.plays, 1);
  video.tick(5.02); assert.deepEqual(h.ticks, [5020]);
  const miss = h.backend.seek(30000); video.finishSeek(0); await assert.rejects(miss, { code: 'network' }); h.backend.close();
});
test('R07 prepare and seek deadlines are bounded and close rejects pending work without permitting late callbacks', async () => {
  const h = harness(15); await assert.rejects(h.begin(), { code: 'timeout' }); assert.equal(h.backend.closureConfirmed(), true);
  const old = h.videos[0]!; old.metadata(); old.tick(99); assert.deepEqual(h.ticks, []);
  const video = await h.ready(); const task = h.backend.seek(5000); h.backend.close();
  await assert.rejects(task, { code: 'cancelled' }); video.finishSeek(5); video.tick(5); assert.deepEqual(h.ticks, []); assert.equal(h.releases, 2);
  const current = await h.ready(); const timeout = h.backend.seek(5000); await assert.rejects(timeout, { code: 'timeout' }); current.finishSeek(5); h.backend.close();
});
test('R07 a late play rejection after pause/close cannot fail or revive a later media owner', async () => {
  const h = harness(), video = await h.ready(); let reject!: (error: unknown) => void;
  video.playResult = new Promise((_yes, no) => { reject = no; }); h.backend.play(); h.backend.pause(); h.backend.close();
  await h.ready(); reject(new Error('synthetic delayed rejection')); await Promise.resolve(); await Promise.resolve();
  assert.equal(h.errors, 0); assert.equal(h.backend.durationMs(), 120000); assert.equal(h.claimed, true); h.backend.close();
});
test('R07 a current asynchronous play error restores screensaver and enters terminal failure once', async () => {
  const h = harness(), video = await h.ready(); video.playResult = Promise.reject(new Error('synthetic play failure'));
  h.backend.play(); await Promise.resolve(); await Promise.resolve(); assert.equal(h.errors, 1); assert.equal(video.paused, true); assert.equal(h.savers.at(-1), true);
  video.dispatchEvent(new Event('error')); assert.equal(h.errors, 1); h.backend.close();
});
test('R07 unknown element reset retains decoder lease; only actual empty state may release it, exceptions remain poisoned', async () => {
  const h = harness(), video = await h.ready(); video.autoReset = false; h.backend.close();
  assert.equal(h.backend.closureConfirmed(), false); assert.equal(h.claimed, true); assert.equal(h.releases, 0);
  await assert.rejects(h.begin(), { code: 'unknown' }); video.empty(); assert.equal(h.backend.closureConfirmed(), true); assert.equal(h.releases, 1);
  const next = await h.ready(); next.resetThrows = true; h.backend.close(); next.empty();
  assert.equal(h.backend.closureConfirmed(), false); assert.equal(h.claimed, true); assert.equal(h.releases, 1); assert.equal(h.backend.failureReason(), 'unknown');
});
test('R07 real-browser historical currentSrc is compatible only with a fresh owned emptied event AND actual empty states', async () => {
  const h = harness(), video = await h.ready(); video.autoReset = false; video.historicalCurrentSrc = true; h.backend.close();
  video.readyState = video.networkState = 0; video.paused = true;
  assert.equal(h.backend.closureConfirmed(), false); assert.equal(h.claimed, true);
  video.readyState = 1; video.dispatchEvent(new Event('emptied'));
  assert.equal(h.backend.closureConfirmed(), false); assert.equal(h.claimed, true);
  video.empty(); assert.equal(video.currentSrc, source.url); assert.equal(h.backend.closureConfirmed(), true); assert.equal(h.releases, 1);
});
test('R07 stale source metadata, decoder error and synchronous load failure cannot leave a prepare promise unresolved', async () => {
  const h = harness(); const bad = h.begin(); h.videos[0]!.currentSrc = 'https://synthetic.invalid/other'; h.videos[0]!.metadata();
  await assert.rejects(bad, { code: 'invalid' }); assert.equal(h.backend.closureConfirmed(), true);
  const unsupported = h.begin(); const video = h.videos.at(-1)!; video.error = { code: 4 }; video.dispatchEvent(new Event('error'));
  await assert.rejects(unsupported, { code: 'unsupported' }); assert.equal(h.backend.closureConfirmed(), true);
  h.host.attach = () => { throw new Error('synthetic attach failure'); };
  await assert.rejects(h.begin(), { code: 'network' }); assert.equal(h.backend.closureConfirmed(), true);
});
test('R07 existing coordinator can own integer-rate candidate lifecycle without a second input owner or a synthetic seek tick', async () => {
  const h = harness(); const player = new PlayerCoordinator(h.backend);
  const task = player.open(source); const video = h.videos[0]!; video.metadata(); await task; player.play();
  assert.equal(player.setRate(2), 'accepted'); video.tick(2); assert.equal(player.timeMs, 2000);
  const seek = player.seek(10000); await Promise.resolve(); video.finishSeek(10); await seek;
  assert.equal(player.timeMs, 2000); video.tick(10); assert.equal(player.timeMs, 10000); player.close();
  assert.equal(h.backend.closureConfirmed(), true); assert.equal(h.savers.at(-1), true);
});
