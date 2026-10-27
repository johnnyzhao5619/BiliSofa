import { configureServiceNative } from '../../../packages/contracts/src/service-configuration.ts';
import { ACCOUNT_TEST_VIDEO as video, parseAccountRequest, parseAccountResult, parseQr, type AccountProbeRequest, type AccountProbeResult, type AccountSession, type AccountView } from '../../../packages/contracts/src/account-probe.ts';
import { record } from '../../../packages/contracts/src/index.ts';
interface Native {
  noInitialRun: boolean; onRuntimeInitialized(): void; print(value: unknown): void; printErr(): void; onAbort(): void; locateFile(name: string): string;
  callMain?(args: string[]): void; HEAPU8: Uint8Array;
  _auth_input_ptr(): number; _auth_input_capacity(): number; _auth_body_ptr(): number; _auth_body_length(): number;
  _auth_http_status(): number; _auth_curl_status(): number; _auth_response_clear(): void;
  _auth_cookie_ptr(): number; _auth_cookie_length(): number; _auth_cookie_clear(): void; _auth_export_cookies(): number; _auth_import_cookies(length: number): number;
  _auth_begin(operation: number): number; _auth_stop(): void;
}
const worker = globalThis as unknown as { onmessage: ((e: MessageEvent) => void) | null; postMessage(value: unknown): void; importScripts(path: string): void; Module?: Native };
let active: AccountProbeRequest | undefined, initialized = false, completed = false, stopping = false, awaitingSave = false;
let qrKey = '', uid = '', name = '', lastView: AccountView | undefined, closingCode = 'account.invalid_closed';
let pollTimer: ReturnType<typeof setTimeout> | undefined;
let nativeTask: ReturnType<typeof setTimeout> | undefined;
let confirmationSent = false;
let expectedResponse: number | undefined;
const until = Date.now() + 210000;
function send(data: Omit<AccountProbeResult, 'version' | 'operation' | 'scope'>): void {
  if (!active || completed) return;
  worker.postMessage(parseAccountResult({ version: 1, operation: 'account-probe', scope: active.scope, ...data }));
}
function post(data: Record<string, unknown>): void {
  if (!active || completed) return;
  worker.postMessage(parseAccountResult({ version: 1, operation: 'account-probe', scope: active.scope, ...data }));
}
function close(code: string): void {
  clearTimeout(pollTimer); pollTimer = undefined; clearTimeout(nativeTask); nativeTask = undefined; closingCode = code; qrKey = ''; uid = ''; name = ''; lastView = undefined; awaitingSave = false; stopping = true;
  if (initialized) worker.Module!._auth_stop();
  else if (active) { post({ kind: 'closed', code }); active = undefined; completed = true; }
}
function unknown(): never { throw new Error('account_native_cleanup_unconfirmed'); }
function afterNativePrint(task: () => void): void {
  if (nativeTask !== undefined) unknown();
  // C stdio has not finished flushing while Module.print runs. Re-entering C
  // here can concatenate its next terminal line with the current buffered line.
  nativeTask = setTimeout(() => { nativeTask = undefined; if (!stopping && !completed) task(); }, 0);
}
function memory(start: number, length: number, limit: number): string {
  const heap = worker.Module!.HEAPU8;
  if (!Number.isInteger(start) || start < 0 || !Number.isInteger(length) || length < 1 || length > limit || start + length > heap.length) throw new Error();
  return new TextDecoder('utf-8', { fatal: true }).decode(heap.subarray(start, start + length));
}
function input(value: string): number {
  const m = worker.Module!, bytes = new TextEncoder().encode(value), at = m._auth_input_ptr(), max = m._auth_input_capacity();
  if (max !== 4096 || bytes.length > max || at < 0 || at + max + 1 > m.HEAPU8.length) throw new Error();
  m.HEAPU8.fill(0, at, at + max + 1); m.HEAPU8.set(bytes, at); return bytes.length;
}
function begin(operation: number): void {
  if (stopping || completed) return;
  if (Date.now() >= until) { close('account.deadline_closed'); return; }
  if (expectedResponse !== undefined) throw new Error();
  if (operation === 1) input(qrKey);
  expectedResponse = operation;
  if (worker.Module!._auth_begin(operation) !== 1) { expectedResponse = undefined; close('account.invalid_closed'); }
}
function numericId(value: unknown): string {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return String(value);
  if (typeof value === 'string' && /^[1-9][0-9]{0,15}$/.test(value)) return value;
  throw new Error();
}
function response(operation: number): void {
  if (operation !== expectedResponse) throw new Error(); expectedResponse = undefined;
  const m = worker.Module!, status = m._auth_http_status(), rc = m._auth_curl_status();
  if (!Number.isInteger(status) || status < 0 || status > 599 || !Number.isInteger(rc) || rc < 0 || rc > 127) throw new Error();
  if (rc !== 0) { m._auth_response_clear(); close(`account.transport_c${rc}_op${operation}_closed`); return; }
  if (status !== 200) { m._auth_response_clear(); close(status >= 100 && status <= 599 ? `account.http_${status}_op${operation}_closed` : 'account.transport_closed'); return; }
  let raw: Record<string, unknown>;
  try { raw = record(JSON.parse(memory(m._auth_body_ptr(), m._auth_body_length(), 131072))); } finally { m._auth_response_clear(); }
  if (raw.code !== 0) { close(raw.code === -101 ? 'account.api_login_closed' : raw.code === -403 ? 'account.api_denied_closed' : 'account.api_other_closed'); return; }
  const data = record(raw.data);
  if (operation === 0) {
    if (typeof data.qrcode_key !== 'string' || !/^[0-9a-f]{32}$/.test(data.qrcode_key)) throw new Error();
    qrKey = data.qrcode_key; const url = parseQr(data.url, qrKey); post({ kind: 'qr', url });
    pollTimer = setTimeout(() => begin(1), 2000); return;
  }
  if (operation === 1) {
    if (data.code === 86101 || data.code === 86090) {
      if (data.code === 86090 && !confirmationSent) { confirmationSent = true; send({ kind: 'confirm' }); }
      pollTimer = setTimeout(() => begin(1), 2000); return;
    }
    if (data.code === 86038) { close('account.expired_closed'); return; }
    if (data.code !== 0) throw new Error();
    qrKey = ''; begin(2); return;
  }
  if (operation === 2) {
    if (data.isLogin !== true) { close('account.api_login_closed'); return; }
    uid = numericId(data.mid);
    if (active?.session && active.session.uid !== uid) { close('account.identity_mismatch_closed'); return; }
    if (active?.session && active.session.expiresAt <= Date.now()) { close('account.expired_closed'); return; }
    if (typeof data.uname !== 'string' || !data.uname.length || data.uname.length > 80 || /[\u0000-\u001f]/.test(data.uname)) throw new Error(); name = data.uname;
    begin(3); return;
  }
  if (operation === 3) {
    if (data.bvid !== video.bvid || numericId(data.aid) !== video.aid || !Array.isArray(data.pages) || data.pages.length !== 1) throw new Error();
    const page = record(data.pages[0]); if (numericId(page.cid) !== video.cid || page.duration !== video.durationSec) throw new Error();
    begin(4); return;
  }
  if (operation !== 4 || typeof data.last_play_time !== 'number' || !Number.isSafeInteger(data.last_play_time) || data.last_play_time < 0 || data.last_play_time > (video.durationSec + 2) * 1000) throw new Error();
  const cid = data.last_play_cid === 0 || data.last_play_cid === '0' ? '0' : numericId(data.last_play_cid);
  if (cid !== '0' && cid !== video.cid) throw new Error();
  lastView = { name, uidSuffix: uid.slice(-4), lastPlayTime: data.last_play_time, progressCid: cid, restored: !!active?.session };
  if (active?.session) { post({ kind: 'view', view: lastView }); close('account.restore_readonly_closed'); return; }
  if (m._auth_export_cookies() !== 1) throw new Error();
  let cookieLines: string; try { cookieLines = memory(m._auth_cookie_ptr(), m._auth_cookie_length(), 3500); } finally { m._auth_cookie_clear(); }
  const session: AccountSession = { schema: 1, uid, expiresAt: Date.now() + 1800000, cookieLines };
  awaitingSave = true; post({ kind: 'private-session', session, view: lastView });
}
worker.onmessage = async event => {
  if (completed) return;
  if (active) {
    const v = event.data;
    if (!v || typeof v !== 'object' || Object.keys(v).length !== 4 || v.version !== 1 || v.operation !== 'account-probe' || JSON.stringify(v.scope) !== JSON.stringify(active.scope)) return;
    if (v.control === 'stop') close('account.cancelled_closed');
    else if (v.control === 'saved' && awaitingSave) close('account.readonly_saved_closed');
    return;
  }
  try { active = parseAccountRequest(event.data); if (active.session && (active.session.expiresAt <= Date.now() || active.session.expiresAt > Date.now() + 1800000)) throw new Error(); }
  catch { active = undefined; return; }
  try { const response = await fetch('account/manifest.json'); if (response.body) await response.body.cancel(); if (!response.ok) { close('account.native_unavailable_closed'); return; } }
  catch { close('account.native_unavailable_closed'); return; }
  if (stopping) return;
  const module = {
    noInitialRun: true, onRuntimeInitialized() { if (stopping) return; module.callMain!([]); },
    print(line: unknown) {
      if (line === 'AUTH:unclosed') unknown();
      if (line === 'AUTH:ready') {
        const exports = ['_auth_input_ptr','_auth_input_capacity','_auth_body_ptr','_auth_body_length','_auth_http_status','_auth_curl_status','_auth_response_clear','_auth_cookie_ptr','_auth_cookie_length','_auth_cookie_clear','_auth_export_cookies','_auth_import_cookies','_auth_begin','_auth_stop'] as const;
        if (!(module.HEAPU8 instanceof Uint8Array) || exports.some(key => typeof module[key] !== 'function')) unknown();
        initialized = true;
        afterNativePrint(() => {
          try { if (active?.session) { const length = input(active.session.cookieLines); if (module._auth_import_cookies(length) !== 1) throw new Error(); begin(2); } else begin(0); }
          catch { close('account.invalid_closed'); }
        });
      } else if (line === 'AUTH:closed') {
        post({ kind: 'closed', code: closingCode }); active = undefined; completed = true;
      } else if (line === 'AUTH:deadline') closingCode = 'account.deadline_closed';
      else if (line === 'AUTH:transport') closingCode = 'account.transport_closed';
      else if (typeof line === 'string' && /^AUTH:response:[0-4]$/.test(line)) {
        afterNativePrint(() => {
          try { response(Number(line.slice(-1))); } catch { close(`account.invalid_op${line.slice(-1)}_closed`); }
        });
      }
    }, printErr() {}, onAbort: unknown, locateFile: (name: string) => 'account/' + name,
  } as unknown as Native;
  worker.Module = configureServiceNative(module);
  worker.importScripts('account/probe.js');
};
