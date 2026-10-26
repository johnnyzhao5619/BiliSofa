import { DomainError, record } from '../../../packages/contracts/src/index.ts';
import { parseCommentRequest, parseCommentResult, type CommentRequest, type CommentBatch } from '../../../packages/contracts/src/comments-read.ts';
import { CommentsNativeApi } from './comments-native-api.ts';
import { vodNativeFailure, type VodApiNative } from './vod-native-api.ts';
import { parsePrivateOverlayBinding, type PrivateOverlayBinding } from '../../../packages/contracts/src/overlay-binding.ts';
interface Native extends VodApiNative { noInitialRun: boolean; noExitRuntime: boolean; arguments: string[]; onRuntimeInitialized(): void; print(line: unknown): void; printErr(): void; onAbort(): void; locateFile(name: string): string; }
const port = globalThis as unknown as { onmessage: ((event: MessageEvent) => void) | null; postMessage(value: unknown): void; importScripts(path: string): void; Module?: Native; };
let active: CommentRequest | undefined, api: CommentsNativeApi | undefined, complete = false;
const controller = new AbortController();
/** ADR-112: the playing item's private binding (AID, salts), when the page passed a port; a missing or late one is not an error. */
function binding(port: MessagePort | undefined, bvid: string): Promise<PrivateOverlayBinding | undefined> {
  if (!port) return Promise.resolve(undefined);
  return new Promise(resolve => {
    const done = (value?: PrivateOverlayBinding) => { clearTimeout(timer); port.close(); resolve(value); };
    const timer = setTimeout(() => done(), 3000);
    port.onmessageerror = () => done();
    port.onmessage = event => { try { const v = record(event.data); done(v.kind === 'overlay-binding' && typeof v.part === 'number' ? parsePrivateOverlayBinding(v, { bvid, part: v.part }) : undefined); } catch { done(); } }; port.start();
  });
}
function fault(): void { if (complete) return; complete = true; setTimeout(() => { throw new Error('comments.native_close_unknown'); }, 0); }
async function finish(value?: CommentBatch, error?: unknown): Promise<void> {
  if (complete || !active) return;
  try { await api?.close(); } catch { fault(); return; }
  if (complete) return;
  const base = { version: 1, operation: active.operation, scope: active.scope, closed: true };
  const result = controller.signal.aborted ? { ...base, kind: 'error', code: 'cancelled' } : value ? { ...base, kind: 'ok', batch: value } : { ...base, kind: 'error', code: vodNativeFailure(error) };
  try { port.postMessage(parseCommentResult(result)); complete = true; active = undefined; } catch { fault(); }
}
port.onmessage = event => {
  if (complete) return;
  if (active) {
    try { const v = record(event.data); if (Object.keys(v).length === 4 && v.version === 1 && v.operation === active.operation && v.control === 'stop' && JSON.stringify(v.scope) === JSON.stringify(active.scope)) { controller.abort(); if (!api) void finish(undefined, new DomainError('cancelled')); } } catch { /* Unknown controls cannot affect the owned read. */ }
    return;
  }
  try { active = parseCommentRequest(event.data); } catch { return; }
  if (event.ports.length > 1) { void finish(undefined, new DomainError('invalid')); return; }
  const bound = binding(event.ports[0], active.bvid);
  const native = { noInitialRun: true, noExitRuntime: true, arguments: [],
    onRuntimeInitialized() {
      if (complete || !active) return;
      api = new CommentsNativeApi(port.Module!);
      const request = active;
      void bound.then(value => api!.read(request.bvid, request.command, controller.signal, request.account, value)).then(value => finish(value), error => finish(undefined, error));
    },
    print(line: unknown) { api?.receive(line); }, printErr() {}, onAbort: fault, locateFile: (name: string) => 'comments-read/' + name,
  } as unknown as Native;
  port.Module = native;
  try { port.importScripts('comments-read/probe.js'); } catch { void finish(undefined, new DomainError('unsupported')); }
};
