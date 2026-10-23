import { test } from 'node:test';
import assert from 'node:assert/strict';
import { liveCdnUrl, parseLiveProbeRequest, parseLiveProbeResult } from '../../packages/contracts/src/live-probe.ts';
import { plainLivePlaylist, publicLiveSource, rewritePlainLivePlaylist } from '../../packages/media/src/live-hls.ts';
const url = 'https://live-fixture.bilivideo.com/live/test.m3u8?sign=synthetic';
const playlist = '#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-ALLOW-CACHE:NO\n#EXT-X-TARGETDURATION:6\n#EXT-X-MEDIA-SEQUENCE:1234\n#EXTINF:5.5,\nfirst.ts?sign=synthetic\n#EXTINF:6,\nsecond.ts\n';
const scope = { accountId: 'guest', generation: 0, mediaSessionId: 'live', requestId: 'read' };
function api() { return { code: 0, data: { room_id: 7734200, short_id: 6, live_status: 1, encrypted: false, is_locked: false, hidden_till: 0, playurl_info: { playurl: { stream: [{ protocol_name: 'http_hls', format: [{ format_name: 'ts', codec: [{ codec_name: 'avc', base_url: '/live/test.m3u8', url_info: [{ host: 'https://live-fixture.bilivideo.com/', extra: '?sign=synthetic' }] }] }] }] } } } }; }
test('G4 fixed public-room source and plain live TS playlist retain scoped private media only', () => {
  assert.equal(publicLiveSource(api()), url);
  const actualShape = api(); const codec = actualShape.data.playurl_info.playurl.stream[0]!.format[0]!.codec[0]!; codec.base_url += '?expires=synthetic'; codec.url_info[0]!.host = 'https://live-fixture.bilivideo.com'; codec.url_info[0]!.extra = 'sign=synthetic'; assert.equal(publicLiveSource(actualShape), 'https://live-fixture.bilivideo.com/live/test.m3u8?expires=synthetic&sign=synthetic');
  assert.deepEqual(plainLivePlaylist(playlist, url), { firstSegment: 'https://live-fixture.bilivideo.com/live/first.ts?sign=synthetic', segments: 2, targetSeconds: 6 });
});
test('G4 rejects hidden/locked/wrong-room/offline/other-codec sources rather than bypassing access', () => {
  for (const change of [{ room_id: 7 }, { live_status: 0 }, { encrypted: true }, { is_locked: true }, { is_hidden: true }, { hidden_till: 1 }]) { const value = api(); Object.assign(value.data, change); assert.throws(() => publicLiveSource(value)); }
  const value = api(); value.data.playurl_info.playurl.stream[0]!.format[0]!.codec[0]!.codec_name = 'hevc'; assert.throws(() => publicLiveSource(value));
});
test('G4 rejects private hosts, userinfo, ports, lookalikes, scripts, HTTP and raw controls', () => {
  for (const value of ['http://live-fixture.bilivideo.com/a.m3u8', 'https://bilivideo.com.evil.invalid/a.m3u8', 'https://127.0.0.1/a.m3u8', 'https://u:p@live-fixture.bilivideo.com/a.m3u8', 'https://live-fixture.bilivideo.com:9443/a.m3u8', 'https://live-fixture.bilivideo.com/a.m3u8#x', url + '\n', 'https://live-fixture.bilivideo.com\\@evil.invalid/a.m3u8']) assert.throws(() => liveCdnUrl(value, 'm3u8'));
  assert.throws(() => plainLivePlaylist(playlist.replace('first.ts?sign=synthetic', 'https://outside.invalid/a.ts'), url));
});
test('G4 unknown URI tags, encryption, master, map, ENDLIST and unpaired/extreme durations fail closed', () => {
  for (const tag of ['#EXT-X-KEY:METHOD=AES-128,URI="https://outside.invalid/key"', '#EXT-X-MAP:URI="map.mp4"', '#EXT-X-STREAM-INF:BANDWIDTH=100', '#EXT-X-ENDLIST', '#EXT-X-FOO:URI="outside"']) assert.throws(() => plainLivePlaylist(playlist + tag + '\n', url));
  for (const text of [playlist.replace('5.5,', '31,'), playlist.replace('#EXTINF:5.5,\n', ''), playlist + '#EXTINF:3,\n', playlist.repeat(40), playlist.replace('#EXT-X-TARGETDURATION:6', '#EXT-X-TARGETDURATION:0'), playlist.replace('#EXT-X-MEDIA-SEQUENCE:1234\n', '')]) assert.throws(() => plainLivePlaylist(text, url));
});
test('G4 wire scope and closing frames cannot carry raw errors, non-guest identity or leaked URLs on failure', () => {
  const request = parseLiveProbeRequest({ version: 1, operation: 'live-probe', scope });
  assert.equal(parseLiveProbeResult({ ...request, closed: true, code: 'live.source_ready_closed', url }).url, url);
  assert.throws(() => parseLiveProbeRequest({ ...request, scope: { ...scope, accountId: '123' } }));
  assert.throws(() => parseLiveProbeResult({ ...request, closed: true, code: 'live.source_failed_closed', url }));
  assert.throws(() => parseLiveProbeResult({ ...request, closed: false, code: 'live.source_ready_closed', url }));
  assert.throws(() => parseLiveProbeResult({ ...request, closed: true, code: 'raw secret URL' }));
});
test('G4 relay rewrites all validated segment dependencies to opaque relative IDs', () => {
  const seen: string[] = [];
  const text = rewritePlainLivePlaylist(playlist, url, value => { seen.push(value); return 's' + seen.length + '.ts'; });
  assert.match(text, /#EXT-X-MEDIA-SEQUENCE:1234/); assert.match(text, /s1\.ts\n/); assert.match(text, /s2\.ts\n/);
  assert.equal(seen.length, 2); assert.doesNotMatch(text, /https|sign|bilivideo|first\.ts|second\.ts/);
  assert.throws(() => rewritePlainLivePlaylist(playlist, url, () => 'https://outside.invalid/a.ts'));
  assert.throws(() => rewritePlainLivePlaylist(playlist + '#EXT-X-KEY:METHOD=NONE\n', url, () => 's1.ts'));
});
test('G4 relay progress carries only a fixed loopback resource, never a CDN URL or arbitrary listener', () => {
  const request = { version: 1, operation: 'live-probe', scope };
  const frame = { ...request, closed: false, code: 'live.relay_ready', url: 'http://127.0.0.1:40325/' + 'a'.repeat(32) + '/index.m3u8' };
  assert.equal(parseLiveProbeResult(frame).code, 'live.relay_ready');
  for (const value of [url, frame.url.replace('40325','40324'), frame.url.replace('127.0.0.1','10.0.0.9'), frame.url + '?source=private']) assert.throws(() => parseLiveProbeResult({ ...frame, url: value }));
  assert.equal(parseLiveProbeResult({ ...request, closed: false, code: 'live.relay_summary_m12_s20' }).url, undefined);
});
test('live signed query joins cover empty/nonempty base query and delimiter prefixes without changing parameter encoding/order',async()=>{
 const {liveSourceUrl}=await import('../../packages/contracts/src/live-probe.ts');
 for(const [base,extra,query]of [['/live.m3u8','x=a%2Fb&y=2','?x=a%2Fb&y=2'],['/live.m3u8?','?x=a%2Fb&y=2','?x=a%2Fb&y=2'],['/live.m3u8?z=1','&x=2','?z=1&x=2'],['/live.m3u8?z=1&','x=2','?z=1&x=2']])assert.equal(liveSourceUrl('https://fixture.bilivideo.com',base,extra),'https://fixture.bilivideo.com/live.m3u8'+query);
 assert.throws(()=>liveSourceUrl('https://outside.invalid','/live.m3u8?','x=2'),{code:'invalid'});assert.throws(()=>liveSourceUrl('https://fixture.bilivideo.com','//outside.invalid/live.m3u8','x=2'),{code:'invalid'});
});
