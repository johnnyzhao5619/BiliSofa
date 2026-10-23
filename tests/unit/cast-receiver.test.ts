import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApprovedSoapReceiver } from '../../packages/cast/src/receiver.ts';
import { parseReceiverCommand, parseReceiverSnapshot } from '../../packages/contracts/src/cast-receiver.ts';
import type { SoapRequest } from '../../packages/contracts/src/upnp.ts';
import { parseCastProbeResult } from '../../packages/contracts/src/cast-probe.ts';
const now = 1800000000000, peer = '0a000009', other = '0a000008';
const offer: SoapRequest = { service: 'AVTransport', kind: 'offer', action: 'SetAVTransportURI', uri: `http://test.bilivideo.com/upgcxcode/1.mp4?deadline=${now / 1000 + 3600}&x=1`, metadata: '' };
const snap = { frame: 1, state: 'playing', timeMs: 16000, durationMs: 240000, seeking: false, controller: 'sender' };
const query = (action: 'GetTransportInfo' | 'GetPositionInfo' | 'GetMediaInfo' | 'GetCurrentTransportActions'): SoapRequest => ({ service: 'AVTransport', kind: 'query', action });
const command = (action: 'Play' | 'Pause' | 'Stop'): SoapRequest => ({ service: 'AVTransport', kind: 'control', action });
function approved() { const r = new ApprovedSoapReceiver(); r.approve(peer, offer, now); r.update(snap, now); return r; }
function body(d: ReturnType<ApprovedSoapReceiver['handle']>): string { assert.ok('reply' in d); return d.reply.body; }
test('W01/F20 receiver approval is explicit, single-owner and same exact source; private state never leaks to other peers', () => {
  const r = new ApprovedSoapReceiver(); assert.match(body(r.handle(query('GetMediaInfo'), peer, 1, now)), /701/);
  assert.throws(() => r.approve('outside', offer, now)); r.approve(peer, offer, now); assert.throws(() => r.approve(peer, offer, now));
  r.update(snap, now);
  assert.match(body(r.handle(offer, peer, 1, now)), /SetAVTransportURIResponse/);
  assert.match(body(r.handle({ ...offer, uri: offer.uri + '&new=1' }, peer, 2, now)), /701/);
  for (const q of [query('GetMediaInfo'), query('GetPositionInfo'), command('Pause'), offer]) { const b = body(r.handle(q, other, 3, now)); assert.match(b, /701/); assert.ok(!b.includes('bilivideo')); }
  assert.match(body(r.handle(query('GetMediaInfo'), peer, 4, now)), /&amp;x=1/);
});
test('W01/F20 live state comes from validated fresh ordered snapshots; backseek is allowed and stale/expired frames cannot revive', () => {
  const r = approved(); assert.match(body(r.handle(query('GetPositionInfo'), peer, 1, now)), /<RelTime>00:00:16/); assert.match(body(r.handle(query('GetPositionInfo'), peer, 1, now)), /<AbsTime>00:00:16/);
  assert.equal(r.update({ ...snap, frame: 2, timeMs: 5000, state: 'paused' }, now + 100), true);
  assert.equal(r.update(snap, now + 200), false);
  assert.match(body(r.handle(query('GetTransportInfo'), peer, 2, now + 200)), /PAUSED_PLAYBACK/);
  assert.match(body(r.handle(query('GetPositionInfo'), peer, 3, now + 200)), /00:00:05/);
  assert.match(body(r.handle(query('GetMediaInfo'), peer, 4, now + 3101)), /701/);
  assert.equal(r.update({ ...snap, frame: 3 }, now + 300000), false);
  r.end(); assert.equal(r.update({ ...snap, frame: 4 }, now + 10), false);
});
test('W01/F20 single-flight dispatch needs bounded UI acceptance; late acknowledgements and repeated RPCs never re-execute', () => {
  const r = approved(); assert.deepEqual(r.handle(command('Pause'), peer, 1, now), { id: 1, command: { type: 'pause' } });
  assert.match(body(r.handle(query('GetTransportInfo'), peer, 2, now)), /TRANSITIONING/);
  assert.match(body(r.handle(command('Pause'), peer, 3, now)), /701/);
  assert.equal(r.acknowledge(2, true, now), undefined);
  assert.equal(r.acknowledge(1, true, now + 5)?.status, 200);
  assert.equal(r.acknowledge(1, true, now + 5), undefined);
  assert.match(body(r.handle(command('Pause'), peer, 1, now)), /701/);
  assert.ok('command' in r.handle(command('Stop'), peer, 4, now));
  assert.equal(r.acknowledge(4, true, now + 2100)?.status, 500);
  assert.ok('command' in r.handle(command('Stop'), peer, 5, now));
  assert.equal(r.acknowledge(5, false, now)?.status, 500);
});
test('W01/F20 remote ownership locks controls but permits truthful queries, then explicit handback enables phone', () => {
  const r = approved(); r.update({ ...snap, frame: 2, controller: 'remote' }, now);
  assert.match(body(r.handle(command('Pause'), peer, 1, now)), /705/);
  assert.match(body(r.handle(query('GetTransportInfo'), peer, 2, now)), /PLAYING/);
  assert.match(body(r.handle(query('GetCurrentTransportActions'), peer, 3, now)), /<Actions><\/Actions>/);
  r.update({ ...snap, frame: 3 }, now); assert.ok('command' in r.handle(command('Pause'), peer, 4, now));
});
test('W01/F20 seek acceptance is distinct from completion/time tick; invalid target and command flood stay bounded', () => {
  const r = approved(), seek: SoapRequest = { service: 'AVTransport', kind: 'control', action: 'Seek', timeMs: 5000 };
  assert.match(body(r.handle({ ...seek, timeMs: 240000 }, peer, 1, now)), /701/);
  assert.ok('command' in r.handle(seek, peer, 2, now)); r.update({ ...snap, frame: 2, seeking: true }, now);
  assert.equal(r.acknowledge(2, true, now)?.status, 200);
  assert.match(body(r.handle(query('GetTransportInfo'), peer, 3, now)), /TRANSITIONING/);
  assert.match(body(r.handle(query('GetPositionInfo'), peer, 4, now)), /00:00:16/);
  assert.match(body(r.handle(command('Pause'), peer, 5, now)), /701/);
  r.update({ ...snap, frame: 3 }, now);
  for (let id = 6; id < 29; id++) { assert.ok('command' in r.handle(command('Play'), peer, id, now)); r.acknowledge(id, true, now); }
  assert.match(body(r.handle(command('Play'), peer, 29, now)), /701/);
});
test('W01/F20 receiver IPC rejects fractional/NaN/negative times, extra fields and arbitrary commands', () => {
  for (const v of [{ type: 'seek', timeMs: 1.5 }, { type: 'seek', timeMs: NaN }, { type: 'pause', timeMs: 5 }, { type: 'pause', url: 'outside' }, { type: 'Like' }]) assert.throws(() => parseReceiverCommand(v));
  for (const v of [{ ...snap, frame: 0 }, { ...snap, timeMs: -1 }, { ...snap, durationMs: Infinity }, { ...snap, raw: 'outside' }]) assert.throws(() => parseReceiverSnapshot(v));
});
test('W01/F20 command event permits only a scoped request ID and bounded command, never a peer or sender URL', () => {
  const event = { version: 1, operation: 'cast-discovery', scope: { accountId: 'guest', generation: 1, mediaSessionId: 'cast-discovery', requestId: 'r1' }, closed: false, code: 'cast.receiver_command', command: { id: 1, value: { type: 'seek', timeMs: 5000 } } };
  assert.deepEqual(parseCastProbeResult(event), event);
  for (const patch of [{ closed: true }, { command: { id: 1025, value: { type: 'pause' } } }, { command: { id: 1, value: { type: 'play', uri: 'private' } } }, { peer: 'private' }, { scope: { ...event.scope, accountId: 'signed-in' } }]) assert.throws(() => parseCastProbeResult({ ...event, ...patch }));
});

test('W01/F20 approved startup can acknowledge only the exact URI and queued Play before any UI frame, never claim PLAYING', () => {
  const r = new ApprovedSoapReceiver(); r.approve(peer, offer, now);
  assert.match(body(r.handle(offer, peer, 1, now)), /SetAVTransportURIResponse/);
  for (let i = 2; i < 8; i++) assert.match(body(r.handle(command('Play'), peer, i, now + 4000)), /PlayResponse/);
  assert.match(body(r.handle(query('GetTransportInfo'), peer, 8, now + 4000)), /TRANSITIONING/);
  assert.match(body(r.handle(query('GetPositionInfo'), peer, 9, now + 4000)), /<RelTime>00:00:00/);
  assert.match(body(r.handle(command('Pause'), peer, 10, now + 4000)), /701/);
  assert.match(body(r.handle({ ...offer, uri: offer.uri + '&new=1' }, peer, 11, now)), /701/);
  assert.match(body(r.handle(command('Play'), other, 12, now)), /701/);
  assert.equal(r.acknowledge(2, true, now), undefined);
  const late = r.handle(query('GetTransportInfo'), peer, 13, now + 30000); assert.ok('reply' in late); assert.equal(late.stale, 'snapshot_missing');
  r.end(); assert.match(body(r.handle(offer, peer, 14, now)), /701/);
});
test('W01/F20 preparing heartbeat never reads SDK state; stale playing/clock/lease failures remain distinct and locked', () => {
  const r = new ApprovedSoapReceiver(); r.approve(peer, offer, now); r.update({ ...snap, state: 'preparing', timeMs: 0 }, now);
  assert.match(body(r.handle(command('Play'), peer, 1, now + 12000)), /PlayResponse/);
  assert.match(body(r.handle(query('GetTransportInfo'), peer, 2, now + 12000)), /TRANSITIONING/);
  r.update({ ...snap, frame: 2 }, now + 13000);
  for (const [at, reason] of [[now + 16001, 'snapshot_old'], [now + 12999, 'clock'], [now + 300000, 'expired']] as const) {
    const d = r.handle(command('Pause'), peer, 3, at); assert.ok('reply' in d); assert.equal(d.stale, reason); assert.equal(d.reply.status, 500);
  }
});

test('F20 generated metadata uses only approved resource and real duration, with two XML escaping layers', () => {
 const r = approved(); for(const action of ['GetPositionInfo','GetMediaInfo'] as const){
  const result=r.handle(query(action),peer,1,now);assert.ok('reply'in result);assert.equal(result.metadata,'generated');
  assert.match(result.reply.body,/&lt;DIDL-Lite/);assert.match(result.reply.body,/duration=&quot;00:04:00&quot;/);assert.match(result.reply.body,/&amp;amp;x=1/);
  assert.ok(new TextEncoder().encode(result.reply.body).length<=6144);
 }
 assert.ok(!body(r.handle(query('GetMediaInfo'),other,2,now)).includes('DIDL'));
});
test('F20 unknown metadata duration is not invented and escaped response budget cannot exceed native limit', () => {
 const r=new ApprovedSoapReceiver(); const longOffer={...offer,uri:offer.uri+'&'+('&'.repeat(1300))};r.approve(peer,longOffer,now);r.update({...snap,durationMs:0},now);
 const result=r.handle(query('GetPositionInfo'),peer,1,now);assert.ok('reply'in result);assert.equal(result.metadata,'omitted');assert.ok(new TextEncoder().encode(result.reply.body).length<=6144);
 const q=new ApprovedSoapReceiver();q.approve(peer,offer,now);q.update({...snap,durationMs:0},now);assert.ok(!body(q.handle(query('GetMediaInfo'),peer,1,now)).includes('duration='));
});

test('F20 fresh polling and controls survive three minutes but cannot renew five-minute or shorter signed leases', () => {
  const r = approved();
  assert.equal(r.update({ ...snap, frame: 2, timeMs: 181000 }, now + 181000), true);
  assert.match(body(r.handle(query('GetPositionInfo'), peer, 400, now + 181001)), /<RelTime>00:03:01/);
  assert.ok('command' in r.handle(command('Pause'), peer, 401, now + 181002));
  assert.equal(r.acknowledge(401, true, now + 181003)?.status, 200);
  assert.equal(r.update({ ...snap, frame: 3, state: 'paused', timeMs: 181000 }, now + 299999), true);
  assert.match(body(r.handle(query('GetTransportInfo'), peer, 600, now + 299999)), /PAUSED_PLAYBACK/);
  assert.equal(r.update({ ...snap, frame: 4 }, now + 300000), false);
  const expired = r.handle(offer, peer, 601, now + 300000); assert.ok('reply' in expired); assert.equal(expired.stale, 'expired');
  const short = new ApprovedSoapReceiver();
  short.approve(peer, { ...offer, uri: offer.uri.replace(String(now / 1000 + 3600), String(now / 1000 + 100)) }, now);
  assert.equal(short.update({ ...snap, frame: 2 }, now + 94999), true);
  assert.match(body(short.handle(query('GetPositionInfo'), peer, 1, now + 94999)), /<RelTime>00:00:16/);
  assert.equal(short.update({ ...snap, frame: 3 }, now + 95000), false);
  assert.match(body(short.handle(offer, peer, 2, now + 95000)), /701/);
  r.end(); assert.equal(r.update({ ...snap, frame: 5 }, now + 300001), false);
});

test('W01/F20 explicit session replaces one approved source, resets the timeline and rejects old media generations', () => {
  const r = new ApprovedSoapReceiver(true); r.approve(peer, offer, now);
  assert.equal(r.update({ ...snap, generation: 1 }, now), true);
  const next = { ...offer, uri: offer.uri + '&part=2' };
  const d = r.handle(next, peer, 2, now + 10); assert.ok('reply' in d && d.transition);
  assert.equal(d.reply.status, 200); assert.equal(d.transition.generation, 2); assert.match(d.transition.url, /^https:/);
  assert.match(body(r.handle(query('GetTransportInfo'), peer, 3, now + 20)), /TRANSITIONING/);
  assert.match(body(r.handle(query('GetPositionInfo'), peer, 4, now + 20)), /<TrackDuration>00:00:00/);
  assert.equal(r.update({ ...snap, frame: 999, generation: 1 }, now + 30), false);
  assert.equal(r.update(snap, now + 30), false);
  assert.equal(r.update({ ...snap, frame: 1, durationMs: 600000, generation: 2 }, now + 30), true);
  assert.match(body(r.handle(query('GetPositionInfo'), peer, 5, now + 40)), /<TrackDuration>00:10:00/);
  assert.ok(!('transition' in r.handle(next, peer, 6, now + 40)));
});
test('W01/F20 session source changes preserve ownership, lock, busy, destination and original expiry gates', () => {
  const r = new ApprovedSoapReceiver(true); r.approve(peer, offer, now); r.update({ ...snap, generation: 1 }, now);
  const next = { ...offer, uri: offer.uri + '&part=2' };
  assert.match(body(r.handle(next, other, 2, now)), /701/);
  r.update({ ...snap, frame: 2, controller: 'remote', generation: 1 }, now); assert.match(body(r.handle(next, peer, 3, now)), /705/);
  r.update({ ...snap, frame: 3, seeking: true, generation: 1 }, now); assert.ok(!('transition' in r.handle(next, peer, 4, now)));
  r.update({ ...snap, frame: 4, generation: 1 }, now);
  assert.ok(!('transition' in r.handle({ ...next, uri: 'https://outside.invalid/secret' }, peer, 5, now)));
  assert.match(body(r.handle(query('GetMediaInfo'), peer, 6, now)), /1.mp4/);
  assert.ok(!('transition' in r.handle(next, peer, 7, now + 4000)));
  r.update({ ...snap, frame: 5, generation: 1 }, now + 299000);
  assert.ok(!('transition' in r.handle(next, peer, 8, now + 299000)));
  assert.ok(!('transition' in r.handle(next, peer, 9, now - 1)));
});
test('W01/F20 session allows at most four sources without renewing the original lease or command count', () => {
  const r = new ApprovedSoapReceiver(true); r.approve(peer, offer, now);
  for (let generation = 1; generation <= 4; generation++) {
    r.update({ ...snap, generation, frame: 1 }, now + generation * 1000);
    const d = r.handle({ ...offer, uri: offer.uri + '&part=' + (generation + 1) }, peer, generation + 1, now + generation * 1000);
    assert.ok('reply' in d); assert.equal(!!d.transition, generation < 4);
  }
  assert.match(body(r.handle(query('GetPositionInfo'), peer, 10, now + 300000)), /701/);
});
test('W01/F20 transition IPC carries only a scoped generation and random loopback token, never a remote source', () => {
  const scope = { accountId: 'guest', generation: 1, requestId: 'cast', mediaSessionId: 'media' };
  const message = { version: 1, operation: 'cast-discovery', scope, closed: false, code: 'cast.transition_requested', transition: { generation: 2, token: 'a'.repeat(32) } };
  assert.equal(parseCastProbeResult(message).transition?.generation, 2);
  for (const transition of [{ ...message.transition, generation: 1 }, { ...message.transition, generation: 5 }, { ...message.transition, url: 'https://private.invalid/' }, { generation: 2, token: 'token' }]) assert.throws(() => parseCastProbeResult({ ...message, transition }));
  assert.throws(() => parseCastProbeResult({ ...message, closed: true }));
});
