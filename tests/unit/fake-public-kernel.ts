import { parseKernelCommand, type KernelRequest } from '../../packages/contracts/src/public-kernel.ts';
import { publicKernel } from '../../apps/tv/src/platform/public-kernel.ts';
import { clearPublicLists } from '../../apps/tv/src/platform/public-lanes.ts';
/** Answers one kernel request with a lane result shape, or `undefined` to hold it for `reply()`. */
export type Responder = (request: KernelRequest, keys: boolean) => Record<string, unknown> | undefined;
/** A stand-in for public-kernel-worker.js speaking the ADR-108 envelope; it checks every command the client sends. */
export class FakeKernelWorker {
  static all: FakeKernelWorker[] = [];
  static responder: Responder = () => undefined;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  terminated = false; stops = 0; closes = 0;
  requests: { requestId: string; request: KernelRequest; keys: boolean }[] = [];
  held: { requestId: string; request: KernelRequest } | undefined;
  constructor(readonly file: string) { FakeKernelWorker.all.push(this); }
  postMessage(value: { type?: string }): void {
    if (value?.type === 'boot') { queueMicrotask(() => this.emit({ version: 1, type: 'ready' })); return; }
    const command = parseKernelCommand(value);
    if (command.type === 'close') { this.closes++; queueMicrotask(() => this.emit({ version: 1, type: 'closed', confirmed: true })); return; }
    if (command.type === 'stop') {
      this.stops++;
      if (this.held?.requestId === command.requestId) { this.held = undefined; queueMicrotask(() => this.emit({ version: 1, type: 'stopped', requestId: command.requestId })); }
      return;
    }
    this.requests.push({ requestId: command.requestId, request: command.request, keys: !!command.keys });
    const result = FakeKernelWorker.responder(command.request, !!command.keys);
    if (result) queueMicrotask(() => this.emit({ version: 1, type: 'result', requestId: command.requestId, result }));
    else this.held = { requestId: command.requestId, request: command.request };
  }
  /** Answers the held request; `keys` imitates salts fetched by the kernel's own nav. */
  reply(result: Record<string, unknown>, keys?: { img: string; sub: string }): void {
    const held = this.held!; this.held = undefined;
    this.emit({ version: 1, type: 'result', requestId: held.requestId, result, ...(keys ? { keys } : {}) });
  }
  emit(data: unknown): void { if (!this.terminated) this.onmessage?.({ data }); }
  terminate(): void { this.terminated = true; }
}
export const flush = () => new Promise<void>(yes => setImmediate(yes));
/** Installs the fake for one scenario; the shared kernel and the public list caches are reset afterwards. */
export async function withFakeKernel(responder: Responder, run: (workers: FakeKernelWorker[]) => Promise<void>): Promise<void> {
  const original = globalThis.Worker; FakeKernelWorker.all = []; FakeKernelWorker.responder = responder;
  globalThis.Worker = FakeKernelWorker as unknown as typeof Worker;
  try { await run(FakeKernelWorker.all); }
  finally { await publicKernel().close(); clearPublicLists(); globalThis.Worker = original; }
}
