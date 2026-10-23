import type { Scope } from '../../../../packages/contracts/src/index.ts';
import type { AvplayBackend } from './avplay.ts';
import { GuestBridgeWorker } from './guest-video-worker.ts';
import { createGuestProbePlayer } from './samsung.ts';
export class RateProbePlayback {
  private readonly worker = new GuestBridgeWorker();
  private backend: AvplayBackend | undefined;
  private epoch = 0;
  private issue = 'rate.source_unavailable';
  async start(scope: Scope, signal: AbortSignal, onTime: (ms: number) => void, onError: (code: string) => void): Promise<void> {
    const owner = ++this.epoch;
    let ready = false, resolve!: (value: string) => void, reject!: (error: unknown) => void;
    const source = new Promise<string>((yes, no) => { resolve = yes; reject = no; });
    void this.worker.run({ version: 1, operation: 'guest-video-play', scope, bvid: 'BV14GHy6bE9n' }, signal, frame => {
      if (owner !== this.epoch || signal.aborted || ready || frame.code !== 'ugc.bridge_ready' || !frame.url || frame.summary?.durationSec !== 95) return;
      ready = true; resolve(frame.url);
    }).then(result => {
      reject(new Error('source_closed'));
      if (owner !== this.epoch || signal.aborted) return;
      this.issue = result.code; if (ready) onError(result.code);
    }, () => {
      reject(new Error('cancelled'));
      if (owner === this.epoch && !signal.aborted) { this.issue = 'rate.native_cleanup_unconfirmed'; if (ready) onError(this.issue); }
    });
    const url = await source;
    if (signal.aborted || owner !== this.epoch) throw new Error('cancelled');
    this.issue = 'rate.avplay_unavailable';
    const backend = createGuestProbePlayer(url); this.backend = backend;
    if (!backend) throw new Error('unsupported');
    await backend.prepare({ url, kind: 'vod' }, onTime, () => onError('rate.unexpected_end'), () => onError(backend.failureSummary()));
    if (signal.aborted || owner !== this.epoch) { backend.close(); throw new Error('cancelled'); }
    backend.screensaver(false); backend.play();
  }
  rate(value: 1 | 2): 'accepted' | 'unsupported' | 'busy' | 'failed' { return this.backend?.setProbeRate(value) ?? 'busy'; }
  failure(): string { return this.backend?.failureSummary() ?? this.issue; }
  summary(): string { return this.backend?.streamSummary() ?? 'avplay.stream_unavailable'; }
  async stop(): Promise<void> {
    this.epoch++; const backend = this.backend; this.backend = undefined;
    let closed = true;
    try { backend?.close(); closed = !backend || backend.closureConfirmed(); }
    finally { await this.worker.dispose(); }
    if (!closed) throw new Error('rate.sdk_cleanup_unconfirmed');
  }
}
