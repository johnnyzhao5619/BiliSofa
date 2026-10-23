import { ACCOUNT_TEST_VIDEO as video } from '../../../packages/contracts/src/account-probe.ts';
import { parseProgressRequest, parseProgressResult, type ProgressRequest, type ProgressResult } from '../../../packages/contracts/src/progress-probe.ts';
import { record } from '../../../packages/contracts/src/index.ts';
interface Native {
  HEAPU8: Uint8Array; callMain(args: string[]): void;
  _auth_input_ptr(): number; _auth_input_capacity(): number; _auth_import_cookies(n: number): number;
  _auth_body_ptr(): number; _auth_body_length(): number; _auth_response_clear(): void;
  _auth_http_status(): number; _auth_curl_status(): number; _auth_begin(op: number): number; _auth_stop(): void;
  _progress_prepare(n: number): number; _progress_attempt(): number;
}
const host = globalThis as unknown as { onmessage: ((event: MessageEvent) => void) | null; Module?: unknown; importScripts(path: string): void; postMessage(value: unknown): void };
let active: ProgressRequest | undefined, initialized = false, completed = false, attempted = false, stopping = false;
let expected: number | undefined, pending: ReturnType<typeof setTimeout> | undefined;
let code: ProgressResult['code'] = 'progress.precondition_failed_closed', img = '', sub = '';
function unknown(): never { throw new Error('progress_native_close_unconfirmed'); }
function close(next: ProgressResult['code']): void {
  if (completed) return; code = next; stopping = true; clearTimeout(pending); pending = undefined; img = sub = '';
  if (initialized) native._auth_stop(); else finish();
}
function finish(): void {
  if (!active || completed) return;
  host.postMessage(parseProgressResult({ version: 1, operation: 'progress-post', scope: active.scope, attempted, code }));
  active = undefined; completed = true;
}
function input(value: string): number {
  const bytes = new TextEncoder().encode(value), at = native._auth_input_ptr();
  if (native._auth_input_capacity() !== 4096 || bytes.length > 4096 || at < 0 || at + 4097 > native.HEAPU8.length) unknown();
  native.HEAPU8.fill(0, at, at + 4097); native.HEAPU8.set(bytes, at); return bytes.length;
}
function read(op: number): void { expected = op; if (native._auth_begin(op) !== 1) close('progress.precondition_failed_closed'); }
function key(value: unknown): string {
  if (typeof value !== 'string' || value.length > 200) throw new Error();
  const url = new URL(value);
  if (url.protocol !== 'https:' || !['i0.hdslb.com','i1.hdslb.com','i2.hdslb.com'].includes(url.hostname) || url.port || url.username || url.password || url.search || url.hash || !/^\/bfs\/wbi\/[a-f0-9]{32}\.png$/.test(url.pathname)) throw new Error();
  return url.pathname.slice(-36, -4);
}
function response(op: number): void {
  if (!active || op !== expected) throw new Error(); expected = undefined;
  const rc = native._auth_curl_status(), http = native._auth_http_status();
  if (rc !== 0 || http !== 200) { native._auth_response_clear(); close(!attempted ? 'progress.precondition_failed_closed' : Number.isInteger(rc) && rc > 0 && rc <= 127 ? `progress.post_c${rc}_closed` : Number.isInteger(http) && http >= 100 && http <= 599 ? `progress.post_http_${http}_closed` : 'progress.post_unknown_closed'); return; }
  const at = native._auth_body_ptr(), length = native._auth_body_length();
  if (at < 0 || length < 1 || length > 131072 || at + length > native.HEAPU8.length) throw new Error();
  let raw: Record<string, unknown>;
  try { raw = record(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(native.HEAPU8.subarray(at, at + length)))); } finally { native._auth_response_clear(); }
  if (op === 5) { close(raw.code === 0 ? 'progress.post_accepted_closed' : raw.code === -101 ? 'progress.post_api_login_closed' : raw.code === -403 ? 'progress.post_api_denied_closed' : raw.code === -412 || raw.code === -352 ? 'progress.post_api_risk_closed' : 'progress.post_api_other_closed'); return; }
  if (raw.code !== 0) throw new Error(); const data = record(raw.data);
  if (op === 2) {
    if (data.isLogin !== true || String(data.mid) !== active.session.uid) throw new Error();
    const wbi = record(data.wbi_img); img = key(wbi.img_url); sub = key(wbi.sub_url); read(3); return;
  }
  if (op === 3) {
    if (data.bvid !== video.bvid || String(data.aid) !== video.aid || !Array.isArray(data.pages) || data.pages.length !== 1) throw new Error();
    const page = record(data.pages[0]); if (String(page.cid) !== video.cid || page.duration !== video.durationSec) throw new Error(); read(4); return;
  }
  if (op !== 4 || data.last_play_time !== 0 || !['0', video.cid].includes(String(data.last_play_cid))) { close('progress.precondition_changed_closed'); return; }
  if (active.session.expiresAt <= Date.now()) throw new Error();
  const n = input([active.session.uid, img, sub, Math.floor(Date.now() / 1000)].join('\n') + '\n');
  if (native._progress_prepare(n) !== 1) throw new Error(); img = sub = '';
  attempted = true; expected = 5;
  if (native._progress_attempt() !== 1) close('progress.post_unknown_closed');
}
const native = {
  noInitialRun: true, onRuntimeInitialized() { if (!stopping) native.callMain([]); },
  print(line: unknown) {
    if (line === 'AUTH:unclosed') unknown();
    if (line === 'AUTH:closed') { finish(); return; }
    if (line === 'AUTH:deadline' || line === 'AUTH:transport') { code = attempted ? 'progress.post_unknown_closed' : 'progress.precondition_failed_closed'; return; }
    if (line !== 'AUTH:ready' && !(typeof line === 'string' && /^AUTH:response:[2-5]$/.test(line))) return;
    if (pending !== undefined) unknown();
    if (line === 'AUTH:ready') initialized = true;
    pending = setTimeout(() => {
      pending = undefined; if (completed || stopping || !active) return;
      try {
        if (line === 'AUTH:ready') { if (native._auth_import_cookies(input(active.session.cookieLines)) !== 1) throw new Error(); read(2); }
        else response(Number((line as string).slice(-1)));
      } catch { close(attempted ? 'progress.post_unknown_closed' : 'progress.precondition_failed_closed'); }
    }, 0);
  }, printErr() {}, onAbort: unknown, locateFile: (name: string) => 'progress-post/' + name,
} as unknown as Native;
host.onmessage = event => {
  if (completed) return;
  if (active) {
    const v = event.data;
    if (v && Object.keys(v).length === 4 && v.version === 1 && v.operation === 'progress-post' && JSON.stringify(v.scope) === JSON.stringify(active.scope) && v.control === 'stop') close(attempted ? 'progress.post_unknown_closed' : 'progress.cancelled_closed');
    return;
  }
  try { active = parseProgressRequest(event.data); if (active.session.expiresAt <= Date.now() || active.session.expiresAt > Date.now() + 1800000) throw new Error(); }
  catch { active = undefined; return; }
  host.Module = native;
  try { host.importScripts('progress-post/probe.js'); } catch { unknown(); }
};
