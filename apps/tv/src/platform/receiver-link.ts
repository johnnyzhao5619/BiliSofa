import { DomainError } from '../../../../packages/contracts/src/index.ts';
import { isPrivateProbeAddress } from '../../../../packages/contracts/src/cast-probe.ts';
import type { ReceiverLink } from '../../../../packages/contracts/src/receiver-link.ts';
import { SessionManager } from '../../../../packages/bili-client/src/session.ts';
import { CastProbeWorker, castProbeIdentity } from './cast-probe-worker.ts';
import { diagnosticAddress } from './samsung.ts';
/** No account authority or persisted peer. Legacy probes retain their quotas;
 * the product worker bounds concurrent resources and each request instead. */
export class WorkerReceiverLink implements ReceiverLink {
  private readonly identity = receiverIdentity();
  readonly token = this.identity.token;
  private readonly worker:CastProbeWorker;
  constructor(product=false){this.worker=new CastProbeWorker(product);}
  private readonly session = new SessionManager();
  private started = false;
  private closing: Promise<void> | undefined;
  async run(signal: AbortSignal, observed: Parameters<ReceiverLink['run']>[1]): Promise<void> {
    if (this.started || this.closing || signal.aborted) throw new DomainError('cancelled');
    this.started = true; const task = this.session.begin('official-receiver');
    const abort = () => { void this.close().catch(() => {}); }; signal.addEventListener('abort', abort, { once: true });
    try {
      const address = await diagnosticAddress();
      if (signal.aborted || !this.session.accepts(task.scope)) throw new DomainError('cancelled');
      if (!isPrivateProbeAddress(address)) throw new DomainError('unsupported');
      const result = await this.worker.run({ version: 1, operation: 'cast-discovery', scope: task.scope, address, ...this.identity, receiverApproval: 'session' }, task.signal,
        event => { if (!signal.aborted && this.session.accepts(task.scope)) observed(event); });
      if (result.code === 'cast.native_unavailable') throw new DomainError('unsupported');
      if (result.code.startsWith('cast.failed_')) throw new DomainError('network');
    } finally { signal.removeEventListener('abort', abort); task.finish(); }
  }
  approve(): boolean { return !this.closing && this.worker.approveCandidate(true); }
  decoderClosed(...args: Parameters<ReceiverLink['decoderClosed']>): boolean { return !this.closing && this.worker.decoderClosed(...args); }
  snapshot(value: Parameters<ReceiverLink['snapshot']>[0]): boolean { return !this.closing && this.worker.snapshot(value); }
  acknowledge(...args: Parameters<ReceiverLink['acknowledge']>): boolean { return !this.closing && this.worker.acknowledge(...args); }
  seekResult(ok: boolean): boolean { return !this.closing && this.worker.seekResult(ok); }
  close(): Promise<void> {
    if (this.closing) return this.closing;
    this.closing = Promise.resolve().then(() => this.worker.dispose()); this.session.dispose(); return this.closing;
  }
}

function receiverIdentity(): { uuid: string; token: string } {
  const identity = castProbeIdentity();
  // Nonsecret app-level discovery identity only; never persists sender/URL/account.
  try {
    const key = 'bilisofa.receiver.uuid.v1', saved = localStorage.getItem(key);
    if (saved && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(saved)) identity.uuid = saved;
    else localStorage.setItem(key, identity.uuid);
  } catch { /* Ephemeral discovery when nonsecret storage is unavailable. */ }
  return identity;
}
