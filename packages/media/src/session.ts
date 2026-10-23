import { DomainError, type MediaSource, type PlayerBackend, type PlayerState, type ErrorCode } from '../../contracts/src/index.ts';
import { PlayerCoordinator } from './player.ts';
import { parseMediaFailure, type MediaFailure, type MediaFailurePhase } from '../../contracts/src/media-failure.ts';
export interface OwnedPlayerBackend extends PlayerBackend { closureConfirmed(): boolean; durationMs?(): number; bufferingActive?(): boolean; failureReason?(): ErrorCode | undefined; }
/** Terminal completion and close both require the transport's actual native ACK. */
export interface MediaTransport {
  run(signal: AbortSignal, ready: (source: MediaSource) => void): Promise<void>;
  close(): Promise<void>;
  failure?(): MediaFailure | undefined;
  recovery?(): 'source-range-retry' | undefined;
}
export interface MediaClosure { closed: boolean; decoderClosed: boolean; transportClosed: boolean; }
export interface MediaSnapshot { state: PlayerState | 'loading' | 'closing' | 'closed'; timeMs: number; durationMs: number; seeking: boolean; buffering?: boolean; acceptedRate?: 1 | 2; failure?: MediaFailure; recovery?: 'source-range-retry'; }
export interface MediaObservation { reason: 'tick' | 'close' | 'ended' | 'error'; timeMs: number; durationMs: number; }
export type MediaOutcome = 'ended' | 'failed';
/** One-use media owner. A new source must wait for both closure acknowledgements.
 * Timelines come only from backend events, including after a successful seek. */
export class MediaSession {
  private readonly controller = new AbortController();
  private backend: OwnedPlayerBackend | undefined;
  private player: PlayerCoordinator | undefined;
  private started = false;
  private closing: Promise<MediaClosure> | undefined;
  private closed: MediaClosure | undefined;
  private ready = false;
  private duration = 0;
  private position = 0;
  private initialMs = 0;
  private initiallyPaused = false;
  private timer: ReturnType<typeof setInterval> | undefined;
  private finishing = false;
  private failure: MediaFailure | undefined;
  private phase: MediaFailurePhase = 'source';
  constructor(private readonly transport: MediaTransport,
    private readonly createBackend: (source: MediaSource) => OwnedPlayerBackend | undefined,
    private readonly finished: (outcome: MediaOutcome, closure: MediaClosure, failure?: MediaFailure) => void,
    private readonly closeBudgetMs = 13000, private readonly observed?: (value: MediaObservation) => void) {
    if (!Number.isInteger(closeBudgetMs) || closeBudgetMs < 10 || closeBudgetMs > 60000) throw new DomainError('invalid');
  }
  snapshot(): MediaSnapshot {
    if (!this.duration && this.player && !this.closing && !this.player.seeking && ['ready','playing','paused'].includes(this.player.state)) {
      try { const n = this.backend?.durationMs?.(); if (Number.isSafeInteger(n) && n! > 0 && n! <= 86400000) this.duration = n!; } catch { /* Cached duration remains honest while unavailable. */ }
    }
    let recovery: 'source-range-retry'|undefined;
    if(!this.ready&&!this.closing){try{if(this.transport.recovery?.()==='source-range-retry')recovery='source-range-retry';}catch{/* Advisory state cannot prevent cleanup. */}}
    let buffering = false; try { buffering = this.backend?.bufferingActive?.() === true; } catch { buffering = true; }
    return { state: this.closed ? 'closed' : this.closing ? 'closing' : this.player?.state ?? 'loading', timeMs: this.player?.timeMs ?? 0, durationMs: this.duration, seeking: this.player?.seeking ?? false, ...(buffering ? { buffering: true } : {}), ...(this.player?.acceptedRate !== undefined ? { acceptedRate: this.player.acceptedRate } : {}),...(this.failure?{failure:{...this.failure}}:{}),...(recovery?{recovery}:{}) };
  }
  start(initialMs = 0, paused = false): void {
    if (!Number.isSafeInteger(initialMs) || initialMs < 0 || initialMs > 86400000 || typeof paused !== 'boolean') throw new DomainError('invalid');
    if (this.started || this.closing) throw new DomainError('invalid');
    this.started = true; this.initialMs = initialMs; this.initiallyPaused = paused;
    // Invocation is deferred so an owner can register cleanup before transport entry.
    void Promise.resolve().then(() => {
      if (this.closing) return;
      return this.transport.run(this.controller.signal, source => { void this.open(source); });
    }).then(() => { if (!this.closing) {this.capture('source',new DomainError('network'));void this.finish('failed');} }, error => { if (!this.closing) {this.capture('source',error);void this.finish('failed');} });
  }
  private async open(source: MediaSource): Promise<void> {
    if (this.closing) return;
    // A second readiness frame is a protocol failure, never an implicit replacement.
    if (this.ready) { this.capture('protocol',new DomainError('invalid'));void this.finish('failed'); return; }
    this.ready = true;
    this.phase = 'prepare';
    try {
      const backend = this.createBackend(source);
      if (!backend) throw new DomainError('unsupported');
      this.backend = backend;
      // Never open over another session's still-live global decoder.
      if (!backend.closureConfirmed()) throw new DomainError('unknown');
      const player = new PlayerCoordinator(backend, reason => {if(reason==='error')this.capture(this.phase,new DomainError('network'));this.note(reason);}); this.player = player;
      await player.open(source);
      if (this.closing) return;
      this.snapshot();
      if (this.initialMs) {
        this.phase = 'seek';
        if (this.duration && this.initialMs >= this.duration) throw new DomainError('invalid');
        await player.seek(this.initialMs); if (this.closing) return;
      }
      this.phase = 'playback';
      if (this.initiallyPaused) player.hold(); else player.play();
      this.timer = setInterval(() => {
        if (this.closing) return;
        this.note('tick');
        if (player.state === 'idle') void this.finish('ended');
        else if (player.state === 'error') {this.capture(this.phase,new DomainError('network'));void this.finish('failed');}
      }, 100);
    } catch (error) { if (!this.closing) {this.capture(this.phase,error);void this.finish('failed');} }
  }
  toggle(): void {
    if (this.closing || !this.player || this.player.seeking) return;
    try { if (this.player.state === 'playing') this.player.pause(); else if (this.player.state === 'paused') this.player.play(); }
    catch (error) { this.capture('control',error);void this.finish('failed'); }
  }
  async seek(timeMs: number): Promise<void> {
    if (this.closing || !this.player || this.player.seeking) throw new DomainError('invalid');
    this.phase='seek';
    try { await this.player.seek(timeMs); }
    catch (error) { if (!this.closing) {this.capture('seek',error);void this.finish('failed');} throw error; }
    finally {if(!this.closing)this.phase='playback';}
  }
  setRate(rate: 1 | 2): 'accepted' | 'unsupported' | 'busy' | 'failed' {
    if (this.closing || !this.player) return 'busy';
    try { return this.player.setRate(rate); }
    catch (error) {
      if (error instanceof DomainError && error.code === 'invalid') throw error;
      // A rejected speed command must not manufacture a successful new rate.
      return 'failed';
    }
  }
  private capture(phase: MediaFailurePhase, error: unknown): void {
    if(this.failure || this.closing) return;
    if(phase==='source'){
      try{const fault=this.transport.failure?.();if(fault){const parsed=parseMediaFailure(fault);if(parsed.phase==='source'){this.failure=parsed;return;}}}catch{/* A diagnostic getter cannot prevent cleanup. */}
    }
    let reason=error instanceof DomainError?error.code:'unknown';
    if(phase!=='source'){try{reason=this.backend?.failureReason?.()??reason;}catch{/* Diagnostic failure cannot prevent cleanup. */}}
    try{this.failure=parseMediaFailure({phase,reason});}catch{this.failure={phase,reason:'unknown'};}
  }
  private note(reason: MediaObservation['reason']): void {
    if (!this.player || this.closed) return;
    if (reason === 'tick') this.snapshot();
    if (this.player.timeMs > 0 && ['playing','paused','ready'].includes(this.player.state)) this.position = this.player.timeMs;
    if (reason === 'tick' && (!this.position || !this.duration)) return;
    try { this.observed?.({ reason, timeMs: this.position, durationMs: this.duration }); } catch { /* Local storage cannot prevent media cleanup. */ }
  }
  private async finish(outcome: MediaOutcome): Promise<void> {
    if (this.finishing || this.closing) return;
    this.finishing = true;
    const closure = await this.close(); this.finished(outcome, closure,this.failure?{...this.failure}:undefined);
  }
  close(): Promise<MediaClosure> {
    if (this.closing) return this.closing;
    let resolve!: (value: MediaClosure) => void;
    this.closing = new Promise(yes => { resolve = yes; });
    clearInterval(this.timer); this.timer = undefined; this.note('close');
    let decoderClosed = !this.backend;
    try { this.player?.close(); decoderClosed = this.backend?.closureConfirmed() ?? true; } catch { decoderClosed = false; }
    // Decoder is stopped before abort can send a native stop message. Neither a
    // Worker termination nor a late ACK can improve an already unknown result.
    this.controller.abort();
    void (async () => {
      let timer: ReturnType<typeof setTimeout> | undefined, transportClosed = false;
      try {
        await Promise.race([Promise.resolve().then(() => this.transport.close()), new Promise<never>((_yes, no) => { timer = setTimeout(() => no(new DomainError('timeout')), this.closeBudgetMs); })]);
        transportClosed = true;
      } catch { /* Keep the two closure facts independent. */ }
      finally { clearTimeout(timer); }
      const result = Object.freeze({ closed: decoderClosed && transportClosed, decoderClosed, transportClosed });
      this.closed = result; resolve(result);
    })();
    return this.closing;
  }
}
