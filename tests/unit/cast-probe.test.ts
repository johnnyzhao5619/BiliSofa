import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPrivateProbeAddress, parseCastProbeRequest, parseCastProbeResult } from '../../packages/contracts/src/cast-probe.ts';
import { CastProbeWorker, castProbeIdentity } from '../../apps/tv/src/platform/cast-probe-worker.ts';
const scope = { accountId: 'guest', generation: 1, mediaSessionId: 'cast-discovery', requestId: 'r1' };
const request = { version: 1, operation: 'cast-discovery', scope, address: '10.0.0.9', uuid: '01234567-89ab-4cde-8123-456789abcdef', token: '0123456789abcdef0123456789abcdef' };
test('W01/F20 probe only accepts scoped private IPv4 and own bounded random identities', () => {
  assert.deepEqual(parseCastProbeRequest(request), request);
  for (const address of ['10.0.0.1', '172.16.0.1', '172.31.255.1', '192.168.0.1']) assert.equal(isPrivateProbeAddress(address), true);
  for (const address of ['10.00.0.1', '127.0.0.1', '8.8.8.8', '172.32.0.1', '169.254.0.1', '192.168.0.256', '239.255.255.250', '10.0.0.1:1900']) assert.throws(() => parseCastProbeRequest({ ...request, address }));
  for (const patch of [{ uuid: 'outside' }, { token: '../path' }, { address: '10.0.0.1\r\nHost: other' }, { scope: { ...scope, accountId: 'signed-in' } }, { headers: {} }, { url: 'https://outside.invalid' }]) assert.throws(() => parseCastProbeRequest({ ...request, ...patch }));
});
test('W01/F20 observer IPC exposes only fixed facts and canonical closure counts, never raw data or cleanup stage17', () => {
  const result = { version: 1, operation: 'cast-discovery', scope, closed: true, code: 'cast.closed_1_2_1_0_0_0_0' };
  assert.deepEqual(parseCastProbeResult(result), result);
  for (const patch of [{ code: 'cast.failed_17' }, { code: 'cast.closed_001_2_1_0_0_0_0' }, { code: 'cast.closed_1000_2_1_0_0_0_0' }, { code: 'cast.ready' }, { address: request.address }, { uuid: request.uuid }, { raw: '<xml/>' }]) assert.throws(() => parseCastProbeResult({ ...result, ...patch }));
  assert.equal(parseCastProbeResult({ ...result, closed: false, code: 'cast.seen_setup_rejected' }).closed, false);
  for (const code of ['cast.failed_131', 'cast.failed_132']) assert.equal(parseCastProbeResult({ ...result, code }).closed, true);
  assert.throws(() => parseCastProbeResult({ ...result, code: 'cast.failed_133' }));
  assert.equal(parseCastProbeResult({ ...result, closed: false, code: 'cast.soap_mp4_offer_rejected' }).closed, false);
  assert.throws(() => parseCastProbeResult({ ...result, closed: false, code: 'cast.soap_private_payload' }));
});
test('W01/F20 probe identity persists only an app-generated UUID; each lease gets a new token and denied storage is safe', () => {
  const values = new Map<string, string>(), storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } } as Storage;
  const first = castProbeIdentity(storage), second = castProbeIdentity(storage); assert.equal(first.uuid, second.uuid); assert.notEqual(first.token, second.token); assert.equal(values.size, 1);
  assert.equal([...values.keys()][0], 'bilisofa.probe.discovery-uuid');
  values.set('bilisofa.probe.discovery-uuid', '<outside>'); assert.notEqual(castProbeIdentity(storage).uuid, '<outside>');
  const denied = { getItem() { throw Error(); }, setItem() { throw Error(); } } as unknown as Storage;
  const ephemeral = castProbeIdentity(denied); assert.match(ephemeral.uuid, /^[a-f0-9-]{36}$/); assert.notEqual(ephemeral.uuid, first.uuid);
});
test('W01/F20 probe retains native Worker until close; cancelled discovery waits for ACK before another listener', async () => {
  const prior = globalThis.Worker, instances: FakeWorker[] = [];
  class FakeWorker {
    onmessage?: (event: { data: unknown }) => void; stopped = false;
    constructor(file: string) { assert.equal(file, 'cast-worker.js'); instances.push(this); }
    postMessage() {} terminate() { this.stopped = true; } reply(data: unknown) { this.onmessage?.({ data }); }
  }
  globalThis.Worker = FakeWorker as unknown as typeof Worker;
  const tick = () => new Promise<void>(resolve => setImmediate(resolve));
  const event = { version: 1, operation: 'cast-discovery', scope, closed: false, code: 'cast.ready' };
  try {
    const client = new CastProbeWorker(), controller = new AbortController(), first = client.run(parseCastProbeRequest(request), controller.signal, () => {}); await tick(); instances[0]!.reply(event); assert.equal(instances[0]!.stopped, false);
    const rejected = assert.rejects(first, /cancelled/); controller.abort(); await rejected;
    const scope2 = { ...scope, requestId: 'r2' }, next = client.run(parseCastProbeRequest({ ...request, scope: scope2 }), new AbortController().signal, () => {}); await tick(); assert.equal(instances.length, 1);
    instances[0]!.reply({ ...event, closed: true, code: 'cast.closed_1_1_1_0_0_0_0' }); await tick(); assert.equal(instances.length, 2);
    instances[1]!.reply({ ...event, scope: scope2, closed: true, code: 'cast.failed_12' }); assert.equal((await next).code, 'cast.failed_12'); await client.dispose();
  } finally { globalThis.Worker = prior; }
});


test('W01/F20 fixed summary preserves every known fact including bit31/32; rejects unknown bits and arbitrary text', async () => {
  const { SOAP_PROBE_FACTS, SOURCE_POLICY_REASONS, CAST_PROGRESS_LIMIT, soapProbeSummary, decodeSoapProbeSummary } = await import('../../packages/contracts/src/upnp.ts');
  assert.ok(SOAP_PROBE_FACTS.length <= 64); assert.equal((await import('../../packages/contracts/src/cast-receiver.ts')).RECEIVER_FACTS.length, 32); assert.equal(CAST_PROGRESS_LIMIT, (SOAP_PROBE_FACTS.length + SOURCE_POLICY_REASONS.length + 20 + 5 + 6 + 24 + 32 + 3 + 5 + 5 + 2 + 3 + 2 + 32) * 4 + 15 + 33 + 4);
  const codes = SOAP_PROBE_FACTS.map(fact => `cast.soap_${fact}`);
  assert.deepEqual(decodeSoapProbeSummary(soapProbeSummary(codes)!), [...SOAP_PROBE_FACTS]);
  assert.equal(soapProbeSummary(['cast.ready', 'private-fixture-marker', 'cast.soap_unknown']), undefined);
  assert.deepEqual(decodeSoapProbeSummary('cast.soap_summary_v1_0000000080000000'), ['receiver_metadata_omitted']);
  const duplicate = soapProbeSummary([codes[31]!, codes[32]!, codes[31]!]); assert.deepEqual(decodeSoapProbeSummary(duplicate!), [SOAP_PROBE_FACTS[31], SOAP_PROBE_FACTS[32]]);
  for (const code of ['cast.soap_summary_v1_00000000800000000', 'cast.soap_summary_v1_0000000000000000', 'cast.soap_summary_v2_0000000100000000', 'cast.soap_summary_v1_private-fixture-marker']) assert.deepEqual(decodeSoapProbeSummary(code), []);
  for (const code of codes) assert.equal(parseCastProbeResult({ version: 1, operation: 'cast-discovery', scope, closed: false, code }).code, code);
  const { diagnosticEntries } = await import('../../apps/tv/src/app/diagnostics.ts');
  const summary = { verdict: 'UNVERIFIED', code: soapProbeSummary(codes)! }, issue = { verdict: 'FAIL', code: 'ugc.bridge_issue_1' };
  const selected = diagnosticEntries([summary, issue, ...Array.from({ length: 12 }, (_, i) => ({ verdict: 'PASS', code: `cast.progress_${i}` }))]);
  assert.equal(selected.length, 8); assert.ok(selected.includes(summary)); assert.ok(selected.includes(issue));
});

test('W01/F20 media progress cannot close the cast lease or carry arbitrary URLs/status fields', () => {
  for (const code of ['approved', 'ready', 'served', 'stopped', 'expired', 'unavailable', 'failed', 'issue_400_0', 'issue_206_60']) {
    const value = { version: 1, operation: 'cast-discovery', scope, closed: false, code: 'cast.media_' + code };
    assert.equal(parseCastProbeResult(value).closed, false);
    assert.throws(() => parseCastProbeResult({ ...value, closed: true }));
    assert.throws(() => parseCastProbeResult({ ...value, url: 'http://127.0.0.1/private' }));
  }
  assert.throws(() => parseCastProbeResult({ version: 1, operation: 'cast-discovery', scope, closed: false, code: 'cast.media_private' }));
});
test('W01/F20 TV approval control stays scoped to the current live Worker and is unavailable during cancellation', async () => {
  const prior = globalThis.Worker, sent: unknown[] = [];
  let instance: { onmessage?: (event: { data: unknown }) => void };
  class FakeWorker {
    onmessage?: (event: { data: unknown }) => void;
    constructor() { instance = this; }
    postMessage(value: unknown) { sent.push(value); } terminate() {}
  }
  globalThis.Worker = FakeWorker as unknown as typeof Worker;
  try {
    const client = new CastProbeWorker(); assert.equal(client.approveCandidate(), false);
    const running = client.run(request as Parameters<CastProbeWorker['run']>[0], new AbortController().signal, () => {});
    await new Promise<void>(resolve => setImmediate(resolve));
    assert.equal(client.approveCandidate(), true);
    assert.deepEqual(sent.at(-1), { version: 1, operation: 'cast-discovery', scope, control: 'play-candidate' });
    const rejected = assert.rejects(running, /cancelled/), closed = client.dispose(); await rejected;
    assert.equal(client.approveCandidate(), false);
    instance!.onmessage?.({ data: { version: 1, operation: 'cast-discovery', scope, closed: true, code: 'cast.closed_0_0_0_0_0_0_0' } });
    await closed; assert.equal(client.approveCandidate(), false);
  } finally { globalThis.Worker = prior; }
});
test('W01/F20 compact evidence preserves candidate playback observation alongside source proof and later polling', async () => {
  const { diagnosticEntries } = await import('../../apps/tv/src/app/diagnostics.ts');
  const source = { verdict: 'PASS', code: 'cast.source_pass' }, media = { verdict: 'UNVERIFIED', code: 'cast.avplay_started_visual_audio_check_required' };
  const entries = diagnosticEntries([source, media, ...Array.from({ length: 12 }, (_, i) => ({ verdict: 'UNVERIFIED', code: 'cast.poll_' + i }))]);
  assert.equal(entries.length, 8); assert.ok(entries.includes(source)); assert.ok(entries.includes(media));
});

test('W01/F20 confirmation receipt and Worker approval survive later polling in the eight-entry report', async () => {
  const { diagnosticEntries } = await import('../../apps/tv/src/app/diagnostics.ts');
  const confirmation = { verdict: 'UNVERIFIED', code: 'cast.candidate_confirm_sent' }, approval = { verdict: 'UNVERIFIED', code: 'cast.media_approved' };
  const selected = diagnosticEntries([confirmation, approval, ...Array.from({ length: 16 }, (_, i) => ({ verdict: 'UNVERIFIED', code: 'cast.poll_' + i }))]);
  assert.equal(selected.length, 8); assert.ok(selected.includes(confirmation)); assert.ok(selected.includes(approval));
});

test('W01 MP4 request types are fixed bits and preserve cleanup plus source and player failure within eight entries', async () => {
  const { CAST_MEDIA_REQUESTS, mediaRequestSummary, isMediaRequestSummary, soapProbeSummary } = await import('../../packages/contracts/src/upnp.ts');
  const { diagnosticEntries } = await import('../../apps/tv/src/app/diagnostics.ts');
  const requests = mediaRequestSummary(CAST_MEDIA_REQUESTS.map(kind => 'cast.media_request_' + kind)); assert.equal(requests, 'cast.media_requests_v1_1f'); assert.ok(isMediaRequestSummary(requests!));
  for (const value of ['cast.media_requests_v1_00', 'cast.media_requests_v1_20', 'cast.media_requests_v1_private']) assert.equal(isMediaRequestSummary(value), false);
  const codes = ['cast.source_pass', 'cast.source_policy_supported', 'cast.candidate_confirm_sent', 'cast.media_approved', 'cast.avplay_prepare_unknownerror', soapProbeSummary(['cast.soap_transport_query'])!, requests!, 'cast.native_closed_confirmed'];
  const entries = diagnosticEntries(codes.map(code => ({ code, verdict: code.startsWith('cast.avplay') ? 'FAIL' : 'UNVERIFIED' })));
  assert.ok(entries.length <= 8); for (const code of codes.filter(code => !code.includes('policy'))) assert.ok(entries.some(e => e.code === code));
});

test('W01 latest seek outcome and earlier failure survive cleanup without overflowing eight entries', async () => {
  const { diagnosticEntries } = await import('../../apps/tv/src/app/diagnostics.ts');
  const codes = ['cast.soap_summary_v1_8000400402002010', 'cast.source_pass', 'cast.candidate_confirm_sent', 'cast.media_approved', 'cast.avplay_started_visual_audio_check_required', 'cast.media_requests_v1_02', 'avplay.seek_callback_unknownerror_b0_t0', 'avplay.seek_callback_success_b0_t1', ...Array.from({ length: 12 }, (_, i) => 'cast.poll_' + i), 'cast.native_closed_confirmed'];
  const chosen = diagnosticEntries(codes.map(code => ({ code, verdict: code === 'avplay.seek_callback_unknownerror_b0_t0' ? 'FAIL' : 'UNVERIFIED' })));
  assert.equal(chosen.length, 8); for (const code of [codes[6], codes[7], codes.at(-1)]) assert.ok(chosen.some(e => e.code === code));
});

test('W01 seek history retains multiple attempts plus actual failure and cleanup in eight entries without duplicate range summary', async () => {
  const { diagnosticEntries } = await import('../../apps/tv/src/app/diagnostics.ts');
  const codes = ['cast.soap_summary_v1_8000400402002010', 'cast.source_pass', 'cast.media_approved', 'cast.avplay_started_visual_audio_check_required', 'avplay.seek_restart_started_b0_t0', 'avplay.seek_history_v1_rrw', 'avplay.seek_history_v1_rrf', 'avplay.seek_callback_invalidvalueserror_b0_t0', 'cast.media_requests_v1_02', 'cast.media_requests_v1_02', 'cast.native_closed_confirmed'];
  const selected = diagnosticEntries(codes.map(code => ({ code, verdict: code === 'avplay.seek_callback_invalidvalueserror_b0_t0' ? 'FAIL' : 'UNVERIFIED' })));
  assert.equal(selected.length, 8); for (const code of ['avplay.seek_history_v1_rrf', 'avplay.seek_callback_invalidvalueserror_b0_t0', 'cast.native_closed_confirmed']) assert.ok(selected.some(e => e.code === code));
  assert.equal(selected.filter(e => e.code === 'cast.media_requests_v1_02').length, 1);
});

test('W01 bridge flow/limits are canonical coarse facts with numeric bounds, not open diagnostic payloads', () => {
  const scope = { accountId: 'guest', generation: 0, mediaSessionId: 'fixture', requestId: 'r' };
  for (const code of ['cast.media_flow_e_c4_p4_w256_m128_l6', 'cast.media_flow_s_c0_p0_w0_m0_l0', 'cast.media_limit_bytes', 'cast.media_limit_windows', 'cast.media_limit_connections', 'cast.media_limit_lease', 'cast.media_retry_1', 'cast.media_retry_3']) assert.equal(parseCastProbeResult({ version: 1, operation: 'cast-discovery', scope, closed: false, code }).code, code);
  for (const code of ['cast.media_flow_e_c0_p1_w0_m0_l0', 'cast.media_flow_e_c4_p4_w257_m0_l0', 'cast.media_flow_e_c4_p4_w0_m129_l0', 'cast.media_flow_e_c4_p4_w00_m0_l0', 'cast.media_flow_e_c4_p4_w0_m0_l7', 'cast.media_limit_url', 'cast.media_retry_0', 'cast.media_retry_4']) assert.throws(() => parseCastProbeResult({ version: 1, operation: 'cast-discovery', scope, closed: false, code }));
});
test('W01 SDK and independent native failure, flow snapshot, history and closure all survive automatic report', async () => {
  const { diagnosticEntries } = await import('../../apps/tv/src/app/diagnostics.ts');
  const codes = ['cast.source_pass', 'cast.media_requests_v1_02', 'cast.media_flow_e_c4_p4_w100_m128_l4', 'cast.media_limit_bytes', 'cast.media_issue_206_23', 'avplay.seek_callback_invalidvalueserror_b0_t0_si', 'avplay.seek_history_v1_ssf', 'avplay.control_check_failed_network', 'cast.media_flow_s_c0_p0_w100_m128_l4', 'cast.native_closed_confirmed'];
  const chosen = diagnosticEntries(codes.map(code => ({ code, verdict: /invalidvalueserror|failed_network|issue_/.test(code) ? 'FAIL' : 'UNVERIFIED' })));
  assert.equal(chosen.length, 8); for (const code of [codes[2], codes[3], codes[4], codes[5], codes[6], codes[7], codes[9]]) assert.ok(chosen.some(e => e.code === code));
});
test('W01 native error remains pinned after stopped progress and later SDK/control errors', async () => {
  const { diagnosticEntries } = await import('../../apps/tv/src/app/diagnostics.ts');
  const codes = ['cast.source_pass', 'cast.media_issue_206_28', 'cast.media_flow_e_c2_p0_w4_m6_l5', 'avplay.seek_callback_invalidvalueserror_b0_t0_sp', 'avplay.seek_history_v1_se', 'avplay.control_check_failed_network', 'cast.media_stopped', 'cast.native_closed_confirmed'];
  const chosen = diagnosticEntries(codes.map(code => ({ code, verdict: /issue_|failed_|invalidvalues/.test(code) ? 'FAIL' : 'UNVERIFIED' })));
  assert.ok(chosen.some(e => e.code === codes[1])); assert.ok(chosen.some(e => e.code === codes[3])); assert.ok(chosen.some(e => e.code === codes[6])); assert.equal(chosen.length, 8);
});

test('W01 bounded reconnect progress is preserved with SDK outcome and native closure', async () => {
  const { diagnosticEntries } = await import('../../apps/tv/src/app/diagnostics.ts');
  const codes=['cast.source_pass','cast.media_retry_1','cast.media_retry_2','avplay.seek_callback_success_b0_t1','avplay.seek_history_v1_sss','avplay.control_check_complete_timeline_only','cast.media_flow_s_c0_p0_w6_m8_l4','cast.native_closed_confirmed'];
  const chosen=diagnosticEntries(codes.map(code=>({ code,verdict:'UNVERIFIED' })));
  assert.ok(chosen.some(e=>e.code==='cast.media_retry_2'));assert.ok(chosen.some(e=>e.code==='avplay.seek_history_v1_sss'));assert.ok(chosen.some(e=>e.code==='cast.native_closed_confirmed'));assert.ok(chosen.length<=8);
});

test('W01 initial prepare report pins reconnect progress and never exceeds eight entries', async () => {
 const { diagnosticEntries }=await import('../../apps/tv/src/app/diagnostics.ts');
 const codes=['cast.source_pass','cast.candidate_confirm_sent','cast.media_approved','cast.media_retry_1','cast.media_requests_v1_02','cast.avplay_prepare_timeout_b1_si','cast.media_flow_s_c1_p0_w3_m5_l6','cast.native_closed_confirmed'];
 const selected=diagnosticEntries(codes.map(code=>({code,verdict:code.includes('timeout')?'FAIL':'UNVERIFIED'})));
 assert.ok(selected.some(e=>e.code==='cast.media_retry_1'));assert.ok(selected.length<=8);
});

test('W01/F20 receiver summary survives a paused remote seek failure alongside independent network issue and cleanup', async () => {
  const { diagnosticEntries } = await import('../../apps/tv/src/app/diagnostics.ts');
  const codes=['cast.source_pass','cast.receiver_summary_v1_0001f','avplay.seek_callback_invalidvalueserror_b0_t0_sh','avplay.seek_history_v1_e','cast.media_resume_1','cast.media_flow_e_c2_p0_w7_m12_l4','cast.media_issue_206_28','cast.native_closed_confirmed'];
  const selected=diagnosticEntries(codes.map(code=>({code,verdict:/invalidvalues|issue_/.test(code)?'FAIL':'UNVERIFIED'})));
  assert.equal(selected.length,8); for(const code of codes.slice(1)) assert.ok(selected.some(e=>e.code===code));
  const event={version:1,operation:'cast-discovery',scope,closed:false};
  for(const code of ['cast.media_resume_1','cast.media_resume_2','cast.media_resume_3']) assert.equal(parseCastProbeResult({...event,code}).code,code);
  for(const code of ['cast.media_resume_0','cast.media_resume_4','cast.media_resume_01']) assert.throws(()=>parseCastProbeResult({...event,code}));
});

test('W01/F20 v2 receiver diagnostics pin startup frame/timeline summary, native flow and closure without hiding them behind approval', async () => {
  const { diagnosticEntries } = await import('../../apps/tv/src/app/diagnostics.ts');
  const codes=['cast.receiver_summary_v2_1fffffff','cast.soap_summary_v1_8000400408002010','cast.source_pass','cast.candidate_confirm_sent','cast.media_approved','cast.avplay_started_visual_audio_check_required','cast.media_requests_v1_02','cast.media_flow_s_c2_p0_w3_m5_l4','cast.native_closed_confirmed'];
  const selected=diagnosticEntries(codes.map(code=>({code,verdict:'UNVERIFIED'})));
  assert.equal(selected.length,8); for (const code of [codes[0],codes[2],codes[5],codes[6],codes[7],codes[8]]) assert.ok(selected.some(e=>e.code===code));
  for(const fact of ['snapshot_received','snapshot_applied','snapshot_rejected','denied_snapshot_missing','denied_snapshot_old','denied_expired','denied_clock']) assert.equal(parseCastProbeResult({version:1,operation:'cast-discovery',scope,closed:false,code:'cast.receiver_'+fact}).closed,false);
});

test('W01 bounded MP4 layout facts are canonical and survive source-only reporting without TV play', async () => {
 const {diagnosticEntries}=await import('../../apps/tv/src/app/diagnostics.ts');
 for(const layout of ['moov_first','mdat_first','fragmented','prefix_exhausted','invalid']) assert.equal(parseCastProbeResult({version:1,operation:'cast-discovery',scope,closed:false,code:'cast.source_layout_'+layout}).closed,false);
 assert.throws(()=>parseCastProbeResult({version:1,operation:'cast-discovery',scope,closed:false,code:'cast.source_layout_raw_bytes'}));
 const rows=['cast.source_layout_mdat_first','cast.source_pass',...Array.from({length:12},(_,i)=>'cast.progress_'+i)].map(code=>({code,verdict:'UNVERIFIED'}));
 const selected=diagnosticEntries(rows);assert.equal(selected.length,8);assert.ok(selected.some(e=>e.code==='cast.source_layout_mdat_first'));
});

test('W01 diagnostics excludes older cast-run failures, seek history and layouts from the latest report', async () => {
  const { diagnosticEntries } = await import('../../apps/tv/src/app/diagnostics.ts');
  const entries = [{run:1,code:'avplay.seek_restart_held_b0_t0',verdict:'UNVERIFIED'}, {run:1,code:'avplay.seek_history_v1_r',verdict:'UNVERIFIED'}, {run:1,code:'cast.avplay_error',verdict:'FAIL'}, {run:2,code:'cast.receiver_summary_v2_1a0c015d',verdict:'UNVERIFIED'}, {run:2,code:'avplay.seek_event_player_error_connection_failed',verdict:'FAIL'}, {run:2,code:'cast.native_closed_confirmed',verdict:'PASS'}];
  const chosen = diagnosticEntries(entries); assert.ok(chosen.every(e=>e.run===2)); assert.ok(chosen.some(e=>e.code===entries[4]!.code));
});

test('W01 current receiver query summary and known duration remain in the eight-entry report', async () => {
 const { diagnosticEntries } = await import('../../apps/tv/src/app/diagnostics.ts');
 const rows=['cast.receiver_summary_v2_1a0c0005','cast.media_flow_s_c1_p0_w3_m6_l6','cast.native_closed_confirmed','cast.source_pass','cast.media_requests_v1_02','cast.soap_summary_v1_0000000000000018','avplay.receiver_duration_known','cast.source_layout_moov_first'].map(code=>({code,verdict:'UNVERIFIED'}));
 const selected=diagnosticEntries(rows);assert.equal(selected.length,8);assert.ok(selected.some(e=>e.code==='avplay.receiver_duration_known'));assert.ok(selected.some(e=>e.code.startsWith('cast.soap_summary_')));
});


test('W01 native position socket evidence and SOAP summary survive a successful seek history', async () => {
  const { diagnosticEntries } = await import('../../apps/tv/src/app/diagnostics.ts');
  const codes = ['cast.position_wire_v1_01', 'cast.position_wire_v1_0f', 'cast.soap_summary_v1_8000400c72002010', 'cast.receiver_summary_v2_5a0c00f5', 'avplay.seek_history_v1_r', 'avplay.seek_restart_held_b0_t0', 'cast.native_closed_confirmed', 'cast.source_pass', 'cast.media_requests_v1_02', 'cast.media_flow_s_c0_p0_w7_m12_l5'];
  const selected = diagnosticEntries(codes.map(code => ({code, verdict:'UNVERIFIED'})));
  assert.equal(selected.length, 8);
  for (const code of [codes[1], codes[2], codes[3], codes[4], codes[5], codes[6]]) assert.ok(selected.some(e => e.code === code));
  assert.ok(!selected.some(e => e.code === codes[0]));
  for (const suffix of ['01','0f','10','1f']) assert.equal(parseCastProbeResult({version:1,operation:'cast-discovery',scope,closed:false,code:'cast.position_wire_v1_'+suffix}).closed,false);
  for (const suffix of ['00','20','ff','01_address']) assert.throws(() => parseCastProbeResult({version:1,operation:'cast-discovery',scope,closed:false,code:'cast.position_wire_v1_'+suffix}));
});


test('W01 explicit TV consent for only the next eligible source is scoped and cannot be forged with extra payloads', () => {
  assert.deepEqual(parseCastProbeRequest({...request,receiverApproval:'next-source'}), {...request,receiverApproval:'next-source'});
  for (const patch of [{receiverApproval:true},{receiverApproval:'all-sources'},{receiverApproval:undefined},{receiverApproval:'next-source',url:'https://outside.invalid/'}]) assert.throws(()=>parseCastProbeRequest({...request,...patch}));
});


test('W01 polling connection budget uses bounded RPC IDs through 1024 and preserves explicit listener stop reason', async () => {
  const {receiverId}=await import('../../packages/contracts/src/cast-receiver.ts');
  const {diagnosticEntries}=await import('../../apps/tv/src/app/diagnostics.ts');
  for(const id of [128,129,1024])assert.equal(receiverId(id),id);
  for(const id of [0,1025,1.5])assert.throws(()=>receiverId(id));
  for(const reason of ['connections','lease'])assert.equal(parseCastProbeResult({version:1,operation:'cast-discovery',scope,closed:false,code:'cast.listener_limit_'+reason}).closed,false);
  assert.throws(()=>parseCastProbeResult({version:1,operation:'cast-discovery',scope,closed:false,code:'cast.listener_limit_raw_address'}));
  const rows=['cast.listener_limit_connections','avplay.seek_restart_held_b1_t0','cast.receiver_summary_v2_7a0c00cf','cast.media_stopped','avplay.seek_history_v1_r','cast.native_closed_confirmed','cast.position_wire_v1_0f','cast.soap_summary_v1_0000000c78002010','cast.media_flow_s_c0_p0_w5_m9_l4'].map(code=>({code,verdict:'UNVERIFIED'}));
  const selected=diagnosticEntries(rows);assert.ok(selected.length<=8);assert.ok(selected.some(e=>e.code==='cast.listener_limit_connections'));assert.ok(selected.some(e=>e.code==='cast.native_closed_confirmed'));
});


test('W01 index size and burst facts are bounded progress only, never cleanup acknowledgements', () => {
  for (const code of ['cast.source_init_mib_1', 'cast.source_init_mib_42', 'cast.source_init_mib_128', 'cast.source_init_over_128_mib', 'cast.media_pump_burst', 'cast.media_read_mib_4', 'cast.media_read_mib_128']) {
    assert.equal(parseCastProbeResult({ version: 1, operation: 'cast-discovery', scope, closed: false, code }).code, code);
    assert.throws(() => parseCastProbeResult({ version: 1, operation: 'cast-discovery', scope, closed: true, code }));
  }
  for (const code of ['cast.source_init_mib_0','cast.source_init_mib_00','cast.source_init_mib_129','cast.source_init_mib_private','cast.media_pump_forever', 'cast.media_read_mib_0', 'cast.media_read_mib_3', 'cast.media_read_mib_132'])
    assert.throws(() => parseCastProbeResult({ version: 1, operation: 'cast-discovery', scope, closed: false, code }));
});


test('W01/G1 isolated HTTP timeout IPC remains fixed, nonterminal and media-generation bounded', () => {
  const base={version:1,operation:'cast-discovery',scope:{accountId:'guest',generation:1,requestId:'cast',mediaSessionId:'media'},closed:false};
  for(const generation of [1,2,3,4]) assert.equal(parseCastProbeResult({...base,code:'cast.media_timeout_isolated_g'+generation}).closed,false);
  for(const code of ['cast.media_timeout_isolated_g0','cast.media_timeout_isolated_g5','cast.media_timeout_isolated_g01','cast.media_timeout_progress_g1','cast.media_timeout_isolated_https']) assert.throws(()=>parseCastProbeResult({...base,code}));
  assert.throws(()=>parseCastProbeResult({...base,closed:true,code:'cast.media_timeout_isolated_g1'}));
  assert.throws(()=>parseCastProbeResult({...base,code:'cast.media_timeout_isolated_g1',url:'https://private.invalid'}));
});
