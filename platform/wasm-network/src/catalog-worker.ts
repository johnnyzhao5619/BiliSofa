import { parseRankingRequest, parseRankingResult, type RankingRequest, type RankingResult } from '../../../packages/contracts/src/ranking.ts';
import { parseRankingBody, parsePgcRankingBody } from '../../../packages/bili-client/src/ranking.ts';
interface NativeModule {
  arguments: string[]; noInitialRun: boolean; onRuntimeInitialized(): void;
  print(line: unknown): void; printErr(): void; onAbort(): void; locateFile(name: string): string;
  callMain?: (args: string[]) => void; HEAPU8?: Uint8Array;
  _guest_response_ptr?: () => number; _guest_response_length?: () => number;
  _guest_http_status?: () => number; _guest_curl_status?: () => number;
}
const worker = globalThis as unknown as { onmessage: ((event: MessageEvent) => void) | null; postMessage(value: RankingResult): void; importScripts(...paths: string[]): void; Module?: NativeModule };
let active: RankingRequest | undefined, cancelled = false, completed = false;
function finish(data: Pick<RankingResult, 'kind' | 'status' | 'code'> & Partial<Pick<RankingResult, 'items' | 'apiCode' | 'seasons'>>): void {
  if (!active || completed) return;
  completed = true;
  worker.postMessage(parseRankingResult({ version: 1, scope: active.scope, operation: active.operation, ...(active.operation==='public-category-ranking'?{categoryId:active.categoryId}:{}), closed: true, items: [], ...(active.operation==='public-pgc-ranking'?{seasonType:active.seasonType,span:active.span,page:active.page,seasons:[]}:{}), ...data }));
}
worker.onmessage = async event => {
  if (active) {
    // Cancel is ownership scoped and has no payload. During synchronous cURL it
    // may be delivered after completion; the parent already rejects that result.
    const v = event.data;
    if (v && typeof v === 'object' && Object.keys(v).length === 4 && v.version === 1 && v.control === 'stop' && v.operation === active.operation && JSON.stringify(v.scope) === JSON.stringify(active.scope)) cancelled = true;
    return;
  }
  try { active = parseRankingRequest(event.data); } catch { return; }
  try {
    const response = await fetch('catalog/manifest.json');
    if (response.body) await response.body.cancel();
    if (!response.ok) { finish({ kind: 'transport_error', status: 0, code: 'ranking.native_unavailable' }); return; }
  } catch { finish({ kind: 'transport_error', status: 0, code: 'ranking.native_unavailable' }); return; }
  if (cancelled) { finish({ kind: 'cancelled', status: 0, code: 'ranking.cancelled' }); return; }
  worker.Module = {
    arguments: active.operation==='public-category-ranking'?['category-ranking',String(active.categoryId)]:active.operation==='public-pgc-ranking'?(active.span==='all'?['pgc-index',String(active.seasonType),String(active.page)]:['pgc-ranking',String(active.seasonType),active.span==='week'?'7':'3']):['ranking'], noInitialRun: true,
    onRuntimeInitialized() {
      if (cancelled) { finish({ kind: 'cancelled', status: 0, code: 'ranking.cancelled' }); return; }
      try { worker.Module!.callMain!(worker.Module!.arguments); }
      catch { /* Abort/exception without GUEST:closed cannot confirm native closure. Parent blocks reuse. */ }
    },
    print(line) {
      if (line !== 'GUEST:closed' || completed) return;
      // Wait until native cleanup/stdio has returned before reading WASM exports.
      setTimeout(() => {
      if (completed) return;
      if (cancelled) { finish({ kind: 'cancelled', status: 0, code: 'ranking.cancelled' }); return; }
      const module = worker.Module!;
      let status = 0;
      try {
        status = module._guest_http_status!(); const rc = module._guest_curl_status!();
        if (!Number.isInteger(status) || status < 0 || status > 599 || !Number.isInteger(rc) || rc < 0 || rc > 999) throw new Error();
        if (rc !== 0) { finish({ kind: 'transport_error', status, code: `ranking.transport_${rc}` }); return; }
        if (status !== 200) { finish({ kind: 'http_error', status, code: `ranking.http_${status}` }); return; }
        const start = module._guest_response_ptr!(), length = module._guest_response_length!(), heap = module.HEAPU8;
        if (!heap || !Number.isInteger(start) || start < 0 || !Number.isInteger(length) || length < 1 || length > 524288 || start + length > heap.length) throw new Error();
        // The raw public response never crosses postMessage or stdout. No headers,
        // Set-Cookie values, URLs, raw JSON or outside markup enter diagnostics.
        const body = new TextDecoder('utf-8', { fatal: true }).decode(heap.subarray(start, start + length));
        if (active!.operation === 'public-pgc-ranking') { const parsed = parsePgcRankingBody(body); finish({ kind: parsed.apiCode === 0 ? 'ok' : 'api_error', status, code: parsed.apiCode === 0 ? 'ranking.ok' : 'ranking.api_error', apiCode: parsed.apiCode, seasons: parsed.seasons, ...(active!.span === 'all' ? { seasonsMore: parsed.more } : {}) }); return; }
        const parsed = parseRankingBody(body);
        finish({ kind: parsed.apiCode === 0 ? 'ok' : 'api_error', status, code: parsed.apiCode === 0 ? 'ranking.ok' : 'ranking.api_error', ...parsed });
      } catch { finish({ kind: 'invalid_response', status: status >= 100 && status <= 599 ? status : 0, code: 'ranking.invalid_response' }); }
      }, 0);
    },
    printErr() {},
    // Runtime abort is deliberately not a closed:true response. Parent timeout
    // marks cleanup unknown and prevents silent reuse.
    onAbort() {},
    locateFile: name => `catalog/${name}`,
  };
  try { worker.importScripts('catalog/probe.js'); }
  catch { /* Import/CSP failure can happen after partial native init: do not claim fd closure. */ }
};
