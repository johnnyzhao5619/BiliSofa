import { DomainError, record } from '../../../packages/contracts/src/index.ts';
import { parsePublicReadRequest, parsePublicReadResult, type PublicReadRequest } from '../../../packages/contracts/src/public-read.ts';
import { PublicNativeApi } from './public-native-api.ts';
import { VodResponseError, vodNativeFailure, type VodApiNative } from './vod-native-api.ts';
interface Native extends VodApiNative { noInitialRun: boolean; noExitRuntime: boolean; arguments: string[]; onRuntimeInitialized(): void; print(line: unknown): void; printErr(): void; onAbort(): void; locateFile(name: string): string; }
const port = globalThis as unknown as { onmessage: ((event: MessageEvent) => void) | null; postMessage(value: unknown): void; importScripts(path: string): void; Module?: Native; };
let active: PublicReadRequest | undefined, api: PublicNativeApi | undefined, complete = false;
const controller = new AbortController();
function fault(): void { if (complete) return; complete = true; setTimeout(() => { throw new Error('public-read.native_close_unknown'); }, 0); }
type Outcome = { kind: 'category' | 'ranking'; apiCode: number; items: unknown[] } | { kind: 'up'; apiCode: number; archives: unknown[]; total: number };
/** One request per Worker (ADR-105), like the comments lane. Only fixed integers describe a refusal. */
async function finish(value?: Outcome, error?: unknown): Promise<void> {
  if (complete || !active) return;
  try { await api?.close(); } catch { fault(); return; }
  if (complete) return;
  const base = { version: 1, operation: 'public-read', scope: active.scope, closed: true };
  const result = controller.signal.aborted ? { ...base, kind: 'error', code: 'cancelled' }
    : value && value.apiCode !== 0 ? { ...base, kind: 'refused', apiCode: value.apiCode }
    : value?.kind === 'category' || value?.kind === 'ranking' ? { ...base, kind: value.kind, items: value.items }
    : value?.kind === 'up' ? { ...base, kind: 'up', archives: value.archives, total: value.total }
    : error instanceof VodResponseError && error.http >= 400 && error.http <= 599 ? { ...base, kind: 'refused', http: error.http }
    : { ...base, kind: 'error', code: vodNativeFailure(error) };
  try { port.postMessage(parsePublicReadResult(result)); complete = true; active = undefined; } catch { fault(); }
}
port.onmessage = event => {
  if (complete) return;
  if (active) {
    try { const v = record(event.data); if (Object.keys(v).length === 4 && v.version === 1 && v.operation === active.operation && v.control === 'stop' && JSON.stringify(v.scope) === JSON.stringify(active.scope)) { controller.abort(); if (!api) void finish(undefined, new DomainError('cancelled')); } } catch { /* Not a control frame. */ }
    return;
  }
  try { active = parsePublicReadRequest(event.data); } catch { return; }
  const native = { noInitialRun: true, noExitRuntime: true, arguments: [],
    onRuntimeInitialized() {
      if (complete || !active) return;
      api = new PublicNativeApi(port.Module!);
      const request = active;
      void api!.read(request.command, controller.signal, request.account).then(value => finish(value as Outcome), error => finish(undefined, error));
    },
    print(line: unknown) { api?.receive(line); }, printErr() {}, onAbort: fault, locateFile: (name: string) => 'public-read/' + name,
  } as unknown as Native;
  port.Module = native;
  try { port.importScripts('public-read/probe.js'); } catch { void finish(undefined, new DomainError('unsupported')); }
};
