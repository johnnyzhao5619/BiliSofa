import { DomainError } from '../../../../packages/contracts/src/index.ts';
import { SessionManager } from '../../../../packages/bili-client/src/session.ts';
import type { MediaTransport } from '../../../../packages/media/src/session.ts';
import { GuestBridgeWorker } from './guest-video-worker.ts';
import { guestMediaFailure, type MediaFailure } from '../../../../packages/contracts/src/media-failure.ts';
/** Anonymous, single-source transport. Never receives an account/session jar.
 * The reused W01 bridge retains its internal 15-minute media lease for this
 * integration build; longer product playback is still a separate requirement. */
export class GuestPlayback implements MediaTransport {
  private readonly session = new SessionManager();
  private readonly worker = new GuestBridgeWorker();
  private started = false;
  private closing: Promise<void> | undefined;
  private fault: MediaFailure | undefined;
  private retrying=false;
  recovery():'source-range-retry'|undefined{return this.retrying?'source-range-retry':undefined;}
  failure(): MediaFailure | undefined {return this.fault?{...this.fault}:undefined;}
  constructor(private readonly bvid: string) {
    if (!/^BV[A-Za-z0-9]{10}$/.test(bvid)) throw new DomainError('invalid');
  }
  async run(signal: AbortSignal, ready: Parameters<MediaTransport['run']>[1]): Promise<void> {
    if (this.started || this.closing || signal.aborted) throw new DomainError('cancelled');
    this.started = true;
    const task = this.session.begin('guest-playback'), abort = () => { void this.close().catch(() => {}); };
    signal.addEventListener('abort', abort, { once: true });
    try {
      const result=await this.worker.run({ version: 1, scope: task.scope, operation: 'guest-video-play', bvid: this.bvid }, task.signal, event => {
        if (!this.session.accepts(task.scope) || signal.aborted) return;
        if(event.code==='ugc.range_retry_once')this.retrying=true;
        if (event.code === 'ugc.bridge_ready' && event.url) {this.retrying=false;ready({ url: event.url, kind: 'vod' });}
      });
      // This transport never certifies end-of-stream: only AVPlay can do that.
      if (!signal.aborted && this.session.accepts(task.scope)) {this.fault=guestMediaFailure(result.code);throw new DomainError(this.fault.reason);}
    } finally { signal.removeEventListener('abort', abort); task.finish(); }
  }
  close(): Promise<void> {
    if (this.closing) return this.closing;
    // Publish before session invalidation synchronously reenters worker abort.
    this.closing = Promise.resolve().then(() => this.worker.dispose());
    this.session.dispose(); return this.closing;
  }
}
