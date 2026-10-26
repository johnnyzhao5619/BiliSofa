import { DomainError, record, type ErrorCode } from '../../../packages/contracts/src/index.ts';
import { parseAccountKernelCommand, type AccountKernelRequest } from '../../../packages/contracts/src/account-kernel.ts';
import type { KernelEvent } from '../../../packages/contracts/src/public-kernel.ts';
import { RecommendationReadError } from '../../../packages/contracts/src/recommendations.ts';
import { parseWatchLaterBody } from '../../../packages/bili-client/src/watch-later.ts';
import { parseHistoryBody } from '../../../packages/bili-client/src/history.ts';
import { parseFavoriteFoldersBody, parseFavoriteItemsBody } from '../../../packages/bili-client/src/favorites.ts';
import { parseFollowUpdatesBody } from '../../../packages/bili-client/src/follow-updates.ts';
import { parseRecommendationBody } from '../../../packages/bili-client/src/recommendations.ts';
import { parseRankingBody, parseUpArchivesBody } from '../../../packages/bili-client/src/ranking.ts';
import { parsePublicWbiImages } from '../../../packages/bili-client/src/search-wbi.ts';
import { navAccountProfile } from '../../../packages/bili-client/src/account-profile.ts';
import { parseAccountIdentity } from '../../../packages/contracts/src/private-account.ts';
/** ADR-108 P0b: the resident account read kernel. One verified session (jar and connection)
 * serves every private read of one account. nav is checked when the session opens, again
 * after ten minutes, and after any login refusal. The jar never leaves this Worker; only
 * the existing lane result shapes (bounded display data) are posted. */
interface Native {
  HEAPU8: Uint8Array; callMain(args: string[]): void;
  _auth_input_ptr(): number; _auth_input_capacity(): number; _auth_body_ptr(): number; _auth_body_length(): number;
  _auth_http_status(): number; _auth_curl_status(): number; _auth_response_clear(): void; _auth_import_cookies(length: number): number;
  _auth_stop(): void; _kernel_begin(operation: number): number; _kernel_stop(): number;
}
const port = globalThis as unknown as { onmessage: ((event: MessageEvent) => void) | null; postMessage(value: KernelEvent): void; importScripts(path: string): void; Module: Record<string, unknown> };
const NAV = 0, HISTORY = 2, FOLDERS = 3, FOLLOW_UPDATES = 5, RECOMMEND = 6, WATCH_LATER = 7, FAVORITE_ITEMS = 8, CATEGORY = 9, UP = 10, RANKING = 11, VERIFY_MS = 600000;
let native: Native | undefined, phase: 'idle' | 'loading' | 'ready' | 'failed' = 'idle', live = false, ended: 'timeout' | 'network' | undefined;
let session: { accountId: string; cookieLines: string; uid: string; verifiedAt: number; keys?: { img: string; sub: string } } | undefined;
let current: { requestId: string; request: AccountKernelRequest; expected: number; token: number } | undefined, tokens = 0;
let closing: 'switch' | 'close' | 'silent' | undefined;
const queued: unknown[] = [];
const post = (value: KernelEvent) => port.postMessage(value);
function input(value: string): number {
  const n = native!, bytes = new TextEncoder().encode(value), at = n._auth_input_ptr(), cap = n._auth_input_capacity();
  if (cap !== 4096 || !Number.isInteger(at) || at < 0 || at + cap + 1 > n.HEAPU8.length || bytes.length > cap || bytes.includes(0)) throw new DomainError('invalid');
  n.HEAPU8.fill(0, at, at + cap + 1); n.HEAPU8.set(bytes, at); return bytes.length;
}
const base = (r: AccountKernelRequest) => ({ version: 1, operation: r.operation, scope: r.scope, closed: true });
/** The failure shape each lane already understands. */
function failure(r: AccountKernelRequest, code: ErrorCode, detail?: string): Record<string, unknown> {
  if (r.operation === 'recommendations-read') return { ...base(r), kind: 'error', code, detail: detail ?? 'recommend.' + code };
  return { ...base(r), kind: 'error', code };
}
function deliver(result: Record<string, unknown>): void {
  const active = current; if (!active) return; current = undefined;
  post({ version: 1, type: 'result', requestId: active.requestId, result }); drain();
}
function begin(operation: number, value: string): void {
  const active = current!;
  try { input(value); } catch { deliver(failure(active.request, 'invalid')); return; }
  active.expected = operation; active.token = ++tokens;
  if (native!._kernel_begin(operation) !== 1) deliver(failure(active.request, 'invalid'));
}
function read(): void {
  const r = current!.request, keys = session?.keys;
  switch (r.operation) {
  case 'watch-later-read': begin(WATCH_LATER, String(r.query.page)); return;
  case 'history-read': begin(HISTORY, `${r.cursor.max}|${r.cursor.viewAtSec}|${r.cursor.business}`); return;
  case 'favorite-folders-read': begin(FOLDERS, ''); return;
  case 'favorite-items-read': begin(FAVORITE_ITEMS, `${r.folderId}|${r.query.page}`); return;
  case 'follow-updates-read': begin(FOLLOW_UPDATES, r.offset); return;
  case 'recommendations-read':
    if (!keys) { deliver(failure(r, 'invalid', 'recommend.invalid')); return; }
    begin(RECOMMEND, `${r.freshType}|${r.index}|${r.brush}|${r.shown}|${keys.img}|${keys.sub}|${Math.floor(Date.now() / 1000)}`); return;
  case 'identity-verify': begin(NAV, ''); return;
  default: {
    const c = r.command;
    if (c.kind === 'category') begin(CATEGORY, String(c.categoryId)); else if (c.kind === 'ranking') begin(RANKING, 'all'); else begin(UP, `${c.mid}|${c.page}`);
  }
  }
}
/** Opens (or switches) the session for this request's account, verifies nav when due, then reads. */
function proceed(): void {
  const active = current; if (!active) return;
  const account = active.request.account;
  if (account.expiresAt <= Date.now()) { deliver(failure(active.request, 'login')); return; }
  if (session && (session.accountId !== account.id || session.cookieLines !== account.cookieLines)) {
    if (live) { closing = 'switch'; native!._auth_stop(); return; }
    session = undefined;
  }
  if (!live) {
    session = undefined; ended = undefined;
    try { native!.callMain([]); } catch { /* reported below */ }
    if (!live) { deliver(failure(active.request, 'unsupported')); return; }
    let imported = 0; try { imported = native!._auth_import_cookies(input(account.cookieLines)); } catch { imported = 0; }
    // A refused jar closes the fresh session before the request fails, so nothing else can start on it.
    if (imported !== 1) { closing = 'silent'; native!._auth_stop(); deliver(failure(active.request, 'invalid')); return; }
    session = { accountId: account.id, cookieLines: account.cookieLines, uid: account.uid, verifiedAt: 0 };
  }
  // ADR-109: an identity request always runs nav itself; reads reuse it for ten minutes.
  if (active.request.operation === 'identity-verify' || Date.now() - session!.verifiedAt >= VERIFY_MS) begin(NAV, ''); else read();
}
function body(): string {
  const n = native!, at = n._auth_body_ptr(), length = n._auth_body_length();
  try {
    if (!Number.isInteger(at) || at < 0 || !Number.isInteger(length) || length < 1 || length > 524288 || at + length > n.HEAPU8.length) throw new DomainError('invalid');
    return new TextDecoder('utf-8', { fatal: true }).decode(n.HEAPU8.subarray(at, at + length));
  } finally { n._auth_response_clear(); }
}
function responded(token: number): void {
  const active = current; if (!active || active.token !== token) return;
  const r = active.request, n = native!, status = n._auth_http_status(), rc = n._auth_curl_status(), operation = active.expected;
  if (!Number.isInteger(rc) || rc < 0 || rc > 999 || !Number.isInteger(status) || status < 0 || status > 599) { n._auth_response_clear(); deliver(failure(r, 'invalid')); return; }
  if (rc || status !== 200) {
    n._auth_response_clear();
    if (r.operation === 'public-read') { deliver(rc === 0 && status >= 400 ? { ...base(r), kind: 'refused', http: status } : failure(r, rc === 28 ? 'timeout' : 'network')); return; }
    deliver(failure(r, 'network', rc ? `recommend.transport_${rc}` : `recommend.http_${status}`)); return;
  }
  try {
    const raw = body();
    if (operation === NAV) {
      const root = record(JSON.parse(raw));
      // The identity Worker's classification: -101 signed out, -403 permission, any other refusal network.
      if (root.code !== 0) { deliver(failure(r, root.code === -101 ? 'login' : root.code === -403 && r.operation === 'identity-verify' ? 'permission' : 'network')); return; }
      const data = record(root.data), mid = typeof data.mid === 'number' && Number.isSafeInteger(data.mid) ? String(data.mid) : data.mid;
      if (data.isLogin !== true || mid !== session!.uid) { deliver(failure(r, 'login')); return; }
      let keys: { img: string; sub: string } | undefined; try { keys = parsePublicWbiImages(data.wbi_img); } catch { keys = undefined; }
      session!.verifiedAt = Date.now(); if (keys) session!.keys = keys; else delete session!.keys;
      if (r.operation === 'identity-verify') { deliver({ ...base(r), kind: 'ok', identity: parseAccountIdentity({ uid: mid, name: data.uname, profile: navAccountProfile(data) }) }); return; }
      read(); return;
    }
    const ok = { ...base(r), kind: 'ok' };
    if (r.operation === 'watch-later-read') deliver({ ...ok, page: parseWatchLaterBody(raw, r.query.page, 20) });
    else if (r.operation === 'history-read') deliver({ ...ok, batch: parseHistoryBody(raw, r.cursor) });
    else if (r.operation === 'favorite-folders-read') deliver({ ...ok, batch: parseFavoriteFoldersBody(raw) });
    else if (r.operation === 'favorite-items-read') deliver({ ...ok, page: parseFavoriteItemsBody(raw, r.query, 20) });
    else if (r.operation === 'follow-updates-read') deliver({ ...ok, batch: parseFollowUpdatesBody(raw, r.offset) });
    else if (r.operation === 'recommendations-read') deliver({ ...ok, batch: parseRecommendationBody(raw, r.account.uid) });
    else if (r.operation === 'identity-verify') deliver(failure(r, 'invalid'));
    else if (r.command.kind === 'category' || r.command.kind === 'ranking') { const p = parseRankingBody(raw); deliver(p.apiCode !== 0 ? { ...base(r), kind: 'refused', apiCode: p.apiCode } : { ...base(r), kind: r.command.kind, items: p.items, ...(p.skipped ? { skipped: p.skipped } : {}) }); }
    else { const p = parseUpArchivesBody(raw); deliver(p.apiCode !== 0 ? { ...base(r), kind: 'refused', apiCode: p.apiCode } : { ...base(r), kind: 'up', archives: p.archives, total: p.total, ...(p.skipped ? { skipped: p.skipped } : {}) }); }
  } catch (error) {
    const code: ErrorCode = error instanceof DomainError ? error.code : 'invalid';
    // A login refusal from any list means the session must prove its identity again.
    if (code === 'login' && session) session.verifiedAt = 0;
    deliver(failure(r, code, error instanceof RecommendationReadError ? error.detail : undefined));
  }
}
function handle(value: unknown): void {
  let command;
  try { command = parseAccountKernelCommand(value); } catch { return; }
  if (command.type === 'close') {
    current = undefined;
    if (!live) { session = undefined; post({ version: 1, type: 'closed', confirmed: true }); return; }
    closing = 'close'; native!._auth_stop(); return;
  }
  if (command.type === 'stop') {
    if (current?.requestId !== command.requestId) return;
    if (live) native!._kernel_stop();
    current = undefined; post({ version: 1, type: 'stopped', requestId: command.requestId }); drain(); return;
  }
  if (current || closing) { if (queued.length < 8) queued.push(value); return; }
  current = { requestId: command.requestId, request: command.request, expected: -1, token: 0 };
  proceed();
}
function drain(): void { while (phase === 'ready' && !current && !closing && queued.length) handle(queued.shift()); }
function printed(line: unknown): void {
  if (line === 'AUTH:ready') { live = true; return; }
  if (line === 'AUTH:deadline') { ended = 'timeout'; return; }
  if (line === 'AUTH:transport') { ended = 'network'; return; }
  if (line === 'AUTH:unclosed') { live = false; session = undefined; phase = 'failed'; post({ version: 1, type: 'failed' }); return; }
  if (line === 'AUTH:closed') {
    live = false; session = undefined; const why = closing, cause = ended; closing = undefined; ended = undefined;
    // Act after native close has returned.
    setTimeout(() => {
      if (why === 'close') { post({ version: 1, type: 'closed', confirmed: true }); drain(); return; }
      if (why === 'switch') { proceed(); return; }
      if (why === 'silent') { drain(); return; }
      // The session ended by itself (ten minutes, request deadline, transport): the open request fails; the next one reopens.
      if (current && current.expected >= 0) deliver(failure(current.request, cause ?? 'network'));
    }, 0);
    return;
  }
  const match = typeof line === 'string' ? /^AUTH:response:([0-9]{1,2})$/.exec(line) : null;
  if (match && current && current.expected === Number(match[1])) { const token = current.token; setTimeout(() => responded(token), 0); }
}
function boot(): void {
  phase = 'loading';
  port.Module = {
    noInitialRun: true, noExitRuntime: true,
    onRuntimeInitialized() { native = port.Module as unknown as Native; phase = 'ready'; post({ version: 1, type: 'ready' }); drain(); },
    print: printed, printErr() {}, onAbort() { phase = 'failed'; post({ version: 1, type: 'failed' }); },
    locateFile: (name: string) => `account-read-kernel/${name}`,
  };
  void fetch('account-read-kernel/manifest.json').then(response => {
    void response.body?.cancel();
    if (!response.ok) throw new Error();
    port.importScripts('account-read-kernel/probe.js');
  }).catch(() => { phase = 'failed'; post({ version: 1, type: 'failed' }); });
}
port.onmessage = event => {
  if (phase === 'idle') boot();
  if (phase === 'ready') handle(event.data);
  else if (phase === 'loading') { if (queued.length < 8) queued.push(event.data); }
};
