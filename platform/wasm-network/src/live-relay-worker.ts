import { parseLiveProbeRequest, parseLiveProbeResult, type LiveProbeRequest } from '../../../packages/contracts/src/live-probe.ts';
import { plainLivePlaylist, publicLiveSource, rewritePlainLivePlaylist } from '../../../packages/media/src/live-hls.ts';
interface Native {
  noInitialRun: boolean; onRuntimeInitialized(): void; print(value: unknown): void; printErr(): void; onAbort(): void; locateFile(name: string): string;
  callMain?(args: string[]): void; HEAPU8: Uint8Array;
  _live_input_ptr(): number; _live_begin(op: number): number; _live_stop(): void; _live_body_ptr(): number; _live_body_length(): number; _live_response_clear(): void; _live_http_status(): number; _live_curl_status(): number;
  _live_relay_start(): number; _live_relay_segment(): number; _live_relay_reply(length: number, kind: number): number;
  _live_relay_connections(): number; _live_relay_requests(): number; _live_relay_rejections(): number; _live_relay_flags(): number; _live_relay_status(): number;
}
const worker = globalThis as unknown as { onmessage: ((e: MessageEvent) => void) | null; postMessage(value: unknown): void; importScripts(name: string): void; Module?: Native };
let request: LiveProbeRequest | undefined, started = false, stopping = false, complete = false, serving = false, source = '', token = '', operation = 0, issue = 'live.source_failed_closed';
let manifests = 0, segments = 0, serial = 0;
const urls = new Map<number, string>(), windows: number[][] = [];
function emit(code: string, closed: boolean, url?: string): void {
  if (!request || complete) return;
  worker.postMessage(parseLiveProbeResult({ ...request, code, closed, ...(url ? { url } : {}) }));
  if (closed) { complete = true; request = undefined; source = token = ''; urls.clear(); windows.length = 0; }
}
function stop(): void { if (started) worker.Module!._live_stop(); else emit('live.cancelled_closed', true); }
function input(value: string): void { const bytes = new TextEncoder().encode(value); if (bytes.length > 2048) throw new Error('invalid'); const m = worker.Module!, p = m._live_input_ptr(); m.HEAPU8.fill(0, p, p + 2049); m.HEAPU8.set(bytes, p); }
function begin(op: number, url = ''): void { if (stopping) { stop(); return; } input(url); operation = op; if (worker.Module!._live_begin(op) !== 1) throw new Error('invalid'); }
function receiveText(max: number): string {
  const m = worker.Module!, length = m._live_body_length(); if (!Number.isInteger(length) || length < 1 || length > max) throw new Error('invalid');
  const bytes = m.HEAPU8.slice(m._live_body_ptr(), m._live_body_ptr() + length);
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } finally { bytes.fill(0); m._live_response_clear(); }
}
function rewrite(text: string): void {
  const ids: number[] = [];
  const output = rewritePlainLivePlaylist(text, source, url => {
    let id = [...urls].find(([, value]) => value === url)?.[0];
    if (id === undefined) { if (++serial > 1024) throw new Error('budget'); id = serial; urls.set(id, url); }
    ids.push(id); return 's' + id + '.ts';
  });
  windows.push(ids); while (windows.length > 3) windows.shift(); const retained = new Set(windows.flat());
  for (const id of urls.keys()) if (!retained.has(id)) urls.delete(id);
  if (urls.size > 72) throw new Error('budget');
  const bytes = new TextEncoder().encode(output), m = worker.Module!; m.HEAPU8.set(bytes, m._live_body_ptr());
  if (m._live_relay_reply(bytes.length, 1) !== 1) throw new Error('reply');
}
function line(value: unknown): void {
  if (complete) return;
  if (value === 'LIVE:unclosed') throw new Error('live_native_cleanup_unconfirmed');
  if (value === 'LIVE:closed') {
    const m = worker.Module!, counts = [m._live_relay_connections(), m._live_relay_requests(), m._live_relay_rejections()], flags = m._live_relay_flags(), status = m._live_relay_status();
    if (!counts.every(n => Number.isInteger(n) && n >= 0 && n <= 128) || !Number.isInteger(flags) || flags < 0 || flags > 15 || !Number.isInteger(status) || status < 0 || status > 599) throw new Error('invalid_native_facts');
    emit(`live.http_v1_a${counts[0]}_q${counts[1]}_r${counts[2]}_f${flags.toString(16)}_h${status}`, false);
    emit(`live.relay_summary_m${manifests}_s${segments}`, false); emit(stopping ? 'live.cancelled_closed' : issue, true); return;
  }
  if (value === 'LIVE:deadline') { issue = 'live.source_deadline_closed'; return; }
  if (value === 'LIVE:relay_limit') { issue = 'live.relay_limit_closed'; return; }
  if (value === 'LIVE:relay_client_deadline') { issue = 'live.relay_client_deadline_closed'; return; }
  if (stopping) { stop(); return; }
  try {
    if (value === 'LIVE:ready') { begin(0); return; }
    if (value === 'LIVE:relay_ready') { serving = true; emit('live.relay_ready', false, `http://127.0.0.1:40325/${token}/index.m3u8`); return; }
    if (value === 'LIVE:relay_manifest') { issue = 'live.failed_manifest_format_closed'; begin(1, source); return; }
    if (value === 'LIVE:relay_segment') { issue = 'live.failed_segment_format_closed'; const url = urls.get(worker.Module!._live_relay_segment()); if (!url) throw new Error('expired'); begin(3, url); return; }
    if (value === 'LIVE:served_manifest') { if (++manifests > 128) throw new Error('budget'); return; }
    if (value === 'LIVE:served_segment') { if (++segments > 128) throw new Error('budget'); return; }
    if (value !== 'LIVE:response:' + operation) throw new Error('unexpected');
    const m = worker.Module!, stage = ['api', 'manifest', 'segment', 'segment'][operation]!;
    issue = `live.failed_${stage}_format_closed`;
    const http = m._live_http_status(), curl = m._live_curl_status();
    if (curl !== 0 || http !== (operation === 2 ? 206 : 200)) {
      if (Number.isInteger(http) && http >= 0 && http <= 999 && Number.isInteger(curl) && curl >= 0 && curl <= 999) issue = `live.failed_${stage}_h${http}_c${curl}_closed`;
      throw new Error('transport');
    }
    if (operation === 0) { source = publicLiveSource(JSON.parse(receiveText(131072))); begin(1, source); }
    else if (operation === 1) { const text = receiveText(32768); if (serving) rewrite(text); else begin(2, plainLivePlaylist(text, source).firstSegment); }
    else if (operation === 2) {
      const length = m._live_body_length(), p = m._live_body_ptr();
      if (length !== 512 || m.HEAPU8[p] !== 0x47 || m.HEAPU8[p + 188] !== 0x47 || m.HEAPU8[p + 376] !== 0x47) throw new Error('ts');
      m._live_response_clear(); token = [...crypto.getRandomValues(new Uint8Array(16))].map(v => v.toString(16).padStart(2, '0')).join(''); input(token);
      issue = 'live.failed_relay_format_closed'; if (m._live_relay_start() !== 1) throw new Error('listen');
    } else {
      const length = m._live_body_length(), p = m._live_body_ptr();
      if (!Number.isInteger(length) || length < 564 || length > 4194304 || length % 188 !== 0 || m.HEAPU8[p] !== 0x47 || m.HEAPU8[p + 188] !== 0x47 || m.HEAPU8[p + 376] !== 0x47 || m._live_relay_reply(length, 2) !== 1) throw new Error('ts');
    }
  } catch { stop(); }
}
worker.onmessage = async event => {
  if (complete) return;
  if (request) { const v = event.data; if (v && Object.keys(v).length === 4 && v.version === 1 && v.operation === request.operation && v.control === 'stop' && JSON.stringify(v.scope) === JSON.stringify(request.scope)) { stopping = true; if (started) setTimeout(stop, 0); } return; }
  try { request = parseLiveProbeRequest(event.data); } catch { return; }
  try { const r = await fetch('live/manifest.json'); await r.body?.cancel(); if (!r.ok) { emit(issue, true); return; } } catch { emit(issue, true); return; }
  if (stopping) { emit('live.cancelled_closed', true); return; }
  worker.Module = { noInitialRun: true, onRuntimeInitialized() { if (stopping) { emit('live.cancelled_closed', true); return; } started = true; worker.Module!.callMain!([]); }, print(value: unknown) { setTimeout(() => line(value), 0); }, printErr() {}, onAbort() { throw new Error('live_native_cleanup_unconfirmed'); }, locateFile: (name: string) => 'live/' + name } as unknown as Native;
  try { worker.importScripts('live/probe.js'); } catch { throw new Error('live_native_cleanup_unconfirmed'); }
};
