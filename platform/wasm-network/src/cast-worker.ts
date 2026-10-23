declare const BILISOFA_CAST_PRODUCT:boolean;
const product=typeof BILISOFA_CAST_PRODUCT!=='undefined'&&BILISOFA_CAST_PRODUCT;
import { offerObservationCode, type OfferReason } from '../../../packages/contracts/src/cast-offer-diagnostics.ts';
import { receiverOfferReason } from '../../../packages/cast/src/offer-diagnostics.ts';
import { DomainError } from '../../../packages/contracts/src/index.ts';
import { ApprovedSoapReceiver, type ReceiverReply } from '../../../packages/cast/src/receiver.ts';
import type { SoapRequest } from '../../../packages/contracts/src/upnp.ts';
import { parseCastProbeRequest, parseCastProbeResult, type CastProbeRequest, type CastProbeResult } from '../../../packages/contracts/src/cast-probe.ts';
import { CAST_PROGRESS_LIMIT, type UpnpService } from '../../../packages/contracts/src/upnp.ts';
import { inspectSoapOffer, isSoapOfferHeader, isBiliCastAkamOffer, parseSoapProbeRequest, planSoapMediaProbe, inspectSoapProbeCandidate } from '../../../packages/cast/src/soap.ts';
import { discoverySoapReply } from '../../../packages/cast/src/soap-probe.ts';
interface Module { noInitialRun: boolean; onRuntimeInitialized(): void; print(line: unknown): void; printErr(): void; onAbort(): void; locateFile(name: string): string; callMain?: (args: string[]) => void; _cast_stop?: () => void;
  _cast_transition_enable?: () => void; _cast_transition_buffer?: () => number; _cast_transition_begin?: (length: number, generation: number) => number;
  HEAPU8?: Uint8Array; _cast_media_begin?: () => number; _cast_source_buffer?: () => number; _cast_source_begin?: (length: number) => number; _cast_rpc_peer?: (id: number) => number; _cast_rpc_enable?: () => void; _cast_rpc_body?: (id: number) => number; _cast_rpc_body_size?: (id: number) => number; _cast_rpc_action?: (id: number) => number; _cast_rpc_service?: (id: number) => number; _cast_rpc_buffer?: () => number; _cast_rpc_reply?: (id: number, status: number, length: number) => number;
}
const worker = globalThis as unknown as { onmessage: ((event: MessageEvent) => void) | null; postMessage(value: CastProbeResult): void; importScripts(...paths: string[]): void; Module?: Module };
let active: CastProbeRequest | undefined, stopping = false, started = false, completed = false;
const progress = new Set<string>();
let sourceAttempted = false, sourcePassed = false, mediaAttempted = false;
let receiver = new ApprovedSoapReceiver();
let generation = 1, transitionClosing = false;
let offerSerial = 0;
let replacement: { generation: number; token: string; url: string } | undefined;
let transitionTimer: ReturnType<typeof setTimeout> | undefined;
let receiverActive = false, sourceOwner: string | undefined, sourceOffer: SoapRequest | undefined;
let ackTimer: ReturnType<typeof setTimeout> | undefined;
let unknownPending = false;
let waiting: { id: number; type: string } | undefined;
function invalidateReceiver(): void { clearTimeout(transitionTimer); replacement = undefined; receiver.end(); receiverActive = false; sourceOwner = undefined; sourceOffer = undefined; clearTimeout(ackTimer); waiting = undefined; }
function soapReply(id: number, result: ReceiverReply): number {
  const m = worker.Module!, heap = m.HEAPU8!, bytes = new TextEncoder().encode(result.body), output = m._cast_rpc_buffer!();
  if (!heap || !bytes.length || bytes.length > 6144 || !Number.isInteger(output) || output <= 0 || output + bytes.length + 1 > heap.length) throw new Error();
  heap.set(bytes, output); heap[output + bytes.length] = 0;
  const answered = m._cast_rpc_reply!(id, result.status, bytes.length); bytes.fill(0);
  if (answered !== 0 && answered !== 1) throw new Error(); return answered;
}
function acknowledge(id: number, accepted: boolean): void {
  if (!waiting || waiting.id !== id) return;
  const type = waiting.type; waiting = undefined; clearTimeout(ackTimer); ackTimer = undefined;
  const result = receiver.acknowledge(id, accepted, Date.now());
  if (result) soapReply(id, result);
  reply('cast.receiver_' + (accepted && result?.status === 200 ? type + '_accepted' : 'command_failed'), false);
}

function reply(code: string, closed: boolean): void {
  if (!active || completed) return;
  if (!closed) {const event=product&&(/^cast\.transition_/.test(code)||['cast.source_pass','cast.media_ready','cast.media_timeout_isolated_g'+generation].includes(code));if(!event){if(progress.has(code))return;if(progress.size>=CAST_PROGRESS_LIMIT){if(product)return;unknown();return;}progress.add(code);}}
  if (closed) { completed = true; invalidateReceiver(); }
  worker.postMessage(parseCastProbeResult({ version: 1, operation: 'cast-discovery', scope: active.scope, closed, code },product));
  if (closed) active = undefined;
}
function unknown(cause: 'native_unconfirmed' | 'runtime_aborted' | 'worker_exception' = 'worker_exception'): void {
  if (unknownPending) return;
  unknownPending = true;
  // Fixed fact only, before the error poisons the parent owner. Never a closure ACK.
  if (active && !completed && progress.size < CAST_PROGRESS_LIMIT) reply('cast.cleanup_cause_' + cause, false);
  setTimeout(() => { throw new Error('cast_native_cleanup_unconfirmed'); }, 0);
}
function observeOffer(reason: OfferReason, context = receiver.offerContext()): void {
  if(product){reply('cast.product_offer_'+reason,false);return;}
  if (offerSerial >= 32) { reply('cast.offer_limit_reached', false); return; }
  reply(offerObservationCode(++offerSerial, { ...context, reason }), false);
}
function control(id: number): void {
  if (!active || completed || stopping) return;
  const m = worker.Module!;
  let body: Uint8Array | undefined;
  try {
    const service = m._cast_rpc_service!(id);
    if (service === 0) return; // Request expired/closed before this callback.
    if (![3, 4, 5].includes(service)) throw new Error();
    const heap = m.HEAPU8!, ptr = m._cast_rpc_body!(id), length = m._cast_rpc_body_size!(id), action = m._cast_rpc_action!(id);
    if (!heap || !Number.isInteger(ptr) || ptr <= 0 || !Number.isInteger(length) || length < 0 || length > 4096 || ptr + length > heap.length || !Number.isInteger(action) || action <= 0 || action + 256 > heap.length) throw new Error();
    const end = heap.subarray(action, action + 256).indexOf(0);
    if (end < 0) throw new Error();
    body = heap.slice(ptr, ptr + length);
    const name = (['AVTransport', 'RenderingControl', 'ConnectionManager'] as UpnpService[])[service - 3]!, header = new TextDecoder('utf-8', { fatal: true }).decode(heap.subarray(action, action + end)), now = Date.now();
    if (receiverActive && name === 'AVTransport') {
      const key = m._cast_rpc_peer!(id) >>> 0, peer = key.toString(16).padStart(8, '0');
      let request: SoapRequest;
      try { request = parseSoapProbeRequest(name, header, body); }
      catch (error) {
        const answered = soapReply(id, discoverySoapReply(name, header, body, now));
        if (answered && receiver.owns(peer) && isSoapOfferHeader(name, header)) observeOffer(error instanceof DomainError && error.code === 'unsupported' ? 'parse_unsupported' : 'parse_invalid');
        return;
      }
      const offerContext = receiver.offerContext();
      const decision = receiver.handle(request, peer, id, now);
      if ('reply' in decision) {
        const answered = soapReply(id, decision.reply);
        if (!answered) { if (decision.transition) failTransition(); return; }
        if (request.kind === 'offer') observeOffer(receiverOfferReason(request, decision, offerContext, now), offerContext);
        if (decision.transition) {
          const bytes = new Uint8Array(16); crypto.getRandomValues(bytes);
          const token = Array.from(bytes, n => n.toString(16).padStart(2, '0')).join(''); bytes.fill(0);
          generation = decision.transition.generation;if(product)progress.clear();
          replacement = { generation, token, url: decision.transition.url };
          reply('cast.transition_accepted_' + generation, false);
          transitionTimer = setTimeout(failTransition, 5000);
          worker.postMessage(parseCastProbeResult({ version: 1, operation: 'cast-discovery', scope: active.scope, closed: false, code: 'cast.transition_requested', transition: { generation, token } },product));
        }
        if (decision.metadata) reply('cast.soap_receiver_metadata_' + decision.metadata, false);
        if (request.kind === 'query' && decision.reply.status === 200) {
          const fact = ({ GetTransportInfo: 'transport_query', GetPositionInfo: 'position_query', GetMediaInfo: 'media_query', GetCurrentTransportActions: 'actions_query', GetDeviceCapabilities: 'capabilities_query', GetTransportSettings: 'settings_query' } as Record<string, string>)[request.action];
          if (fact) reply('cast.soap_' + fact, false);
          if (request.action === 'GetPositionInfo' && !decision.reply.body.includes('<RelTime>00:00:00</RelTime>')) reply('cast.soap_receiver_position_nonzero', false);
          if ((request.action === 'GetPositionInfo' || request.action === 'GetMediaInfo') && !decision.reply.body.includes((request.action === 'GetPositionInfo' ? '<TrackDuration>' : '<MediaDuration>') + '00:00:00</')) reply('cast.soap_receiver_duration_nonzero', false);
        }
        if (decision.denied) reply('cast.receiver_denied_' + decision.denied, false);
        if (decision.stale) reply('cast.receiver_denied_' + decision.stale, false);
        reply(decision.reply.status === 200 ? request.kind === 'offer' ? 'cast.receiver_uri_accepted' : request.kind === 'control' ? 'cast.receiver_play_accepted' : 'cast.receiver_query_live' : 'cast.receiver_control_denied', false);
      } else {
        waiting = { id, type: decision.command.type };
        worker.postMessage(parseCastProbeResult({ version: 1, operation: 'cast-discovery', scope: active.scope, closed: false, code: 'cast.receiver_command', command: { id, value: decision.command } },product));
        ackTimer = setTimeout(() => { try { acknowledge(id, false); } catch { unknown(); } }, 2000);
      }
      return;
    }
    const sourcePeer = m._cast_rpc_peer!(id) >>> 0;
    const facts = inspectSoapOffer(name, header, body, now);
    const discovery = discoverySoapReply(name, header, body, now);
    let result: ReceiverReply = discovery;
    let firstAccepted = false;
    let candidate: ReturnType<typeof planSoapMediaProbe> | undefined;
    let policy: ReturnType<typeof inspectSoapProbeCandidate>;
    if (!sourceAttempted) { try { const request = parseSoapProbeRequest(name, header, body); policy = inspectSoapProbeCandidate(request, now); candidate = planSoapMediaProbe(request, now); } catch { /* Ineligible sources never reach native cURL. */ } }
    // The separate TV entry authorizes exactly the first policy-valid source.
    // SetURI accepts that source intent; HTTPS verification still gates media.
    if (candidate && !!active.receiverApproval) {
      if (!sourcePeer) throw new Error();
      const peer = sourcePeer.toString(16).padStart(8, '0');
      const request = parseSoapProbeRequest(name, header, body);
      receiver.approve(peer, request, now); receiverActive = true;
      const decision = receiver.handle(request, peer, id, now);
      if (!('reply' in decision) || decision.reply.status !== 200) throw new Error();
      result = decision.reply; firstAccepted = true;
    }
    const answered = soapReply(id, result);
    if (answered === 1) {
      for (const fact of facts) reply(`cast.soap_${fact}`, false);
      if (firstAccepted) { observeOffer(isBiliCastAkamOffer(parseSoapProbeRequest(name, header, body)) ? 'accepted_bili_akam' : 'initial_accepted'); reply('cast.receiver_approved', false); reply('cast.receiver_uri_accepted', false); }
      else reply(`cast.soap_${discovery.fact}`, false);
      if (policy) reply('cast.source_policy_' + policy, false);
      if (candidate) {
        const key = sourcePeer;
        if (!key) throw new Error();
        sourceOwner = key.toString(16).padStart(8, '0'); sourceOffer = parseSoapProbeRequest(name, header, body);
        sourceAttempted = true;
        const url = new TextEncoder().encode(candidate.url), target = m._cast_source_buffer!();
        if (url.length > 2048 || !Number.isInteger(target) || target <= 0 || target + url.length + 1 > heap.length) throw new Error();
        reply('cast.source_candidate_valid', false);
        if (candidate.upgraded) reply('cast.source_upgrade_planned', false);
        heap.set(url, target); heap[target + url.length] = 0;
        const started = m._cast_source_begin!(url.length); url.fill(0);
        if (started !== 1 && started !== 0 && started !== -1) throw new Error();
      }
    } else if (firstAccepted) invalidateReceiver();
  } catch { unknown(); } finally { body?.fill(0); }
}
function failTransition(): void {
  if (!active || completed || stopping) return;
  reply('cast.transition_failed', false); stopping = true;
  try { worker.Module!._cast_stop!(); } catch { unknown(); }
}
function closeAcknowledged(payload: unknown): void {
  if (!replacement || !payload || typeof payload !== 'object') return;
  const p = payload as Record<string, unknown>;
  if (Object.keys(p).length !== 2 || p.generation !== replacement.generation || typeof p.closed !== 'boolean') return;
  if (!p.closed) { failTransition(); return; }
  clearTimeout(transitionTimer);
  const next = replacement; replacement = undefined;
  const m = worker.Module!, heap = m.HEAPU8!, url = new TextEncoder().encode(next.url);
  try {
    const target = m._cast_source_buffer!(), token = m._cast_transition_buffer!();
    if (!heap || !Number.isSafeInteger(target) || target <= 0 || target + url.length + 1 > heap.length || !Number.isSafeInteger(token) || token <= 0 || token + 33 > heap.length || url.length > 2048) throw new Error();
    // Deduplicate each generation independently; the parent keeps a total bound.
    for (const code of progress) if (/^cast\.(source_|media_)/.test(code)) progress.delete(code);
    sourcePassed = mediaAttempted = false;
    heap.set(url, target); heap[target + url.length] = 0;
    heap.set(new TextEncoder().encode(next.token), token); heap[token + 32] = 0;
    reply('cast.transition_decoder_closed_' + generation, false);
    transitionClosing = true;
    const result = m._cast_transition_begin!(url.length, generation);
    transitionClosing = false;
    if (result !== 1) failTransition();
  } catch { transitionClosing = false; unknown(); } finally { url.fill(0); }
}
worker.onmessage = async event => {
  if (active) {
    const v = event.data;
    if (v && typeof v === 'object' && Object.keys(v).length === 4 && v.version === 1 && v.operation === active.operation && v.control === 'stop' && JSON.stringify(v.scope) === JSON.stringify(active.scope)) { stopping = true; if (started) { try { worker.Module!._cast_stop!(); } catch { unknown(); } } }
    else if (v && typeof v === 'object' && Object.keys(v).length === 5 && v.version === 1 && v.operation === active.operation && v.control === 'transition-decoder-closed' && JSON.stringify(v.scope) === JSON.stringify(active.scope) && !stopping) closeAcknowledged(v.payload);
    else if (v && typeof v === 'object' && Object.keys(v).length === 4 && v.version === 1 && v.operation === active.operation && ['play-candidate', 'play-receiver'].includes(v.control) && JSON.stringify(v.scope) === JSON.stringify(active.scope) && started && !stopping && sourcePassed && !mediaAttempted) {
      if (v.control === 'play-receiver') {
        try {
          if (!(active.receiverApproval && receiverActive)) { if (!sourceOwner || !sourceOffer) throw new Error(); receiver.approve(sourceOwner, sourceOffer, Date.now()); receiverActive = true; reply('cast.receiver_approved', false); } }
        catch { reply('cast.receiver_expired', false); return; }
      }
      sourceOffer = undefined; sourceOwner = undefined;
      mediaAttempted = true; reply('cast.media_approved', false);
      try { const result = worker.Module!._cast_media_begin!(); if (![0, 1, -1].includes(result)) unknown(); } catch { unknown(); }
    }
    else if (v && typeof v === 'object' && v.version === 1 && v.operation === active.operation && JSON.stringify(v.scope) === JSON.stringify(active.scope) && receiverActive && !stopping) {
      try {
        if (Object.keys(v).length === 5 && v.control === 'receiver-snapshot') { reply('cast.receiver_snapshot_received', false); reply(receiver.update(v.payload, Date.now()) ? 'cast.receiver_snapshot_applied' : 'cast.receiver_snapshot_rejected', false); }
        else if (Object.keys(v).length === 5 && v.control === 'receiver-ack' && v.payload && Object.keys(v.payload).length === 2 && Number.isInteger(v.payload.id) && typeof v.payload.accepted === 'boolean') acknowledge(v.payload.id, v.payload.accepted);
        else if (Object.keys(v).length === 4 && ['receiver-seek-complete', 'receiver-command-failed'].includes(v.control)) reply('cast.' + v.control.split('-').join('_'), false);
      } catch { unknown(); }
    }
    return;
  }
  if (completed) return;
  try { active = parseCastProbeRequest(event.data); receiver = new ApprovedSoapReceiver(active.receiverApproval === 'session',product); } catch { return; }
  try { const r = await fetch('native/manifest.json'); if (r.body) await r.body.cancel(); if (!r.ok) { reply('cast.native_unavailable', true); return; } }
  catch { reply('cast.native_unavailable', true); return; }
  if (stopping) { reply('cast.cancelled', true); return; }
  worker.Module = { noInitialRun: true, onRuntimeInitialized() {
    if (stopping) { reply('cast.cancelled', true); return; }
    started = true;
    try { if (active!.receiverApproval === 'session') worker.Module!._cast_transition_enable!(); worker.Module!._cast_rpc_enable!(); worker.Module!.callMain!(['cast', active!.address, active!.uuid, active!.token]); } catch { unknown(); }
  }, print(line) {
    if (typeof line === 'string' && /^BRIDGE:request:(get_full|get_open|get_range|get_suffix|head)$/.test(line) && mediaAttempted) reply('cast.media_request_' + line.split(':')[2], false);
    else if (typeof line === 'string' && /^BRIDGE:read_mib:([1-9][0-9]{0,2})$/.test(line) && Number(line.split(':')[2]) <= 128 && Number(line.split(':')[2]) % 4 === 0 && mediaAttempted) reply('cast.media_read_mib_' + line.split(':')[2], false);
    else if (line === 'BRIDGE:pump:burst' && mediaAttempted) reply('cast.media_pump_burst', false);
    else if (typeof line === 'string' && /^BRIDGE:flow:[es]:(?:[0-9]{1,3}:){4}[0-6]$/.test(line) && mediaAttempted) { const v=line.split(':'); reply(`cast.media_flow_${v[2]}_c${v[3]}_p${v[4]}_w${v[5]}_m${v[6]}_l${v[7]}`, false); }
    else if (typeof line === 'string' && /^BRIDGE:limit:(bytes|windows|connections|lease)$/.test(line) && mediaAttempted) reply('cast.media_limit_' + line.split(':')[2], false);
    else if (typeof line === 'string' && /^BRIDGE:(retry|resume):[1-3]$/.test(line) && mediaAttempted) { const v = line.split(':'); reply('cast.media_' + v[1] + '_' + v[2], false); }
    else if (line === 'BRIDGE:request_timeout:1' && mediaAttempted && !stopping) reply('cast.media_timeout_isolated_g' + generation, false);
    else if (line === 'BRIDGE:ready' && mediaAttempted && !stopping) { if (generation > 1) reply('cast.transition_ready_' + generation, false); reply('cast.media_ready', false); }
    else if (line === 'BRIDGE:served:1' && mediaAttempted) reply('cast.media_served', false);
    else if (line === 'CAST:transition:closed') reply('cast.transition_native_closed_' + generation, false);
    else if (line === 'BRIDGE:stopped' && transitionClosing) { /* Closed before revalidation; not an end of the owner session. */ }
    else if (line === 'BRIDGE:stopped' && mediaAttempted) { invalidateReceiver(); reply('cast.media_stopped', false); }
    else if (typeof line === 'string' && /^BRIDGE:issue:(?:0|[1-5][0-9]{2}):(?:0|[1-9][0-9]{0,2})$/.test(line) && mediaAttempted) { invalidateReceiver(); reply('cast.media_issue_' + line.split(':').slice(2).join('_'), false); }
    else if (line === 'BRIDGE:failed:17') unknown('native_unconfirmed');
    else if (typeof line === 'string' && /^CAST:media:(expired|unavailable|failed)$/.test(line)) { sourcePassed = false; invalidateReceiver(); reply('cast.media_' + line.split(':')[2], false); }
    else if (typeof line === 'string' && /^CAST:source:(started|pass|invalid_request|invalid_media)$/.test(line)) { if (line === 'CAST:source:pass') sourcePassed = true; else if (line !== 'CAST:source:started') { invalidateReceiver(); } reply('cast.source_' + line.split(':')[2], false); }
    else if (typeof line === 'string' && /^CAST:source:failed:(0|[1-5][0-9]{2}):(0|[1-9][0-9]{0,2})$/.test(line)) { invalidateReceiver(); reply('cast.source_failed_' + line.split(':').slice(3).join('_'), false); }
    else if (typeof line === 'string' && /^CAST:layout:(moov_first|mdat_first|fragmented|prefix_exhausted|invalid)$/.test(line)) reply('cast.source_layout_' + line.split(':')[2], false);
    else if (typeof line === 'string' && /^CAST:init:([1-9][0-9]{0,2})$/.test(line) && Number(line.split(':')[2]) <= 128) reply('cast.source_init_mib_' + line.split(':')[2], false);
    else if (line === 'CAST:init:over_128_mib') reply('cast.source_init_over_128_mib', false);
    else if (typeof line === 'string' && /^CAST:position:(?:0[1-9a-f]|1[0-9a-f])$/.test(line)) reply('cast.position_wire_v1_' + line.slice(-2), false);
    else if (typeof line === 'string' && /^CAST:limit:(connections|lease)$/.test(line)) reply('cast.listener_limit_' + line.split(':')[2], false);
    else if (line === 'CAST:ready') reply('cast.ready', false);
    else if (typeof line === 'string' && (product?/^CAST:rpc:[1-9][0-9]{0,9}$/.test(line)&&Number(line.slice(9))<=2147483647:/^CAST:rpc:(?:[1-9][0-9]{0,2}|10[01][0-9]|102[0-4])$/.test(line))) { const id = Number(line.slice(9)); setTimeout(() => control(id), 0); }
    else if (typeof line === 'string' && /^CAST:seen:[0-6]$/.test(line)) reply(`cast.seen_${['search', 'reply', 'description_request', 'service_request', 'control_rejected', 'setup_rejected', 'protocol_query'][Number(line.slice(-1))]}`, false);
    else if (typeof line === 'string' && /^CAST:closed(?::[0-9]{1,3}){7}$/.test(line)) reply(line.toLowerCase().split(':').join('_').replace('cast_', 'cast.'), true);
    else if (typeof line === 'string' && /^CAST:failed:(10|11|12|13|131|132|14|16)$/.test(line)) reply('cast.failed_' + line.split(':')[2], true);
    else if (line === 'CAST:failed:17') unknown('native_unconfirmed');
  }, printErr() {}, onAbort: () => unknown('runtime_aborted'), locateFile: name => `${product?'cast-product':'native'}/${name}` };
  try { worker.importScripts(product?'cast-product/probe.js':'native/probe.js'); } catch { unknown(); }
};
