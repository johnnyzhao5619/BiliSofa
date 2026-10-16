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
  const r = approved(); assert.match(body(r.handle(query('GetPositionInfo'), peer, 1, now)), /<RelTime>00:00:16/);
  assert.equal(r.update({ ...snap, frame: 2, timeMs: 5000, state: 'paused' }, now + 100), true);
  assert.equal(r.update(snap, now + 200), false);
  assert.match(body(r.handle(query('GetTransportInfo'), peer, 2, now + 200)), /PAUSED_PLAYBACK/);
  assert.match(body(r.handle(query('GetPositionInfo'), peer, 3, now + 200)), /00:00:05/);
  assert.match(body(r.handle(query('GetMediaInfo'), peer, 4, now + 3101)), /701/);
  assert.equal(r.update({ ...snap, frame: 3 }, now + 180000), false);
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
  for (const patch of [{ closed: true }, { command: { id: 129, value: { type: 'pause' } } }, { command: { id: 1, value: { type: 'play', uri: 'private' } } }, { peer: 'private' }, { scope: { ...event.scope, accountId: 'signed-in' } }]) assert.throws(() => parseCastProbeResult({ ...event, ...patch }));
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
  for (const [at, reason] of [[now + 16001, 'snapshot_old'], [now + 12999, 'clock'], [now + 180000, 'expired']] as const) {
    const d = r.handle(command('Pause'), peer, 3, at); assert.ok('reply' in d); assert.equal(d.stale, reason); assert.equal(d.reply.status, 500);
  }
});
