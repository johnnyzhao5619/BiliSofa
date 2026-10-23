import { guestBridgeMetadata, guestBridgeManifestUrl } from '../../../packages/media/src/guest-mpd.ts';
import { parseGuestVideoRequest, parseGuestVideoResult, type GuestVideoRequest, type GuestVideoResult, parseGuestBridgeEvent, type GuestBridgeEvent } from '../../../packages/contracts/src/guest-video.ts';
import { GuestVideoError, parseGuestVideoDetail, parseGuestVideoPlan, type GuestVideoDetail, type GuestVideoPlan } from '../../../packages/bili-client/src/guest-video.ts';
interface NativeModule {
  arguments: string[]; noInitialRun: boolean; noExitRuntime: boolean; onRuntimeInitialized(): void;
  print(line: unknown): void; printErr(): void; onAbort(): void; locateFile(name: string): string;
  callMain?: (args: string[]) => void; HEAPU8?: Uint8Array;
  _guest_response_ptr?: () => number; _guest_response_length?: () => number;
  _guest_http_status?: () => number; _guest_curl_status?: () => number; _guest_range_valid?: () => number; _bridge_stop?: () => void;
  _guest_reject_reason?: () => number;
}
const worker = globalThis as unknown as { onmessage: ((event: MessageEvent) => void) | null; postMessage(value: GuestVideoResult | GuestBridgeEvent): void; importScripts(...paths: string[]): void; Module?: NativeModule };
let active: GuestVideoRequest | undefined, cancelled = false, completed = false, stage = 0;
let bridgeReady = false, token = '', refreshes = 0, rangeRetries = 0;
let delayed:ReturnType<typeof setTimeout>|undefined;
let detail: GuestVideoDetail | undefined, plan: GuestVideoPlan | undefined;
function finish(code: string): void {
  if (!active || completed) return;
  completed = true;
  clearTimeout(delayed);delayed=undefined;
  if (!/[.](source_ranges_ok|cancelled|native_unavailable|bridge_stopped|bridge_failed_[0-9]+)$/.test(code)) code = `ugc.${['view', 'playurl', 'video', 'audio'][stage]}_${code.slice(4)}`;
  const summary = code === 'ugc.source_ranges_ok' && plan ? { bvid: plan.detail.bvid, title: plan.detail.title, owner: plan.detail.owner, durationSec: plan.durationSec, pages: plan.detail.pages, width: plan.video.width, height: plan.video.height, videoCodec: plan.video.codec, audioCodec: plan.audio.codec } : undefined;
  // No URL, CID, response/header or signature ever leaves this Worker.
  const value = { version: 1, scope: active.scope, operation: active.operation, closed: true, code, ...(summary ? { summary } : {}) };
  worker.postMessage(active.operation === 'guest-video-play' ? parseGuestBridgeEvent(value) : parseGuestVideoResult(value));
  plan = undefined; detail = undefined;
}
function refreshSource(): boolean {
  if (active?.operation !== 'guest-video-play' || cancelled || refreshes >= 1 || bridgeReady) return false;
  refreshes++; stage = 0; detail = undefined; plan = undefined;
  worker.postMessage(parseGuestBridgeEvent({ version: 1, scope: active.scope, operation: active.operation, closed: false, code: 'ugc.source_refresh_once' }));
  setTimeout(next, 750); return true;
}
function next(): void {
  if (cancelled) { finish('ugc.cancelled'); return; }
  if (stage === 4) {
    if (plan!.expiresAt < Date.now() + 75000) { if (!refreshSource()) { stage = 1; finish('ugc.expired_source'); } return; }
    try {
      const bytes = new Uint8Array(16); crypto.getRandomValues(bytes); token = Array.from(bytes, n => n.toString(16).padStart(2, '0')).join('');
      worker.Module!.callMain!(['bridge', active!.bvid, token, plan!.video.url, plan!.audio.url, guestBridgeMetadata(plan!)]);
    } catch { /* A runtime exception after native entry cannot assert cleanup. */ }
    return;
  }
  const args = stage === 0 ? ['guest-view', active!.bvid] : stage === 1 ? ['guest-playurl', active!.bvid, detail!.cid] : ['guest-range', active!.bvid, stage === 2 ? plan!.video.url : plan!.audio.url];
  try { worker.Module!.callMain!(args); } catch { /* No closure frame: parent must mark cleanup unknown. */ }
}
function closed(): void {
  if (completed) return;
  if (cancelled) { finish('ugc.cancelled'); return; }
  const m = worker.Module!;
  try {
    const status = m._guest_http_status!(), rc = m._guest_curl_status!();
    if (!Number.isInteger(status) || status < 0 || status > 599 || !Number.isInteger(rc) || rc < 0 || rc > 999) throw new Error();
    if (rc !== 0) {
      const reason = m._guest_reject_reason?.() ?? 0;
      if (!Number.isInteger(reason) || reason < 0 || reason > 3) throw new Error();
      // The native closed frame has returned. Only this bounded, pre-play range
      // timeout is eligible; no TLS/HTTP/policy failure or unknown close retries.
      if(rc===28 && (status===0||status===206) && reason===0 && (stage===2||stage===3) && active?.operation==='guest-video-play' && !bridgeReady && rangeRetries===0 && plan && plan.expiresAt>=Date.now()+75000){
        rangeRetries++;
        worker.postMessage(parseGuestBridgeEvent({version:1,scope:active.scope,operation:active.operation,closed:false,code:'ugc.range_retry_once'}));
        delayed=setTimeout(()=>{delayed=undefined;next();},750);return;
      }
      finish(reason ? `ugc.${['', 'response_too_large', 'headers_too_large', 'range_invalid'][reason]}` : `ugc.transport_${rc}`); return;
    }
    if (stage < 2 && status !== 200 || stage >= 2 && status !== 206) { finish(status >= 100 ? `ugc.http_${status}` : 'ugc.invalid_response'); return; }
    if (stage < 2) {
      const start = m._guest_response_ptr!(), length = m._guest_response_length!(), heap = m.HEAPU8;
      if (!heap || !Number.isInteger(start) || start < 0 || !Number.isInteger(length) || length < 1 || length > (stage === 0 ? 524288 : 131072) || start + length > heap.length) throw new Error();
      const raw = new TextDecoder('utf-8', { fatal: true }).decode(heap.subarray(start, start + length));
      if (stage === 0) detail = parseGuestVideoDetail(raw, active!.bvid);
      else {
        plan = parseGuestVideoPlan(raw, detail!);
        if (plan.usedBackup && active?.operation === 'guest-video-play') worker.postMessage(parseGuestBridgeEvent({ version: 1, scope: active.scope, operation: active.operation, closed: false, code: 'ugc.source_backup_selected' }));
      }
    } else if (m._guest_range_valid!() !== 1) { finish('ugc.range_invalid'); return; }
    stage++;
    if (stage === 4 && active!.operation === 'guest-video-source') { finish('ugc.source_ranges_ok'); return; }
    // Finish the current native main/cleanup stack before starting the next GET.
    // Stop messages can be handled between stages; a cancelled owner never advances.
    setTimeout(next, 0);
  } catch (error) {
    const retryableShape = !(error instanceof GuestVideoError) || ['expired_source', 'duration_mismatch'].includes(error.reason);
    if (stage === 1 && retryableShape && refreshSource()) return;
    finish(error instanceof GuestVideoError ? `ugc.${error.reason}` : 'ugc.invalid_response');
  }
}
worker.onmessage = async event => {
  if (active) {
    const v = event.data;
    if (v && typeof v === 'object' && Object.keys(v).length === 4 && v.version === 1 && v.control === 'stop' && v.operation === active.operation && JSON.stringify(v.scope) === JSON.stringify(active.scope)) { cancelled = true; if(delayed!==undefined){clearTimeout(delayed);delayed=undefined;finish('ugc.cancelled');return;} if (bridgeReady) { try { worker.Module!._bridge_stop!(); } catch { /* Parent must not infer cleanup. */ } } }
    return;
  }
  try { active = parseGuestVideoRequest(event.data); } catch { return; }
  try { const r = await fetch('native/manifest.json'); if (r.body) await r.body.cancel(); if (!r.ok) { finish('ugc.native_unavailable'); return; } }
  catch { finish('ugc.native_unavailable'); return; }
  if (cancelled) { finish('ugc.cancelled'); return; }
  worker.Module = { arguments: [], noInitialRun: true, noExitRuntime: true, onRuntimeInitialized: next, print(line) {
    if (line === 'GUEST:closed') { setTimeout(closed, 0); return; }
    if (line === 'BRIDGE:ready' && active?.operation === 'guest-video-play' && plan && !bridgeReady) {
      bridgeReady = true;
      worker.postMessage(parseGuestBridgeEvent({ version: 1, scope: active.scope, operation: active.operation, closed: false, code: 'ugc.bridge_ready', url: guestBridgeManifestUrl(token), summary: { bvid: plan.detail.bvid, title: plan.detail.title, owner: plan.detail.owner, durationSec: plan.durationSec, pages: plan.detail.pages, width: plan.video.width, height: plan.video.height, videoCodec: plan.video.codec, audioCodec: plan.audio.codec } }));
    } else if (typeof line === 'string' && bridgeReady && /^BRIDGE:(served:[0-2]|issue:[0-9]{1,3}:[0-9]{1,3})$/.test(line)) {
      const parts=line.split(':');
      const code=parts[1]==='served' ? `ugc.bridge_${['manifest','video','audio'][Number(parts[2])]}_served` : `ugc.bridge_issue_${parts[2]}_curl_${parts[3]}`;
      worker.postMessage(parseGuestBridgeEvent({ version: 1, scope: active!.scope, operation: active!.operation, closed: false, code }));
    } else if (line === 'BRIDGE:stopped' && bridgeReady) finish('ugc.bridge_stopped');
    else if (line === 'BRIDGE:failed:17') setTimeout(() => { throw new Error('native_cleanup_unconfirmed'); }, 0);
    else if (typeof line === 'string' && /^BRIDGE:failed:(10|12|16)$/.test(line)) finish(`ugc.bridge_failed_${line.split(':')[2]}`);
  }, printErr() {}, onAbort() { setTimeout(() => { throw new Error('native_runtime_aborted'); }, 0); }, locateFile: name => `native/${name}` };
  try { worker.importScripts('native/probe.js'); } catch { setTimeout(() => { throw new Error('native_import_failed_cleanup_unconfirmed'); }, 0); }
};
