import { configureServiceNative } from '../../../packages/contracts/src/service-configuration.ts';
import {navAccountProfile} from '../../../packages/bili-client/src/account-profile.ts';
import { DomainError, record, type ErrorCode } from '../../../packages/contracts/src/index.ts';
import { loginQr, parseIdentityEvent, parseIdentityRequest, type IdentityEvent, type IdentityRequest } from '../../../packages/contracts/src/identity.ts';
import { accountId, parseAccountIdentity, parsePrivateAccount, type PrivateAccount,type AccountIdentity } from '../../../packages/contracts/src/private-account.ts';
interface Native {
  HEAPU8: Uint8Array; callMain?(args: string[]): void;
  _auth_input_ptr(): number; _auth_input_capacity(): number; _auth_body_ptr(): number; _auth_body_length(): number;
  _auth_http_status(): number; _auth_curl_status(): number; _auth_response_clear(): void;
  _auth_cookie_ptr(): number; _auth_cookie_length(): number; _auth_cookie_clear(): void; _auth_export_cookies(): number; _auth_import_cookies(length: number): number;
  _auth_begin(operation: number): number; _auth_stop(): void;
}
const port = globalThis as unknown as { onmessage: ((e: MessageEvent) => void) | null; postMessage(v: unknown): void; importScripts(path: string): void; Module?: Native };
let active: IdentityRequest | undefined, phase: 'unloaded' | 'loading' | 'running' | 'closed' = 'unloaded';
let stopped = false, completed = false, key = '', confirmed = false, expected: number | undefined;
let poll: ReturnType<typeof setTimeout> | undefined, deferred: ReturnType<typeof setTimeout> | undefined;
let deadline = 0, code: ErrorCode = 'unknown';
let final: { kind: 'authenticated'; account: PrivateAccount } | { kind: 'verified'; identity: AccountIdentity } | undefined;
function send(data: Record<string, unknown>): void {
  if (active && !completed) port.postMessage(parseIdentityEvent({ version: 1, operation: 'identity', scope: active.scope, ...data }));
}
function ended(): void {
  if (completed) return;
  phase = 'closed'; send(final ? { ...final, closed: true } : { kind: 'closed', code, closed: true });
  final = undefined; active = undefined; completed = true;
}
function stop(reason: ErrorCode): void {
  clearTimeout(poll); clearTimeout(deferred); poll = deferred = undefined; key = ''; expected = undefined; code = reason; stopped = true;
  if (reason !== 'unknown') final = undefined;
  if (phase === 'running') port.Module!._auth_stop();
  else if (phase === 'unloaded') ended();
  // A loading module must reach onRuntimeInitialized or fail unknown. Do not
  // claim cleanup while its startup state is still unresolved.
}
function failUnknown(): never { final = undefined; throw new Error('identity.cleanup_unconfirmed'); }
function later(work: () => void): void {
  if (deferred !== undefined) failUnknown();
  deferred = setTimeout(() => { deferred = undefined; if (!stopped && !completed) { try { work(); } catch { stop('invalid'); } } }, 0);
}
function memory(at: number, length: number, max: number): string {
  const heap = port.Module!.HEAPU8;
  if (!Number.isInteger(at) || at < 0 || !Number.isInteger(length) || length < 1 || length > max || at + length > heap.length) throw new DomainError('invalid');
  return new TextDecoder('utf-8', { fatal: true }).decode(heap.subarray(at, at + length));
}
function input(raw: string): number {
  const m = port.Module!, bytes = new TextEncoder().encode(raw), at = m._auth_input_ptr(), max = m._auth_input_capacity();
  if (max !== 4096 || bytes.length > max || !Number.isInteger(at) || at < 0 || at + max + 1 > m.HEAPU8.length) throw new DomainError('invalid');
  m.HEAPU8.fill(0, at, at + max + 1); m.HEAPU8.set(bytes, at); return bytes.length;
}
function begin(operation: number): void {
  if (stopped || completed) return;
  if (Date.now() >= deadline) { stop('timeout'); return; }
  if (expected !== undefined || operation < 0 || operation > 2) throw new DomainError('invalid');
  if (operation === 1) input(key); expected = operation;
  if (port.Module!._auth_begin(operation) !== 1) { expected = undefined; stop('invalid'); }
}
function uid(value: unknown): string {
  const result = typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : value;
  if (typeof result !== 'string') throw new DomainError('invalid'); accountId(result); return result;
}
function exportedAccount(identity: { uid: string; name: string }): PrivateAccount {
  const m = port.Module!; if (m._auth_export_cookies() !== 1) throw new DomainError('invalid');
  let raw: string; try { raw = memory(m._auth_cookie_ptr(), m._auth_cookie_length(), 3500); } finally { m._auth_cookie_clear(); }
  const lines = raw.split('\n'); if (lines.pop() !== '') throw new DomainError('invalid');
  const now = Date.now(); let expiresAt = now + 366 * 86400000;
  const tightened = lines.map(line => {
    const fields = line.replace(/^#HttpOnly_/, '').split('\t'); if (fields.length !== 7) throw new DomainError('invalid');
    // All native destinations are HTTPS. Persist a narrower Secure-only copy,
    // even if the server's cookie did not carry the Secure attribute.
    fields[3] = 'TRUE';
    if (fields[5] === 'SESSDATA' || fields[5] === 'bili_jct') {
      const seconds = Number(fields[4]); if (!Number.isSafeInteger(seconds) || seconds < 0) throw new DomainError('invalid');
      expiresAt = Math.min(expiresAt, seconds === 0 ? now + 1800000 : seconds * 1000);
    }
    return fields.join('\t');
  }).join('\n') + '\n';
  if (expiresAt <= now) throw new DomainError('login');
  return parsePrivateAccount({ schema: 1, id: accountId(identity.uid), uid:identity.uid,name:identity.name, expiresAt, cookieLines: tightened });
}
function response(operation: number): void {
  if (operation !== expected) throw new DomainError('invalid'); expected = undefined;
  const m = port.Module!, status = m._auth_http_status(), rc = m._auth_curl_status();
  if (!Number.isInteger(rc) || rc < 0 || rc > 127 || !Number.isInteger(status) || status < 0 || status > 599) throw new DomainError('invalid');
  if (rc !== 0 || status !== 200) { m._auth_response_clear(); stop('network'); return; }
  let raw: Record<string, unknown>;
  try { raw = record(JSON.parse(memory(m._auth_body_ptr(), m._auth_body_length(), 131072))); } finally { m._auth_response_clear(); }
  if (raw.code !== 0) { stop(raw.code === -101 ? 'login' : raw.code === -403 ? 'permission' : 'network'); return; }
  const data = record(raw.data);
  if (operation === 0) {
    if (typeof data.qrcode_key !== 'string' || !/^[0-9a-f]{32}$/.test(data.qrcode_key)) throw new DomainError('invalid');
    key = data.qrcode_key; send({ kind: 'qr', url: loginQr(data.url, key) }); poll = setTimeout(() => begin(1), 2000); return;
  }
  if (operation === 1) {
    if (data.code === 86101 || data.code === 86090) {
      if (data.code === 86090 && !confirmed) { confirmed = true; send({ kind: 'confirm' }); }
      poll = setTimeout(() => begin(1), 2000); return;
    }
    if (data.code === 86038) { stop('login'); return; }
    if (data.code !== 0) throw new DomainError('invalid'); key = ''; begin(2); return;
  }
  if (operation !== 2 || data.isLogin !== true) { stop('login'); return; }
  const identity = parseAccountIdentity({ uid: uid(data.mid), name: data.uname, profile:navAccountProfile(data) });
  if (active?.mode === 'verify') {
    if (active.account.uid !== identity.uid || active.account.expiresAt <= Date.now()) { stop('login'); return; }
    final = { kind: 'verified', identity };
  } else final = { kind: 'authenticated', account: exportedAccount(identity) };
  // Success data is released only from the native AUTH:closed callback.
  stop('unknown');
}
port.onmessage = async event => {
  if (completed) return;
  if (active) {
    const v = event.data;
    if (v && typeof v === 'object' && Object.keys(v).length === 4 && v.version === 1 && v.operation === 'identity' && v.control === 'stop' && JSON.stringify(v.scope) === JSON.stringify(active.scope)) { final = undefined; stop('cancelled'); }
    return;
  }
  try { active = parseIdentityRequest(event.data); } catch { return; }
  deadline = Date.now() + (active.mode === 'login' ? 210000 : 12000);
  if (active.mode === 'verify' && active.account.expiresAt <= Date.now()) { stop('login'); return; }
  try { const result = await fetch('identity/manifest.json'); if (result.body) await result.body.cancel(); if (!result.ok) { stop('unsupported'); return; } }
  catch { stop('unsupported'); return; }
  if (stopped || completed) return;
  const module = {
    noInitialRun: true,
    onRuntimeInitialized() { if (stopped) { ended(); return; } phase = 'running'; module.callMain!([]); },
    print(line: unknown) {
      if (line === 'AUTH:unclosed') failUnknown();
      else if (line === 'AUTH:closed') ended();
      else if (line === 'AUTH:deadline') { code = 'timeout'; final = undefined; }
      else if (line === 'AUTH:transport') { code = 'network'; final = undefined; }
      else if (line === 'AUTH:ready') {
        const keys = ['_auth_input_ptr', '_auth_input_capacity', '_auth_body_ptr', '_auth_body_length', '_auth_http_status', '_auth_curl_status', '_auth_response_clear', '_auth_cookie_ptr', '_auth_cookie_length', '_auth_cookie_clear', '_auth_export_cookies', '_auth_import_cookies', '_auth_begin', '_auth_stop'] as const;
        if (!(module.HEAPU8 instanceof Uint8Array) || keys.some(k => typeof module[k] !== 'function')) failUnknown();
        later(() => { if (active?.mode === 'verify') { if (module._auth_import_cookies(input(active.account.cookieLines)) !== 1) { stop('invalid'); return; } begin(2); } else begin(0); });
      } else if (typeof line === 'string' && /^AUTH:response:[0-2]$/.test(line)) later(() => response(Number(line.slice(-1))));
      else failUnknown();
    }, printErr() {}, onAbort: failUnknown, locateFile: (name: string) => 'identity/' + name,
  } as unknown as Native & { print(line: unknown): void };
  port.Module = configureServiceNative(module); phase = 'loading'; port.importScripts('identity/probe.js');
};
// Retain protocol type checking without accepting any URL or native operation from UI.
export type IdentityWorkerEvent = IdentityEvent;
