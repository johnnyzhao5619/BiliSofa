import { configureServiceNative } from '../../../packages/contracts/src/service-configuration.ts';
import { parsePopularRequest, parsePopularResult, type PopularRequest, type PopularResult } from '../../../packages/contracts/src/index.ts';
import { parsePopularBody } from '../../../packages/bili-client/src/popular.ts';
interface NativeModule {
  arguments: string[]; noInitialRun: boolean; onRuntimeInitialized(): void;
  print(line: unknown): void; printErr(): void; onAbort(): void; locateFile(name: string): string;
  callMain?: (args: string[]) => void; HEAPU8?: Uint8Array;
  _guest_response_ptr?: () => number; _guest_response_length?: () => number;
  _guest_http_status?: () => number; _guest_curl_status?: () => number;
}
const worker = globalThis as unknown as { onmessage: ((event: MessageEvent) => void) | null; postMessage(value: PopularResult): void; importScripts(...paths: string[]): void; Module?: NativeModule };
let active: PopularRequest | undefined, cancelled = false, completed = false;
function finish(data: Pick<PopularResult, 'kind' | 'status' | 'code'> & Partial<Pick<PopularResult, 'items' | 'noMore' | 'apiCode'>>): void {
  if (!active || completed) return;
  completed = true;
  worker.postMessage(parsePopularResult({ version: 1, scope: active.scope, operation: active.operation, closed: true, items: [], noMore: true, ...data }));
}
worker.onmessage = async event => {
  if (active) {
    // Cancel is ownership scoped and has no payload. During synchronous cURL it
    // may be delivered after completion; the parent already rejects that result.
    const v = event.data;
    if (v && typeof v === 'object' && Object.keys(v).length === 4 && v.version === 1 && v.control === 'stop' && v.operation === 'guest-popular' && JSON.stringify(v.scope) === JSON.stringify(active.scope)) cancelled = true;
    return;
  }
  try { active = parsePopularRequest(event.data); } catch { return; }
  const request = active;
  try {
    const response = await fetch('native/manifest.json');
    if (response.body) await response.body.cancel();
    if (!response.ok) { finish({ kind: 'transport_error', status: 0, code: 'guest.native_unavailable' }); return; }
  } catch { finish({ kind: 'transport_error', status: 0, code: 'guest.native_unavailable' }); return; }
  if (cancelled) { finish({ kind: 'cancelled', status: 0, code: 'guest.cancelled' }); return; }
  worker.Module = configureServiceNative({
    arguments: ['guest-popular', String(request.page)], noInitialRun: true,
    onRuntimeInitialized() {
      if (cancelled) { finish({ kind: 'cancelled', status: 0, code: 'guest.cancelled' }); return; }
      try { worker.Module!.callMain!(worker.Module!.arguments); }
      catch { /* Abort/exception without GUEST:closed cannot confirm native closure. Parent blocks reuse. */ }
    },
    print(line) {
      if (line !== 'GUEST:closed' || completed) return;
      // Wait until native cleanup/stdio has returned before reading WASM exports.
      setTimeout(() => {
      if (completed) return;
      if (cancelled) { finish({ kind: 'cancelled', status: 0, code: 'guest.cancelled' }); return; }
      const module = worker.Module!;
      let status = 0;
      try {
        status = module._guest_http_status!(); const rc = module._guest_curl_status!();
        if (!Number.isInteger(status) || status < 0 || status > 599 || !Number.isInteger(rc) || rc < 0 || rc > 999) throw new Error();
        if (rc !== 0) { finish({ kind: 'transport_error', status, code: `guest.transport_${rc}` }); return; }
        if (status !== 200) { finish({ kind: 'http_error', status, code: `guest.http_${status}` }); return; }
        const start = module._guest_response_ptr!(), length = module._guest_response_length!(), heap = module.HEAPU8;
        if (!heap || !Number.isInteger(start) || start < 0 || !Number.isInteger(length) || length < 1 || length > 131072 || start + length > heap.length) throw new Error();
        // The raw public response never crosses postMessage or stdout. No headers,
        // Set-Cookie values, URLs, raw JSON or outside markup enter diagnostics.
        const parsed = parsePopularBody(new TextDecoder('utf-8', { fatal: true }).decode(heap.subarray(start, start + length)));
        finish({ kind: parsed.apiCode === 0 ? 'ok' : 'api_error', status, code: parsed.apiCode === 0 ? 'guest.popular_ok' : 'guest.api_error', ...parsed });
      } catch { finish({ kind: 'invalid_response', status: status >= 100 && status <= 599 ? status : 0, code: 'guest.invalid_response' }); }
      }, 0);
    },
    printErr() {},
    // Runtime abort is deliberately not a closed:true response. Parent timeout
    // marks cleanup unknown and prevents silent reuse.
    onAbort() {},
    locateFile: name => `native/${name}`,
  });
  try { worker.importScripts('native/probe.js'); }
  catch { /* Import/CSP failure can happen after partial native init: do not claim fd closure. */ }
};
