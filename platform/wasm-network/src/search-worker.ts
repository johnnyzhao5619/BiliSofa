import { parseSearchRequest, parseSearchResult, type SearchRequest, type SearchResult, type SearchResponseIssue } from '../../../packages/contracts/src/search.ts';
import { parseSearchBody, SearchBodyError } from '../../../packages/bili-client/src/search.ts';
import {parsePublicSearchKeys,searchSigningKeyword} from '../../../packages/bili-client/src/search-wbi.ts';
import {parseUserSearchRequest,parseUserSearchResult,type UserSearchRequest,type UserSearchResult} from '../../../packages/contracts/src/user-search.ts';
import {parseUserSearchBody} from '../../../packages/bili-client/src/user-search.ts';
import {parsePgcSearchRequest,parsePgcSearchResult,type PgcSearchRequest,type PgcSearchResult} from '../../../packages/contracts/src/pgc-search.ts';
import {parsePgcSearchBody} from '../../../packages/bili-client/src/pgc-search.ts';
import {parseLiveSearchRequest,parseLiveSearchResult,type LiveSearchRequest,type LiveSearchResult} from '../../../packages/contracts/src/live-search.ts';
import {parseLiveSearchBody} from '../../../packages/bili-client/src/live-search.ts';
interface NativeModule {
  arguments: string[]; noInitialRun: boolean; noExitRuntime:boolean; onRuntimeInitialized(): void;
  print(line: unknown): void; printErr(): void; onAbort(): void; locateFile(name: string): string;
  callMain?: (args: string[]) => void; HEAPU8?: Uint8Array;
  _guest_response_ptr?: () => number; _guest_response_length?: () => number;
  _guest_http_status?: () => number; _guest_curl_status?: () => number;
}
const worker = globalThis as unknown as { onmessage: ((event: MessageEvent) => void) | null; postMessage(value: SearchResult|UserSearchResult|PgcSearchResult|LiveSearchResult): void; importScripts(...paths: string[]): void; Module?: NativeModule };
let active: SearchRequest|UserSearchRequest|PgcSearchRequest|LiveSearchRequest|undefined, cancelled = false, completed = false,prefix:'search'|'up'|'pgc'|'live'='search';
let phase:'nav'|'query'='nav';
function finish(data: Pick<SearchResult, 'kind' | 'status' | 'code'> & {items?:unknown[];apiCode?:number;noMore?:boolean}): void {
  if (!active || completed) return;
  const value={ version: 1, scope: active.scope, operation: active.operation, closed: true, items: [], noMore: true, ...data };
  const result=active.operation==='public-live-search'?parseLiveSearchResult(value):active.operation==='public-pgc-search'?parsePgcSearchResult(value):active.operation==='public-user-search'?parseUserSearchResult(value):parseSearchResult(value);
  completed = true;
  worker.postMessage(result);
}
worker.onmessage = async event => {
  if (active) {
    // Cancel is ownership scoped and has no payload. During synchronous cURL it
    // may be delivered after completion; the parent already rejects that result.
    const v = event.data;
    if (v && typeof v === 'object' && Object.keys(v).length === 4 && v.version === 1 && v.control === 'stop' && v.operation === active.operation && JSON.stringify(v.scope) === JSON.stringify(active.scope)) cancelled = true;
    return;
  }
  try { active = event.data?.operation==='public-live-search'?parseLiveSearchRequest(event.data):event.data?.operation==='public-pgc-search'?parsePgcSearchRequest(event.data):event.data?.operation==='public-user-search'?parseUserSearchRequest(event.data):parseSearchRequest(event.data);prefix=active.operation==='public-live-search'?'live':active.operation==='public-pgc-search'?'pgc':active.operation==='public-user-search'?'up':'search'; } catch { return; }
  try { searchSigningKeyword(active.keyword); } catch { finish({kind:'invalid_response',status:0,code:prefix+'.invalid_response_signing_keyword'});return; }
  try {
    const response = await fetch('search/manifest.json');
    if (response.body) await response.body.cancel();
    if (!response.ok) { finish({ kind: 'transport_error', status: 0, code: prefix+'.native_unavailable' }); return; }
  } catch { finish({ kind: 'transport_error', status: 0, code: prefix+'.native_unavailable' }); return; }
  if (cancelled) { finish({ kind: 'cancelled', status: 0, code: prefix+'.cancelled' }); return; }
  worker.Module = {
    arguments: ['search-public-nav'], noInitialRun: true, noExitRuntime:true,
    onRuntimeInitialized() {
      if (cancelled) { finish({ kind: 'cancelled', status: 0, code: prefix+'.cancelled' }); return; }
      try { worker.Module!.callMain!(worker.Module!.arguments); }
      catch { /* Abort/exception without GUEST:closed cannot confirm native closure. Parent blocks reuse. */ }
    },
    print(line) {
      if (line !== 'GUEST:closed' || completed) return;
      // Wait until native cleanup/stdio has returned before reading WASM exports.
      setTimeout(() => {
      if (completed) return;
      if (cancelled) { finish({ kind: 'cancelled', status: 0, code: prefix+'.cancelled' }); return; }
      const module = worker.Module!;
      let status = 0,issue:SearchResponseIssue='native';
      try {
        status = module._guest_http_status!(); const rc = module._guest_curl_status!();
        if (!Number.isInteger(status) || status < 0 || status > 599 || !Number.isInteger(rc) || rc < 0 || rc > 999) throw new Error();
        if (rc !== 0) { finish({ kind: 'transport_error', status, code: `${prefix}.${phase==='nav'?'nav_':''}transport_${rc}` }); return; }
        if (status !== 200) { finish({ kind: 'http_error', status, code: `${prefix}.${phase==='nav'?'nav_':''}http_${status}` }); return; }
        const start = module._guest_response_ptr!(), length = module._guest_response_length!(), heap = module.HEAPU8;
        if (!heap || !Number.isInteger(start) || start < 0 || !Number.isInteger(length) || length < 1 || length > (phase==='nav'?16384:524288) || start + length > heap.length) throw new Error();
        // The raw public response never crosses postMessage or stdout. No headers,
        // Set-Cookie values, URLs, raw JSON or outside markup enter diagnostics.
        issue='utf8';const raw=new TextDecoder('utf-8', { fatal: true }).decode(heap.subarray(start, start + length));
        if(phase==='nav'){
          issue='public_keys';const keys=parsePublicSearchKeys(raw);phase='query';
          // The first C operation is closed. Give queued stop/Home a boundary
          // before starting the one signed GET; never fall back to unsigned.
          setTimeout(()=>{
            if(completed)return;
            if(cancelled){finish({kind:'cancelled',status:0,code:prefix+'.cancelled'});return;}
            try{module.callMain!([active!.operation==='public-live-search'?'live-search-wbi':active!.operation==='public-pgc-search'?'pgc-search-wbi':active!.operation==='public-user-search'?'user-search-wbi':'video-search-wbi',active!.keyword,String(active!.page),keys.img,keys.sub,String(Math.floor(Date.now()/1000))]);}
            catch{/* No GUEST:closed cannot prove cleanup. Parent blocks reuse. */}
          },0);return;
        }
        const parsed = active!.operation==='public-live-search'?parseLiveSearchBody(raw,active!.page):active!.operation==='public-pgc-search'?parsePgcSearchBody(raw,active!.page):active!.operation==='public-user-search'?parseUserSearchBody(raw,active!.page):parseSearchBody(raw,active!.page);
        finish({ kind: parsed.apiCode === 0 ? 'ok' : 'api_error', status, code: prefix+(parsed.apiCode === 0 ? '.ok' : '.api_error'), ...parsed });
      } catch(error) { finish({ kind: 'invalid_response', status: Number.isInteger(status) && status >= 100 && status <= 599 ? status : 0, code: `${prefix}.invalid_response_${error instanceof SearchBodyError?error.issue:issue}` }); }
      }, 0);
    },
    printErr() {},
    // Runtime abort is deliberately not a closed:true response. Parent timeout
    // marks cleanup unknown and prevents silent reuse.
    onAbort() {},
    locateFile: name => `search/${name}`,
  };
  try { worker.importScripts('search/probe.js'); }
  catch { /* Import/CSP failure can happen after partial native init: do not claim fd closure. */ }
};
