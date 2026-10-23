import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeOfferObservation, decodeOfferTrace, OFFER_REASONS, offerObservationCode, offerTraceCode, type OfferObservation } from '../../packages/contracts/src/cast-offer-diagnostics.ts';
import { parseCastProbeResult } from '../../packages/contracts/src/cast-probe.ts';
import { ApprovedSoapReceiver } from '../../packages/cast/src/receiver.ts';
import { receiverOfferReason } from '../../packages/cast/src/offer-diagnostics.ts';
import { diagnosticEntries } from '../../apps/tv/src/app/diagnostics.ts';
import type { SoapRequest } from '../../packages/contracts/src/upnp.ts';
const now = 1800000000000, peer = '0a000009';
const uri = `https://test.bilivideo.com/upgcxcode/1.mp4?deadline=${now / 1000 + 3600}&secret=fixture-marker`;
const offer: SoapRequest = { service: 'AVTransport', kind: 'offer', action: 'SetAVTransportURI', uri, metadata: '' };
const base: OfferObservation = { generation: 2, session: true, state: 'playing', remote: false, reason: 'same_source' };

test('W01 fixed offer trace round trips every reason and preserves the last four decisions without external strings', () => {
  assert.ok(OFFER_REASONS.length <= 32);
  for (const reason of OFFER_REASONS) for (const generation of [1,2,3,4]) for (const state of ['missing','preparing','playing','paused','idle','error','ready'] as const) {
    const value = { ...base, reason, generation, state };
    assert.deepEqual(decodeOfferObservation(offerObservationCode(32, value))?.observation, value);
  }
  const observations = OFFER_REASONS.map(reason => ({ ...base, reason }));
  const code = offerTraceCode(observations, true)!;
  assert.deepEqual(decodeOfferTrace(code), { capped: true, observations: observations.slice(-4) });
  assert.ok(!code.includes('secret')); assert.ok(code.length < 50);
  assert.equal(offerTraceCode([]), undefined);
});
test('W01 offer diagnostic codes reject invalid serials, enums, reserved bits and raw payload IPC', () => {
  for (const serial of [0,33,1.5,NaN]) assert.throws(() => offerObservationCode(serial,base));
  for (const code of ['cast.offer_v1_00400','cast.offer_v1_21400','cast.offer_v1_01fff','cast.offer_v1_014ff','cast.offer_trace_v1_n_ffff','cast.offer_trace_v1_n_'+ '400'.repeat(5),'cast.offer_trace_v1_n_01https']) {
    assert.equal(decodeOfferObservation(code), undefined); assert.equal(decodeOfferTrace(code), undefined);
  }
  const frame = {version:1,operation:'cast-discovery',scope:{accountId:'guest',generation:1,requestId:'cast',mediaSessionId:'media'},closed:false,code:offerObservationCode(1,base)};
  assert.equal(parseCastProbeResult(frame).code, frame.code);
  assert.throws(() => parseCastProbeResult({...frame, closed:true})); assert.throws(() => parseCastProbeResult({...frame, uri}));
});
test('W01 active source-policy rejection distinguishes format, destination and deadline bounds while retaining the old media', () => {
  const r = new ApprovedSoapReceiver(true); r.approve(peer,offer,now);
  r.update({generation:1,frame:1,state:'playing',timeMs:10000,durationMs:240000,seeking:false,controller:'sender'},now);
  const cases: [string, string][] = [[uri.replace('.mp4?', '.m4s?'),'policy_m4s'],[uri.replace('test.bilivideo.com','outside.invalid'),'policy_destination'],[uri.replace('test.bilivideo.com','test.bilivideo.cn'),'policy_destination_cn'],[uri.replace('test.bilivideo.com','test.akamaized.net'),'policy_destination_akamaized'],[uri.replace('.mp4?', '.flv?'),'policy_other_flv'],[uri.replace('/upgcxcode/','/outside/'),'policy_path'],[uri.replace(String(now/1000+3600),String(now/1000+30)),'policy_deadline_near'],[uri.replace(String(now/1000+3600),String(now/1000+172800)),'policy_deadline_far'],['','policy_empty'],['not a URI','policy_malformed']];
  for (const [changed,reason] of cases) {
    const request: SoapRequest = {...offer,uri:changed}; const context = r.offerContext(), decision=r.handle(request,peer,2,now);
    assert.equal(receiverOfferReason(request,decision,context,now),reason);
    assert.ok('reply' in decision && decision.reply.status===500 && !decision.transition);
    assert.equal(r.offerContext().generation,1);
  }
  const same=r.handle(offer,peer,3,now);assert.equal(receiverOfferReason(offer,same,r.offerContext(),now),'same_source');
});
test('W01 offer trace explains single-source and busy denial without weakening either gate', () => {
  const next={...offer,uri:uri+'&part=2'};
  for (const session of [false,true]) {
    const r = new ApprovedSoapReceiver(session);r.approve(peer,offer,now);
    r.update({frame:1,generation:1,state:'preparing',timeMs:0,durationMs:0,seeking:false,controller:'sender'},now);
    const context=r.offerContext(), decision=r.handle(next,peer,2,now);
    assert.equal(receiverOfferReason(next,decision,context,now),session?'busy':'single_source');
    assert.equal(r.offerContext().generation,1);
  }
});
test('W01 eight-entry report pins source decision sequence, last published preparing state, transition, SDK fault and cleanup', () => {
  const trace=offerTraceCode([{...base,reason:'transition_accepted'},{...base,reason:'policy_m4s'}])!;
  const codes=['cast.source_init_mib_1','cast.receiver_summary_v2_7a0c22ef',trace,'cast.exit_g2_preparing_s0','cast.transition_summary_v1_00f','cast.avplay_prepare_timeout_b0_si','cast.media_flow_s_c1_p0_w7_m10_l6','cast.native_closed_confirmed',...Array(12).fill('cast.soap_position_query')];
  const rows=codes.map(code=>({code,verdict:code.startsWith('cast.avplay_prepare')?'FAIL':'UNVERIFIED'}));
  const result=diagnosticEntries(rows);assert.ok(result.length<=8);
  for(const code of [trace,'cast.exit_g2_preparing_s0','cast.transition_summary_v1_00f','cast.avplay_prepare_timeout_b0_si','cast.native_closed_confirmed'])assert.ok(result.some(e=>e.code===code));
});


test('W01/F20 exact Bili Akamai transition emits a fixed accepted classification and keeps foreign, busy and expiry rejection', () => {
  const r=new ApprovedSoapReceiver(true);r.approve(peer,offer,now);
  const next={...offer,uri:uri.replace('test.bilivideo.com','upos-hz-mirrorakam.akamaized.net')};
  r.update({generation:1,frame:1,state:'preparing',timeMs:0,durationMs:0,seeking:false,controller:'sender'},now);
  let context=r.offerContext(), decision=r.handle(next,peer,2,now);
  assert.equal(receiverOfferReason(next,decision,context,now),'busy');
  r.update({generation:1,frame:2,state:'playing',timeMs:12000,durationMs:240000,seeking:false,controller:'sender'},now);
  context=r.offerContext();decision=r.handle(next,'0a000008',3,now);
  assert.equal(receiverOfferReason(next,decision,context,now),'owner');
  context=r.offerContext();decision=r.handle(next,peer,4,now);
  assert.ok('reply' in decision && decision.transition?.generation===2 && decision.reply.status===200);
  assert.equal(receiverOfferReason(next,decision,context,now),'accepted_bili_akam');
  const code=offerTraceCode([{...context,reason:'accepted_bili_akam'}])!;
  assert.equal(decodeOfferTrace(code)?.observations[0]?.reason,'accepted_bili_akam');assert.ok(!code.includes('akamaized'));
  r.update({generation:2,frame:1,state:'playing',timeMs:12000,durationMs:240000,seeking:false,controller:'sender'},now);
  const expired=r.handle({...next,uri:next.uri+'&part=3'},peer,5,now+300000);
  assert.ok('reply' in expired && !expired.transition && expired.reply.status===500);
});


test('W01/G1 compact report keeps isolated timeout confirmation or failure alongside source identity and closure', () => {
  for(const outcome of ['progress','unconfirmed']) {
    const rows=['cast.media_timeout_isolated_g1','cast.media_timeout_'+outcome+'_g1',...(outcome==='unconfirmed'?['cast.media_issue_206_28']:[]),offerTraceCode([{...base,generation:1,reason:'initial_accepted'}])!,'cast.exit_g1_playing_s0','cast.receiver_summary_v2_5a0c00cf','cast.source_init_mib_1','cast.media_flow_s_c1_p0_w8_m3_l6','cast.native_closed_confirmed',...Array(12).fill('cast.soap_position_query')].map(code=>({code,verdict:code==='cast.media_issue_206_28'?'FAIL':'UNVERIFIED'}));
    const selected=diagnosticEntries(rows);assert.ok(selected.length<=8);
    for(const code of ['cast.media_timeout_'+outcome+'_g1','cast.native_closed_confirmed']) assert.ok(selected.some(e=>e.code===code));
    if(outcome==='unconfirmed') assert.ok(selected.some(e=>e.code==='cast.media_issue_206_28'));
  }
});
