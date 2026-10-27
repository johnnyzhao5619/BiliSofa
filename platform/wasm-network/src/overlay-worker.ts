import { configureServiceNative } from '../../../packages/contracts/src/service-configuration.ts';
import { DomainError, record } from '../../../packages/contracts/src/index.ts';
import { parseOverlayRequest, parseOverlayResult, type OverlayRequest, type OverlayValue } from '../../../packages/contracts/src/overlay-read.ts';
import { OverlayNativeApi } from './overlay-native-api.ts';
import { vodNativeFailure, type VodApiNative } from './vod-native-api.ts';
import { parsePrivateOverlayBinding, type PrivateOverlayBinding } from '../../../packages/contracts/src/overlay-binding.ts';
interface Native extends VodApiNative { noInitialRun: boolean; noExitRuntime: boolean; arguments: string[]; onRuntimeInitialized(): void; print(line: unknown): void; printErr(): void; onAbort(): void; locateFile(name: string): string; }
const port = globalThis as unknown as { onmessage: ((event: MessageEvent) => void) | null; postMessage(value: unknown): void; importScripts(path: string): void; Module?: Native; };
let active: OverlayRequest | undefined, api: OverlayNativeApi | undefined, complete = false;
const controller = new AbortController();
function binding(port: MessagePort, target: OverlayRequest['target']): Promise<PrivateOverlayBinding> {
  return new Promise((resolve, reject) => {
    const done = (value?: PrivateOverlayBinding, error?: unknown) => { clearTimeout(timer); controller.signal.removeEventListener('abort', abort); port.close(); value ? resolve(value) : reject(error); };
    const abort = () => done(undefined, new DomainError('cancelled'));
    const timer = setTimeout(() => done(undefined, new DomainError('timeout')), 6000);
    controller.signal.addEventListener('abort', abort, { once: true });
    port.onmessageerror = () => done(undefined, new DomainError('invalid'));
    port.onmessage = event => { try { const v = record(event.data); if (v.kind === 'error') throw new DomainError('cancelled'); done(parsePrivateOverlayBinding(v, target)); } catch (error) { done(undefined, error); } }; port.start();
  });
}
function fault(): void { if (complete) return; complete = true; setTimeout(() => { throw new Error('overlay.native_close_unknown'); }, 0); }
async function finish(value?: OverlayValue, error?: unknown): Promise<void> {
  if (complete || !active) return;
  try { await api?.close(); } catch { fault(); return; }
  if (complete) return;
  const base = { version: 1, operation: active.operation, scope: active.scope, closed: true };
  const result = controller.signal.aborted ? { ...base, kind: 'error', code: 'cancelled' } : value ? { ...base, kind: 'ok', value } : { ...base, kind: 'error', code: vodNativeFailure(error) };
  try { port.postMessage(parseOverlayResult(result)); complete = true; active = undefined; } catch { fault(); }
}
port.onmessage = event => {
  if (complete) return;
  if (active) {
    try { const v = record(event.data); if (Object.keys(v).length === 4 && v.version === 1 && v.operation === active.operation && v.control === 'stop' && JSON.stringify(v.scope) === JSON.stringify(active.scope)) { controller.abort(); if (!api) void finish(undefined, new DomainError('cancelled')); } } catch { /* Unknown controls cannot affect the owned read. */ }
    return;
  }
  try { active = parseOverlayRequest(event.data); } catch { return; }
  if (event.ports.length !== 1) { void finish(undefined, new DomainError('invalid')); return; }
  const bound = binding(event.ports[0]!, active.target); void bound.catch(() => {});
  const native = { noInitialRun: true, noExitRuntime: true, arguments: [],
    onRuntimeInitialized() {
      if (complete || !active) return;
      api = new OverlayNativeApi(port.Module!);
      const request = active;
      void bound.then(value => api!.read(request.target, request.command, controller.signal, value, request.account)).then(value => finish(value), error => finish(undefined, error));
    },
    print(line: unknown) { api?.receive(line); }, printErr() {}, onAbort: fault, locateFile: (name: string) => 'overlay-read/' + name,
  } as unknown as Native;
  port.Module = configureServiceNative(native);
  try { port.importScripts('overlay-read/probe.js'); } catch { void finish(undefined, new DomainError('unsupported')); }
};
