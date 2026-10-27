import { configureServiceNative } from '../../../packages/contracts/src/service-configuration.ts';
import { serviceString } from '../../../packages/contracts/src/service-configuration.ts';
import { ACCOUNT_TEST_VIDEO as video, parseAccountRequest, parseAccountResult, type AccountProbeRequest, type AccountView } from '../../../packages/contracts/src/account-probe.ts';
import { record } from '../../../packages/contracts/src/index.ts';
interface Native {
  HEAPU8: Uint8Array; callMain(args: string[]): void;
  _auth_input_ptr(): number; _auth_input_capacity(): number; _auth_import_cookies(n: number): number;
  _auth_body_ptr(): number; _auth_body_length(): number; _auth_response_clear(): void;
  _auth_http_status(): number; _auth_curl_status(): number; _auth_begin(op: number): number; _auth_stop(): void;
  _auth_readback_prepare(n: number): number;
}
const host = globalThis as unknown as { onmessage: ((e: MessageEvent) => void) | null; Module?: unknown; importScripts(path: string): void; postMessage(value: unknown): void };
let active: AccountProbeRequest | undefined, initialized = false, completed = false, stopping = false;
let task: ReturnType<typeof setTimeout> | undefined, expected: number | undefined;
let code = 'account.invalid_closed', name = '', img = '', sub = '', legacyTarget = false;
function unknown(): never { throw new Error('account_readback_cleanup_unconfirmed'); }
function post(data: object): void { if (active && !completed) host.postMessage(parseAccountResult({ version: 1, operation: 'account-probe', scope: active.scope, ...data })); }
function finish(): void { post({ kind: 'closed', code }); active = undefined; completed = true; }
function close(next: string): void { if (completed) return; code = next; stopping = true; clearTimeout(task); task = undefined; name = img = sub = ''; if (initialized) native._auth_stop(); else finish(); }
function input(value: string): number {
  const bytes = new TextEncoder().encode(value), at = native._auth_input_ptr();
  if (native._auth_input_capacity() !== 4096 || bytes.length > 4096 || at < 0 || at + 4097 > native.HEAPU8.length) unknown();
  native.HEAPU8.fill(0, at, at + 4097); native.HEAPU8.set(bytes, at); return bytes.length;
}
function key(value: unknown): string {
  if (typeof value !== 'string' || value.length > 200) throw Error(); const url = new URL(value);
  if (url.protocol !== 'https:' || ![serviceString('a_d1d8109613cd'),serviceString('a_d1460da3012e'),serviceString('a_b97db64c383a')].includes(url.hostname) || url.port || url.username || url.password || url.search || url.hash || !/^\/bfs\/wbi\/[a-f0-9]{32}\.png$/.test(url.pathname)) throw Error();
  return url.pathname.slice(-36, -4);
}
function begin(op: number): void { expected = op; if (native._auth_begin(op) !== 1) close('account.invalid_closed'); }
function progress(data: Record<string, unknown>): { ms: number; cid: string; target: boolean } {
  const ms = data.last_play_time, cid = String(data.last_play_cid);
  if (typeof ms !== 'number' || !Number.isSafeInteger(ms) || ms < 0 || ms > (video.durationSec + 2) * 1000 || !['0',video.cid].includes(cid)) throw Error();
  return { ms, cid, target: cid === video.cid && ms >= 15000 && ms <= 16000 };
}
function response(op: number): void {
  if (op !== expected || !active?.session) throw Error(); expected = undefined;
  const http = native._auth_http_status(), rc = native._auth_curl_status();
  if (rc !== 0 || http !== 200) { native._auth_response_clear(); close(Number.isInteger(rc) && rc > 0 && rc <= 127 ? `account.transport_c${rc}_op${op}_closed` : Number.isInteger(http) && http >= 100 && http <= 599 ? `account.http_${http}_op${op}_closed` : 'account.readback_transport_closed'); return; }
  const at = native._auth_body_ptr(), n = native._auth_body_length(); if (at < 0 || n < 1 || n > 131072 || at + n > native.HEAPU8.length) throw Error();
  let raw: Record<string, unknown>; try { raw = record(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(native.HEAPU8.subarray(at, at + n)))); } finally { native._auth_response_clear(); }
  if (raw.code !== 0) { close(raw.code === -101 ? 'account.readback_api_login_closed' : raw.code === -403 ? 'account.readback_api_denied_closed' : raw.code === -412 || raw.code === -352 ? 'account.readback_api_risk_closed' : 'account.readback_api_other_closed'); return; } const data = record(raw.data);
  if (op === 2) {
    if (data.isLogin !== true || String(data.mid) !== active.session.uid) { close('account.identity_mismatch_closed'); return; }
    if (typeof data.uname !== 'string' || !data.uname.length || data.uname.length > 80 || /[\u0000-\u001f]/.test(data.uname)) throw Error(); name = data.uname;
    const wbi = record(data.wbi_img); img = key(wbi.img_url); sub = key(wbi.sub_url); begin(3); return;
  }
  if (op === 3) {
    if (data.bvid !== video.bvid || String(data.aid) !== video.aid || !Array.isArray(data.pages) || data.pages.length !== 1) throw Error();
    const page = record(data.pages[0]); if (String(page.cid) !== video.cid || page.duration !== video.durationSec) throw Error(); begin(4); return;
  }
  if (op === 4) {
    legacyTarget = progress(data).target;
    if (active.session.expiresAt <= Date.now()) { close('account.expired_closed'); return; }
    if (native._auth_readback_prepare(input([img, sub, Math.floor(Date.now() / 1000)].join('\n') + '\n')) !== 1) throw Error(); img = sub = ''; begin(5); return;
  }
  if (op !== 5) throw Error();
  // Unlike API code 0, the current player route's own login_mid binds this
  // progress response to the protected session, not just the earlier nav.
  if (String(data.login_mid) !== active.session.uid) { close('account.readback_identity_unconfirmed_closed'); return; }
  const value = progress(data), view: AccountView = { name, uidSuffix: active.session.uid.slice(-4), lastPlayTime: value.ms, progressCid: value.cid, restored: true };
  post({ kind: 'view', view }); close(value.target ? legacyTarget ? 'account.readback_both_target_closed' : 'account.readback_modern_target_closed' : legacyTarget ? 'account.readback_legacy_target_closed' : 'account.readback_neither_target_closed');
}
const native = {
  noInitialRun: true, onRuntimeInitialized() { if (!stopping) native.callMain([]); },
  print(line: unknown) {
    if (line === 'AUTH:unclosed') unknown();
    if (line === 'AUTH:closed') { finish(); return; }
    if (line === 'AUTH:deadline' || line === 'AUTH:transport') { code = 'account.readback_transport_closed'; return; }
    if (line !== 'AUTH:ready' && !(typeof line === 'string' && /^AUTH:response:[2-5]$/.test(line))) return;
    if (task !== undefined) unknown(); if (line === 'AUTH:ready') initialized = true;
    task = setTimeout(() => { task = undefined; if (stopping || completed || !active?.session) return;
      try { if (line === 'AUTH:ready') { if (native._auth_import_cookies(input(active.session.cookieLines)) !== 1) throw Error(); begin(2); } else response(Number((line as string).slice(-1))); }
      catch { close('account.invalid_closed'); }
    }, 0);
  }, printErr() {}, onAbort: unknown, locateFile: (file: string) => 'account-readback/' + file,
} as unknown as Native;
host.onmessage = event => {
  if (completed) return;
  if (active) { const v = event.data; if (v && Object.keys(v).length === 4 && v.version === 1 && v.operation === 'account-probe' && JSON.stringify(v.scope) === JSON.stringify(active.scope) && v.control === 'stop') close('account.cancelled_closed'); return; }
  try { active = parseAccountRequest(event.data); if (!active.session || active.session.expiresAt <= Date.now() || active.session.expiresAt > Date.now() + 1800000) throw Error(); } catch { active = undefined; return; }
  host.Module = configureServiceNative(native); try { host.importScripts('account-readback/probe.js'); } catch { unknown(); }
};
