import { parseKernelCommand, type KernelRequest } from '../../packages/contracts/src/public-kernel.ts';
import { parseAccountKernelCommand, type AccountKernelRequest } from '../../packages/contracts/src/account-kernel.ts';
import { publicKernel, ResidentKernel } from '../../apps/tv/src/platform/public-kernel.ts';
import { clearPublicLists } from '../../apps/tv/src/platform/public-lanes.ts';
/** Answers one kernel request with a lane result shape, or `undefined` to hold it for `reply()`. */
export type Responder = (request: KernelRequest, keys: boolean) => Record<string, unknown> | undefined;
export type AccountResponder = (request: AccountKernelRequest) => Record<string, unknown> | undefined;
type Command = { type: 'close' } | { type: 'stop'; requestId: string } | { type: 'request'; requestId: string; request: KernelRequest | AccountKernelRequest; keys?: unknown };
/** A stand-in for a kernel Worker speaking the ADR-108 envelope; it checks every command the client sends with that kernel's parser. */
export class FakeKernelWorker {
  static all: FakeKernelWorker[] = [];
  static responder: Responder = () => undefined;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  terminated = false; stops = 0; closes = 0;
  requests: { requestId: string; request: KernelRequest; keys: boolean }[] = [];
  held: { requestId: string; request: KernelRequest } | undefined;
  constructor(readonly file: string, private readonly parse: (value: unknown) => Command = parseKernelCommand, private readonly own?: AccountResponder) { FakeKernelWorker.all.push(this); }
  postMessage(value: { type?: string }): void {
    if (value?.type === 'boot') { queueMicrotask(() => this.emit({ version: 1, type: 'ready' })); return; }
    const command = this.parse(value);
    if (command.type === 'close') { this.closes++; queueMicrotask(() => this.emit({ version: 1, type: 'closed', confirmed: true })); return; }
    if (command.type === 'stop') {
      this.stops++;
      if (this.held?.requestId === command.requestId) { this.held = undefined; queueMicrotask(() => this.emit({ version: 1, type: 'stopped', requestId: command.requestId })); }
      return;
    }
    const request = command.request as KernelRequest;
    this.requests.push({ requestId: command.requestId, request, keys: !!command.keys });
    const result = this.own ? this.own(command.request as AccountKernelRequest) : FakeKernelWorker.responder(request, !!command.keys);
    if (result) queueMicrotask(() => this.emit({ version: 1, type: 'result', requestId: command.requestId, result }));
    else this.held = { requestId: command.requestId, request };
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
/** A resident account kernel on fakes (ADR-108 P0b), for accountRuntime(account, kernel). */
export function accountKernel(responder: AccountResponder): { kernel: ResidentKernel<AccountKernelRequest>; workers: FakeKernelWorker[]; requests: () => AccountKernelRequest[] } {
  const workers: FakeKernelWorker[] = [];
  const kernel = new ResidentKernel<AccountKernelRequest>({ signing: false, create: () => { const w = new FakeKernelWorker('account-read-kernel-worker.js', parseAccountKernelCommand, responder); workers.push(w); return w; } });
  return { kernel, workers, requests: () => workers.flatMap(w => w.requests.map(r => r.request as unknown as AccountKernelRequest)) };
}
