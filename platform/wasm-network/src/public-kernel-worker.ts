import { configureServiceNative } from '../../../packages/contracts/src/service-configuration.ts';
import { parseKernelCommand, isSearchRequest, type KernelEvent, type KernelRequest, type WbiKeys } from '../../../packages/contracts/src/public-kernel.ts';
import { parsePopularBody } from '../../../packages/bili-client/src/popular.ts';
import { parseRankingBody, parsePgcRankingBody, parseUpArchivesBody, parseVisitorBody } from '../../../packages/bili-client/src/ranking.ts';
import { parseSearchBody, SearchBodyError } from '../../../packages/bili-client/src/search.ts';
import { parseUserSearchBody } from '../../../packages/bili-client/src/user-search.ts';
import { parsePgcSearchBody } from '../../../packages/bili-client/src/pgc-search.ts';
import { parseHotSearchBody } from '../../../packages/bili-client/src/hot-search.ts';
import { parsePublicSearchKeys, searchSigningKeyword } from '../../../packages/bili-client/src/search-wbi.ts';
import { runtimeUserAgent } from '../../../packages/contracts/src/up-archives.ts';
import { parseVodDetail } from '../../../packages/bili-client/src/vod-catalog.ts';
import { DomainError } from '../../../packages/contracts/src/index.ts';
import { VIEW_PARTS } from '../../../packages/contracts/src/public-kernel.ts';
/** ADR-108: the resident public read kernel. One WASM instance stays loaded; each
 * request reuses its connections. Raw bodies and headers never leave this Worker:
 * only the lane result shape (bounded display data) is posted. */
interface Native {
  HEAPU8: Uint8Array; callMain(args: string[]): void;
  _kernel_input_ptr(): number; _kernel_input_capacity(): number; _kernel_body_ptr(): number; _kernel_body_length(): number;
  _kernel_http_status(): number; _kernel_curl_status(): number; _kernel_set_agent(): number; _kernel_set_visitor(): number;
  _kernel_begin(operation: number): number; _kernel_stop(): number; _kernel_close(): void;
}
const port = globalThis as unknown as { onmessage: ((event: MessageEvent) => void) | null; postMessage(value: KernelEvent): void; importScripts(path: string): void; Module: Record<string, unknown>; navigator?: { userAgent?: unknown } };
const POPULAR = 1, RANKING = 2, CATEGORY = 3, PGC_RANKING = 4, PGC_INDEX = 5, UP = 6, VISITOR = 7, SEARCH_NAV = 8, SEARCH = 9, HOT = 10, VIEW = 11;
let native: Native | undefined, phase: 'idle' | 'loading' | 'ready' | 'closing' | 'closed' = 'idle';
let current: { requestId: string; request: KernelRequest; keys?: WbiKeys; fetched?: WbiKeys; step: number; token: number } | undefined, tokens = 0;
const queued: unknown[] = [];
const post = (value: KernelEvent) => port.postMessage(value);
function input(value: string): boolean {
  const n = native!, bytes = new TextEncoder().encode(value), at = n._kernel_input_ptr(), cap = n._kernel_input_capacity();
  if (!Number.isSafeInteger(at) || at < 0 || cap !== 1024 || at + cap + 1 > n.HEAPU8.length || bytes.length > cap || bytes.includes(0)) return false;
  n.HEAPU8.fill(0, at, at + cap + 1); n.HEAPU8.set(bytes, at); return true;
}
const prefix = (r: KernelRequest) => r.operation === 'public-video-view' ? 'view' : r.operation === 'guest-popular' ? 'guest' : r.operation === 'public-video-search' ? 'search' : r.operation === 'public-user-search' ? 'up' : r.operation === 'public-pgc-search' ? 'pgc' : r.operation === 'public-search-hot' ? 'hot' : 'ranking';
/** The existing lane result shape, so the main-thread lane checks it with its own parser. */
function shape(r: KernelRequest, data: Record<string, unknown>): Record<string, unknown> {
  // ADR-110: the view keeps its own small shape: an error code, or the detail the page shows.
  if (r.operation === 'public-video-view') { const { kind, code, detail } = data as { kind: string; code?: string; detail?: unknown }; return { version: 1, scope: r.scope, operation: r.operation, closed: true, kind: kind === 'ok' ? 'ok' : 'error', ...(kind === 'ok' ? { detail } : { code: viewCode(code) }) }; }
  const extra = r.operation === 'public-category-ranking' ? { categoryId: r.categoryId } : r.operation === 'public-pgc-ranking' ? { seasonType: r.seasonType, span: r.span, page: r.page, seasons: [] } : r.operation === 'public-up-archives' ? { mid: r.mid, page: r.page, archives: [] } : {};
  const paged = r.operation === 'guest-popular' || isSearchRequest(r);
  return { version: 1, scope: r.scope, operation: r.operation, closed: true, items: [], ...(paged ? { noMore: true } : {}), ...extra, ...data };
}
/** Fixed failure words for the view; transport and HTTP failures are network, cURL 28 a timeout. */
function viewCode(code: unknown): string { const s = String(code ?? ''); return /^(invalid|cancelled|timeout|network|login|permission|unsupported)$/.test(s) ? s : /transport_28$/.test(s) ? 'timeout' : /invalid_response/.test(s) ? 'invalid' : 'network'; }
function finish(data: Record<string, unknown>): void {
  const active = current; if (!active) return; current = undefined;
  post({ version: 1, type: 'result', requestId: active.requestId, result: shape(active.request, data), ...(active.fetched ? { keys: active.fetched } : {}) });
  drain();
}
function operation(r: KernelRequest, keys: WbiKeys | undefined): [number, string] | undefined {
  switch (r.operation) {
  case 'guest-popular': return [POPULAR, String(r.page)];
  case 'public-ranking': return [RANKING, ''];
  case 'public-category-ranking': return [CATEGORY, String(r.categoryId)];
  case 'public-pgc-ranking': return r.span === 'all' ? [PGC_INDEX, `${r.seasonType}|${r.page}`] : [PGC_RANKING, `${r.seasonType}|${r.span === 'week' ? 7 : 3}`];
  case 'public-up-archives': return [UP, `${r.mid}|${r.page}`];
  case 'public-visitor': return [VISITOR, ''];
  case 'public-search-hot': return [HOT, ''];
  case 'public-video-view': return [VIEW, r.bvid];
  default:
    if (!keys) return [SEARCH_NAV, ''];
    return [SEARCH, `${r.operation === 'public-pgc-search' ? 2 : r.operation === 'public-user-search' ? 1 : 0}|${r.page}|${keys.img}|${keys.sub}|${Math.floor(Date.now() / 1000)}|${r.keyword}`];
  }
}
function begin(): void {
  const active = current!, r = active.request, code = prefix(r);
  if (isSearchRequest(r)) { try { searchSigningKeyword(r.keyword); } catch { finish({ kind: 'invalid_response', status: 0, code: code + '.invalid_response_signing_keyword' }); return; } }
  const visitor = (r.operation === 'public-category-ranking' || r.operation === 'public-up-archives') && r.visitor ? r.visitor : '';
  const step = operation(r, active.keys ?? active.fetched);
  if (!step || !input(visitor) || native!._kernel_set_visitor() !== 1 || !input(step[1]) || native!._kernel_begin(step[0]) !== 1) {
    finish({ kind: 'invalid_response', status: 0, code: code + '.invalid_response' }); return;
  }
  active.step = step[0]; active.token = ++tokens;
}
function body(limit: number): string {
  const n = native!, at = n._kernel_body_ptr(), length = n._kernel_body_length();
  if (!Number.isInteger(at) || at < 0 || !Number.isInteger(length) || length < 1 || length > limit || at + length > n.HEAPU8.length) throw new Error();
  return new TextDecoder('utf-8', { fatal: true }).decode(n.HEAPU8.subarray(at, at + length));
}
function responded(token: number): void {
  const active = current; if (!active || active.token !== token) return;
  const r = active.request, code = prefix(r), n = native!;
  const status = n._kernel_http_status(), rc = n._kernel_curl_status(), nav = active.step === SEARCH_NAV;
  if (!Number.isInteger(status) || status < 0 || status > 599 || !Number.isInteger(rc) || rc < 0 || rc > 999) { finish({ kind: 'invalid_response', status: 0, code: code + '.invalid_response' }); return; }
  const tag = nav ? 'nav_' : '';
  if (rc !== 0) { finish({ kind: 'transport_error', status, code: `${code}.${code === 'guest' || code === 'ranking' || code === 'hot' ? '' : tag}transport_${rc}` }); return; }
  if (status !== 200) { finish({ kind: 'http_error', status, code: `${code}.${code === 'guest' || code === 'ranking' || code === 'hot' ? '' : tag}http_${status}` }); return; }
  let issue = 'native';
  try {
    if (nav) { issue = 'public_keys'; active.fetched = parsePublicSearchKeys(body(16384)); begin(); return; }
    if (r.operation === 'guest-popular') { const p = parsePopularBody(body(524288), 20); finish({ kind: p.apiCode === 0 ? 'ok' : 'api_error', status, code: p.apiCode === 0 ? 'guest.popular_ok' : 'guest.api_error', ...p }); return; }
    if (r.operation === 'public-video-view') {
      try {
        const d = parseVodDetail(body(4194304), r.bvid).summary;
        finish({ kind: 'ok', detail: { partCount: d.parts.length, parts: d.parts.slice(0, VIEW_PARTS).map(p => ({ part: p.part, title: p.title, durationMs: p.durationMs })), ...(d.owner ? { owner: d.owner } : {}), ...(d.about ? { about: d.about } : {}) } });
      } catch (error) { finish({ kind: 'error', code: error instanceof DomainError ? error.code : 'invalid' }); }
      return;
    }
    if (r.operation === 'public-search-hot') { const p = parseHotSearchBody(body(65536)); finish({ kind: p.apiCode === 0 ? 'ok' : 'api_error', status, code: p.apiCode === 0 ? 'hot.ok' : 'hot.api_error', ...p }); return; }
    if (isSearchRequest(r)) {
      issue = 'utf8'; const raw = body(524288);
      const p = r.operation === 'public-pgc-search' ? parsePgcSearchBody(raw, r.page, 20) : r.operation === 'public-user-search' ? parseUserSearchBody(raw, r.page, 20) : parseSearchBody(raw, r.page, 20);
      finish({ kind: p.apiCode === 0 ? 'ok' : 'api_error', status, code: code + (p.apiCode === 0 ? '.ok' : '.api_error'), ...p }); return;
    }
    const raw = body(524288);
    const outcome = (apiCode: number) => ({ kind: apiCode === 0 ? 'ok' : 'api_error', status, code: apiCode === 0 ? 'ranking.ok' : 'ranking.api_error', apiCode });
    // ADR-106: only b_3/b_4 leave this Worker; the raw body and any Set-Cookie stay here.
    if (r.operation === 'public-visitor') { const p = parseVisitorBody(raw); finish({ ...outcome(p.apiCode), ...(p.visitor ? { visitorId: p.visitor } : {}) }); return; }
    if (r.operation === 'public-up-archives') { const p = parseUpArchivesBody(raw); finish({ ...outcome(p.apiCode), archives: p.archives, archivesTotal: p.total, ...(p.skipped ? { skipped: p.skipped } : {}) }); return; }
    if (r.operation === 'public-pgc-ranking') { const p = parsePgcRankingBody(raw); finish({ ...outcome(p.apiCode), seasons: p.seasons, ...(r.span === 'all' ? { seasonsMore: p.more } : {}), ...(p.skipped ? { skipped: p.skipped } : {}) }); return; }
    const p = parseRankingBody(raw); finish({ ...outcome(p.apiCode), ...p });
  } catch (error) {
    const valid = status >= 100 && status <= 599 ? status : 0;
    finish({ kind: 'invalid_response', status: valid, code: isSearchRequest(r) ? `${code}.invalid_response_${error instanceof SearchBodyError ? error.issue : issue}` : code + '.invalid_response' });
  }
}
function handle(value: unknown): void {
  let command;
  try { command = parseKernelCommand(value); } catch { return; }
  if (command.type === 'close') {
    if (phase !== 'ready') { post({ version: 1, type: 'closed', confirmed: phase === 'closed' }); return; }
    phase = 'closing'; current = undefined; native!._kernel_close(); return;
  }
  if (command.type === 'stop') {
    if (current?.requestId !== command.requestId) return;
    // Removes only this transfer from the multi handle; the session stays.
    native!._kernel_stop(); current = undefined; post({ version: 1, type: 'stopped', requestId: command.requestId }); drain(); return;
  }
  if (current) return; // one request at a time; the client never overlaps
  current = { requestId: command.requestId, request: command.request, ...(command.keys ? { keys: command.keys } : {}), step: 0, token: 0 };
  begin();
}
function drain(): void { while (phase === 'ready' && !current && queued.length) handle(queued.shift()); }
function boot(): void {
  phase = 'loading';
  port.Module = configureServiceNative({
    noInitialRun: true, noExitRuntime: true,
    onRuntimeInitialized() { try { (port.Module as unknown as Native).callMain([]); } catch { post({ version: 1, type: 'failed' }); } },
    print(line: unknown) {
      if (line === 'KERNEL:ready') {
        native = port.Module as unknown as Native; phase = 'ready';
        // ADR-104: catalog reads carry the TV web runtime's own User-Agent; without one the probe identifier stays.
        const agent = runtimeUserAgent(port.navigator?.userAgent);
        if (agent && (!input(agent) || native._kernel_set_agent() !== 1)) { post({ version: 1, type: 'failed' }); return; }
        post({ version: 1, type: 'ready' }); drain(); return;
      }
      if (line === 'KERNEL:closed' || line === 'KERNEL:unclosed') { phase = 'closed'; post({ version: 1, type: 'closed', confirmed: line === 'KERNEL:closed' }); return; }
      const match = typeof line === 'string' ? /^KERNEL:response:([0-9]{1,2})$/.exec(line) : null;
      // Read exports only after the tick that printed this has returned, and only for the transfer that printed it.
      if (match && current && current.step === Number(match[1])) { const token = current.token; setTimeout(() => responded(token), 0); }
    },
    printErr() {}, onAbort() { post({ version: 1, type: 'failed' }); },
    locateFile: (name: string) => `public-kernel/${name}`,
  });
  void fetch('public-kernel/manifest.json').then(response => {
    void response.body?.cancel();
    if (!response.ok) throw new Error();
    port.importScripts('public-kernel/probe.js');
  }).catch(() => { post({ version: 1, type: 'failed' }); });
}
port.onmessage = event => {
  if (phase === 'idle') boot();
  if (phase === 'ready') handle(event.data);
  else if (phase === 'loading') { if (queued.length < 8) queued.push(event.data); }
  else if (phase === 'closed') post({ version: 1, type: 'closed', confirmed: true });
};
