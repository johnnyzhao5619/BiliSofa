import type { Scope } from '../../../../packages/contracts/src/index.ts';
import { parseLiveProbeRequest, parseLiveProbeResult, type LiveProbeRequest, type LiveProbeResult } from '../../../../packages/contracts/src/live-probe.ts';
import type { AvplayBackend } from './avplay.ts';
import { ScopedGuestWorker } from './scoped-guest-worker.ts';
import { createLiveRelayProbePlayer } from './samsung.ts';
export class LiveProbePlayback {
  private readonly worker = new ScopedGuestWorker<LiveProbeRequest, LiveProbeResult>('live-worker.js', 'live-probe', parseLiveProbeRequest, parseLiveProbeResult, 140000, 5000, () => true, true, 4, true);
  private backend: AvplayBackend | undefined;
  private epoch = 0;
  private issue = 'live.source_or_platform_unavailable';
  private transportFacts: string[] = [];
  async start(scope: Scope, signal: AbortSignal, onTime: (ms: number) => void, onError: (code: string) => void, onEvidence: (code: string) => void = () => {}): Promise<void> {
    const owner = ++this.epoch;
    this.transportFacts = [];
    let ready = false, resolve!: (value: string) => void, reject!: (error: unknown) => void;
    const source = new Promise<string>((yes, no) => { resolve = yes; reject = no; });
    void this.worker.run({ version: 1, operation: 'live-probe', scope }, signal, frame => {
      if (frame.code.startsWith('live.relay_summary_') || frame.code.startsWith('live.http_v1_')) { this.transportFacts.push(frame.code); if (this.transportFacts.length > 2) this.transportFacts.shift(); return; }
      if (owner !== this.epoch || signal.aborted || ready || frame.code !== 'live.relay_ready' || !frame.url) return;
      ready = true; resolve(frame.url);
    }).then(result => {
      if (owner !== this.epoch || signal.aborted) { reject(new Error('cancelled')); return; }
      this.issue = result.code; reject(new Error('source')); if (ready) onError(result.code);
    }, () => {
      reject(new Error('cancelled'));
      if (owner === this.epoch && !signal.aborted) { this.issue = 'live.native_cleanup_unconfirmed'; if (ready) onError(this.issue); }
    });
    const url = await source;
    if (signal.aborted || owner !== this.epoch) throw new Error('cancelled');
    // An opaque no-cors completion is not an HTTP/decoder proof. Native counts
    // independently identify whether the same local endpoint actually served it.
    const local = new AbortController(), cancelLocal = () => local.abort(), timer = setTimeout(cancelLocal, 12000);
    signal.addEventListener('abort', cancelLocal, { once: true });
    try { const response = await fetch(url, { mode: 'no-cors', signal: local.signal, cache: 'no-store' }); await response.body?.cancel(); if (owner === this.epoch) onEvidence('live.local_fetch_completed'); }
    catch { if (owner === this.epoch && !signal.aborted) onEvidence('live.local_fetch_unavailable'); }
    finally { clearTimeout(timer); signal.removeEventListener('abort', cancelLocal); }
    if (signal.aborted || owner !== this.epoch) throw new Error('cancelled');
    this.issue = 'live.avplay_unavailable';
    const backend = createLiveRelayProbePlayer(url); this.backend = backend;
    if (!backend) throw new Error('unsupported');
    await backend.prepare({ url, kind: 'live' }, onTime, () => onError('live.unexpected_end'), () => onError(backend.failureSummary()));
    if (signal.aborted || owner !== this.epoch) { backend.close(); throw new Error('cancelled'); }
    backend.screensaver(false); backend.play();
  }
  summary(): string { return this.backend?.streamSummary() ?? 'avplay.stream_unavailable'; }
  transportSummary(): readonly string[] { return this.transportFacts; }
  failure(): string { return this.backend?.failureSummary() ?? this.issue; }
  async stop(): Promise<void> {
    this.epoch++; const backend = this.backend; this.backend = undefined;
    let closed = true;
    try { backend?.close(); closed = !backend || backend.closureConfirmed(); }
    finally { await this.worker.dispose(); }
    if (!closed) throw new Error('live_sdk_cleanup_unconfirmed');
  }
}
