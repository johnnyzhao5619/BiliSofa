import { DomainError, type ErrorCode, type MediaSource } from '../../../../packages/contracts/src/index.ts';
import { isPlaybackRate, type PlaybackRate } from '../../../../packages/contracts/src/playback-rate.ts';
import type { OwnedPlayerBackend } from '../../../../packages/media/src/session.ts';

/** A composition root must arbitrate this claim with ALL decoder backends.
 * The candidate is intentionally not wired into the installed AVPlay factory. */
export interface ElementVideoHost {
  claimDecoder(): (() => void) | undefined;
  createVideo(): HTMLVideoElement;
  attach(video: HTMLVideoElement): void;
  screensaver(active: boolean): void;
}
type State = 'idle' | 'preparing' | 'ready' | 'playing' | 'paused' | 'failed' | 'closing';
type RateResult = 'accepted' | 'unsupported' | 'busy' | 'failed';
/** Candidate for TV-contained DASH only. A canPlayType result never selects it.
 * No media URLs, element errors or credentials leave this platform adapter. */
export class ElementVideoBackend implements OwnedPlayerBackend {
  private video: HTMLVideoElement | undefined;
  private release: (() => void) | undefined;
  private state: State = 'idle';
  private epoch = 0;
  private playOperation = 0;
  private listeners: (() => void)[] = [];
  private pending = new Set<(error: DomainError) => void>();
  private seekPending = false;
  private buffering = false;
  private failure: ErrorCode | undefined;
  private duration = 0;
  private onError: (() => void) | undefined;
  private emptied: (() => void) | undefined;
  private resetFailed = false;
  private resetInProgress = false;
  private resetEmptied = false;
  constructor(private readonly host: ElementVideoHost, private readonly operationMs = 30000) {
    if (!Number.isInteger(operationMs) || operationMs < 10 || operationMs > 60000) throw new DomainError('invalid');
  }
  closureConfirmed(): boolean {
    this.confirmReset();
    return this.state === 'idle' && !this.video && !this.release;
  }
  durationMs(): number { return this.duration; }
  bufferingActive(): boolean { return this.buffering; }
  failureReason(): ErrorCode | undefined { return this.failure; }
  async prepare(source: MediaSource, onTime: (ms: number) => void, onEnd: () => void, onError: () => void): Promise<void> {
    if (source.kind !== 'vod' || !/^http:\/\/127\.0\.0\.1:40324\/[a-f0-9]{32}\/manifest\.mpd$/.test(source.url)) throw new DomainError('permission');
    if (!this.closureConfirmed()) throw new DomainError('unknown');
    const release = this.host.claimDecoder();
    if (!release) throw new DomainError('unknown');
    this.release = release; this.state = 'preparing'; this.failure = undefined;
    this.onError = onError; const epoch = ++this.epoch;
    try {
      const video = this.host.createVideo(); this.video = video;
      // A factory returning a previously active element is not safe to reuse.
      if (video.currentSrc || video.getAttribute('src') || video.readyState !== 0 || video.networkState !== 0) throw new DomainError('unknown');
      video.controls = false; video.autoplay = false; video.loop = false; video.preload = 'auto';
      video.tabIndex = -1; video.setAttribute('aria-hidden', 'true'); video.style.pointerEvents = 'none';
      const alive = () => epoch === this.epoch && this.video === video && this.state !== 'closing' && this.state !== 'failed';
      const listen = (type: string, run: () => void) => {
        const listener = () => { if (alive()) run(); };
        video.addEventListener(type, listener); this.listeners.push(() => video.removeEventListener(type, listener));
      };
      listen('timeupdate', () => {
        const time = video.currentTime * 1000;
        if (Number.isFinite(time) && time >= 0 && time <= 86400000) onTime(Math.round(time));
      });
      listen('ended', () => { this.buffering = false; onEnd(); });
      listen('error', () => this.fail(video.error?.code === 4 ? 'unsupported' : 'network'));
      listen('waiting', () => { this.buffering = true; });
      listen('playing', () => { this.buffering = false; });
      listen('canplay', () => { this.buffering = false; });
      const prepared = this.wait(video, epoch, 'loadedmetadata', () => {
        if (video.currentSrc !== source.url || !Number.isFinite(video.duration) || video.duration <= 0 || video.duration > 86400 || video.readyState < 1) throw new DomainError('invalid');
        this.duration = Math.round(video.duration * 1000); this.state = 'ready'; return true;
      });
      // Attach before loading so the media has a visible owner. Layout belongs
      // to the host; the element never owns remote input or a second focus tree.
      this.host.attach(video); video.src = source.url; video.load();
      await prepared;
    } catch (error) {
      const code = error instanceof DomainError ? error.code : 'network';
      this.failure = code;
      if (epoch === this.epoch) this.close();
      throw new DomainError(code);
    }
  }
  play(): void {
    const video = this.video;
    if (!video || !['ready', 'paused'].includes(this.state) || this.seekPending) throw new DomainError('invalid');
    const epoch = this.epoch, operation = ++this.playOperation;
    this.state = 'playing';
    try {
      const promise = video.play();
      void Promise.resolve(promise).catch(() => {
        if (epoch === this.epoch && operation === this.playOperation && this.state === 'playing') this.fail('network');
      });
    } catch { this.fail('network'); throw new DomainError('network'); }
  }
  pause(): void {
    if (!this.video || this.state !== 'playing') return;
    ++this.playOperation; this.video.pause(); this.state = 'paused'; this.buffering = false;
  }
  async seek(timeMs: number): Promise<void> {
    const video = this.video;
    if (!Number.isSafeInteger(timeMs) || timeMs < 0 || timeMs >= this.duration) throw new DomainError('invalid');
    if (!video || !['ready', 'playing', 'paused'].includes(this.state) || this.seekPending) throw new DomainError('invalid');
    this.seekPending = true;
    const epoch = this.epoch;
    try {
      const completed = this.wait(video, epoch, 'seeked', () => {
        if (video.seeking) return false;
        const actual = video.currentTime * 1000;
        if (!Number.isFinite(actual) || Math.abs(actual - timeMs) > 750) throw new DomainError('network');
        return true;
      });
      try { video.currentTime = timeMs / 1000; }
      catch { this.rejectPending(new DomainError('network')); }
      await completed;
    } finally { if (epoch === this.epoch) this.seekPending = false; }
  }
  setRate(rate: PlaybackRate): RateResult {
    if (!isPlaybackRate(rate)) throw new DomainError('invalid');
    const video = this.video;
    if (!video || this.state !== 'playing' || this.seekPending || this.buffering) return 'busy';
    const previous = video.playbackRate;
    try { video.playbackRate = rate; if (video.playbackRate === rate) return 'accepted'; } catch { /* Restore below, including a setter that changed then threw. */ }
    try {
      video.playbackRate = previous;
      if (video.playbackRate !== previous) throw new Error('restore_failed');
    } catch { this.fail('unknown'); return 'failed'; }
    return 'unsupported';
  }
  screensaver(active: boolean): void { this.host.screensaver(active); }
  close(): void {
    if (this.state === 'idle' && !this.release) return;
    if (this.state === 'closing') { this.confirmReset(); return; }
    ++this.epoch; ++this.playOperation; this.state = 'closing'; this.buffering = false; this.seekPending = false;
    this.onError = undefined; this.duration = 0;
    this.rejectPending(new DomainError('cancelled'));
    for (const off of this.listeners.splice(0)) off();
    const video = this.video;
    if (!video) { this.finishReset(); return; }
    this.resetEmptied = false;
    this.emptied = () => { this.resetEmptied = true; this.confirmReset(); }; video.addEventListener('emptied', this.emptied);
    this.resetInProgress = true;
    try { video.pause(); video.removeAttribute('src'); video.load(); }
    catch { this.resetFailed = true; this.failure = 'unknown'; }
    finally { this.resetInProgress = false; }
    this.confirmReset();
  }
  private confirmReset(): void {
    const video = this.video;
    if (this.state !== 'closing' || this.resetFailed || this.resetInProgress || !video) return;
    // Chromium can retain the historical currentSrc after load() emptied the
    // resource. Require either an empty URL or a fresh owned emptied event,
    // together with actual empty network/decoder states; never release merely
    // because an attribute was removed or a timeout expired.
    if ((!video.currentSrc || this.resetEmptied) && !video.getAttribute('src') && video.readyState === 0 && video.networkState === 0 && video.paused) this.finishReset();
  }
  private finishReset(): void {
    const video = this.video;
    if (video && this.emptied) video.removeEventListener('emptied', this.emptied);
    this.emptied = undefined;
    try { video?.remove(); this.release?.(); }
    catch { this.failure = 'unknown'; this.resetFailed = true; return; }
    this.release = undefined; this.video = undefined; this.state = 'idle';
  }
  private fail(code: ErrorCode): void {
    if (['idle', 'closing', 'failed'].includes(this.state)) return;
    const preparing = this.state === 'preparing'; this.state = 'failed'; this.failure = code; this.buffering = false;
    this.rejectPending(new DomainError(code));
    try { this.video?.pause(); this.host.screensaver(true); } catch { /* Lease remains held until close is confirmed. */ }
    if (!preparing) this.onError?.();
  }
  private rejectPending(error: DomainError): void { for (const reject of [...this.pending]) reject(error); }
  private wait(video: HTMLVideoElement, epoch: number, type: string, check: () => boolean): Promise<void> {
    const promise = new Promise<void>((resolve, reject) => {
      const cleanup = () => { clearTimeout(timer); video.removeEventListener(type, completed); this.pending.delete(cancel); };
      const cancel = (error: DomainError) => { cleanup(); reject(error); };
      const completed = () => {
        if (epoch !== this.epoch || this.video !== video) { cancel(new DomainError('cancelled')); return; }
        try { if (check()) { cleanup(); resolve(); } } catch (error) { cancel(error instanceof DomainError ? error : new DomainError('network')); }
      };
      const timer = setTimeout(() => cancel(new DomainError('timeout')), this.operationMs);
      this.pending.add(cancel); video.addEventListener(type, completed);
    });
    // Close or synchronous load failure can reject before the caller awaits it.
    void promise.catch(() => {}); return promise;
  }
}
