import { parseLiveProbeRequest, parseLiveProbeResult, type LiveProbeRequest, type LiveProbeResult } from '../../../packages/contracts/src/live-probe.ts';
import { plainLivePlaylist, publicLiveSource } from '../../../packages/media/src/live-hls.ts';
interface Native {
  noInitialRun: boolean; onRuntimeInitialized(): void; print(line: unknown): void; printErr(): void; onAbort(): void; locateFile(name: string): string;
  callMain?(args: string[]): void; HEAPU8: Uint8Array;
  _live_begin(op: number): number; _live_stop(): void; _live_input_ptr(): number; _live_body_ptr(): number; _live_body_length(): number; _live_response_clear(): void; _live_http_status(): number; _live_curl_status(): number;
}
const worker = globalThis as unknown as { onmessage: ((e: MessageEvent) => void) | null; postMessage(v: unknown): void; importScripts(name: string): void; Module?: Native };
let request: LiveProbeRequest | undefined, started = false, stopping = false, complete = false, ready = false, source = '', operation = 0;
let failure = 'live.source_failed_closed';
function reply(code: LiveProbeResult['code']): void {
  if (!request || complete) return;
  worker.postMessage(parseLiveProbeResult({ ...request, closed: true, code, ...(code === 'live.source_ready_closed' ? { url: source } : {}) }));
  complete = true; request = undefined; source = '';
}
function stop(): void { if (started) worker.Module!._live_stop(); else reply('live.cancelled_closed'); }
function begin(op: number, url = ''): void {
  if (stopping) { stop(); return; }
  const m = worker.Module!, data = new TextEncoder().encode(url);
  if (data.length > 2048) throw new Error('invalid');
  const p = m._live_input_ptr(); m.HEAPU8.fill(0, p, p + 2049); m.HEAPU8.set(data, p); operation = op;
  if (m._live_begin(op) !== 1) throw new Error('invalid');
}
// Never re-enter C from Module.print/fflush. All continuations cross a task boundary.
function line(value: unknown): void {
  if (complete) return;
  if (value === 'LIVE:unclosed') throw new Error('live_native_cleanup_unconfirmed');
  if (value === 'LIVE:closed') { reply(stopping ? 'live.cancelled_closed' : ready ? 'live.source_ready_closed' : failure); return; }
  if (value === 'LIVE:deadline') { failure = 'live.source_deadline_closed'; return; }
  if (stopping) { stop(); return; }
  try {
    if (value === 'LIVE:ready') { begin(0); return; }
    if (value !== 'LIVE:response:' + operation) { ready = false; stop(); return; }
    const m = worker.Module!;
    const stage = ['api', 'manifest', 'segment'][operation]!;
    failure = `live.failed_${stage}_format_closed`;
    if (m._live_curl_status() !== 0 || m._live_http_status() !== (operation === 2 ? 206 : 200)) {
      const http = m._live_http_status(), curl = m._live_curl_status();
      if (Number.isInteger(http) && http >= 0 && http <= 999 && Number.isInteger(curl) && curl >= 0 && curl <= 999) failure = `live.failed_${stage}_h${http}_c${curl}_closed`;
      throw new Error('network');
    }
    const size = m._live_body_length();
    if (!Number.isInteger(size) || size < 1 || size > (operation === 0 ? 131072 : operation === 1 ? 32768 : 512)) throw new Error('invalid');
    const bytes = m.HEAPU8.slice(m._live_body_ptr(), m._live_body_ptr() + size); m._live_response_clear();
    if (operation === 0) { source = publicLiveSource(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))); bytes.fill(0); begin(1, source); }
    else if (operation === 1) { const playlist = plainLivePlaylist(new TextDecoder('utf-8', { fatal: true }).decode(bytes), source); bytes.fill(0); begin(2, playlist.firstSegment); }
    else { const ts = size === 512 && bytes[0] === 0x47 && bytes[188] === 0x47 && bytes[376] === 0x47; bytes.fill(0); if (!ts) throw new Error('invalid'); ready = true; stop(); }
  } catch { ready = false; stop(); }
}
worker.onmessage = async event => {
  if (complete) return;
  if (request) {
    const v = event.data;
    if (v && Object.keys(v).length === 4 && v.version === 1 && v.operation === request.operation && v.control === 'stop' && JSON.stringify(v.scope) === JSON.stringify(request.scope)) { stopping = true; if (started) setTimeout(stop, 0); }
    return;
  }
  try { request = parseLiveProbeRequest(event.data); } catch { return; }
  try { const r = await fetch('live/manifest.json'); if (r.body) await r.body.cancel(); if (!r.ok) { reply('live.source_failed_closed'); return; } }
  catch { reply('live.source_failed_closed'); return; }
  if (stopping) { reply('live.cancelled_closed'); return; }
  worker.Module = { noInitialRun: true, onRuntimeInitialized() { if (stopping) { reply('live.cancelled_closed'); return; } started = true; worker.Module!.callMain!([]); }, print(value: unknown) { setTimeout(() => line(value), 0); }, printErr() {}, onAbort() { throw new Error('live_native_cleanup_unconfirmed'); }, locateFile: (name: string) => 'live/' + name } as unknown as Native;
  try { worker.importScripts('live/probe.js'); } catch { throw new Error('live_native_cleanup_unconfirmed'); }
};
