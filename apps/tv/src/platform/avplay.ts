import { DomainError, type MediaSource, type PlayerBackend, type ErrorCode } from '../../../../packages/contracts/src/index.ts';

export interface AvplayApi {
  getState(): 'NONE' | 'IDLE' | 'READY' | 'PLAYING' | 'PAUSED';
  open(url: string): void;
  setListener(listener: { oncurrentplaytime?: (timeMs: number) => void; onstreamcompleted?: () => void; onerror?: (value?: unknown) => void; onbufferingstart?: () => void; onbufferingcomplete?: () => void }): void;
  setDisplayRect(x: number, y: number, width: number, height: number): void;
  prepareAsync(success: () => void, error: (value?: unknown) => void): void;
  play(): void;
  pause(): void;
  seekTo(timeMs: number, success: () => void, error: (value?: unknown) => void): void;
  setStreamingProperty?(property: 'PREBUFFER_MODE', value: string): void;
  setBufferingParam?(option: 'PLAYER_BUFFER_FOR_PLAY' | 'PLAYER_BUFFER_FOR_RESUME', unit: 'PLAYER_BUFFER_SIZE_IN_SECOND', seconds: number): void;
  setTimeoutForBuffering?(seconds: number): void;
  getDuration?(): number;
  getTotalTrackInfo?(): { type?: unknown }[];
  getCurrentStreamInfo?(): { type?: unknown; extra_info?: unknown }[];
  setSpeed?(rate: number): void;
  stop(): void;
  close(): void;
}
export interface ScreenSaverApi {
  AppCommonScreenSaverState: { SCREEN_SAVER_ON: number; SCREEN_SAVER_OFF: number };
  setScreenSaver(state: number, success: () => void, error: () => void): void;
}
export interface PreparationInitialization {
  mib: number;
  latestProgress: () => number;
  clock?: () => number;
}
// Candidate adapter only; no production URL policy selected before W01 source/CDN proof.
export class AvplayBackend implements PlayerBackend {
  private epoch = 0;
  private failure = 'avplay.prepare_unclassified';
  private buffering = false;
  bufferingActive(): boolean { return this.buffering; }
  private bufferingConfigured = false;
  // Logical pause can hold a completed prebuffer in SDK IDLE/READY without play.
  private heldForResume = false;
  private prebufferComplete = false;
  bufferingSummary(): string { return this.bufferingConfigured ? 'avplay.buffer_play4_resume4_timeout10' : 'avplay.buffer_default'; }
  // Setter acceptance and measured effective rate/audio remain separate facts.
  setRate(rate: 1 | 2): 'accepted' | 'unsupported' | 'busy' | 'failed' {
    if (rate !== 1 && rate !== 2 || !this.binding || this.binding.source.kind !== 'vod' || this.pending.size || this.buffering || this.heldForResume || this.prebufferComplete) return 'busy';
    try {
      if (this.api.getState() !== 'PLAYING') return 'busy';
      if (!this.api.setSpeed) return 'unsupported';
      this.api.setSpeed(rate); return 'accepted';
    } catch (value) {
      this.noteFailure(value, 'avplay.rate_');
      return this.failure === 'avplay.rate_notsupportederror' ? 'unsupported' : 'failed';
    }
  }
  setProbeRate(rate: 1 | 2): 'accepted' | 'unsupported' | 'busy' | 'failed' { return this.setRate(rate); }
  private seekTarget: number | undefined;
  private seekTargetSeen = false;
  private operation: 'prepare' | 'seek' | 'seek_restart' | 'playback' = 'prepare';
  private binding: { source: MediaSource; onTime: (ms: number) => void; onEnd: () => void; onError: () => void } | undefined;
  private seekFacts(): string { return `_b${this.buffering ? 1 : 0}_t${this.seekTargetSeen ? 1 : 0}`; }
  failureSummary(): string { return this.failure; }
  failureReason():ErrorCode|undefined {
    if(/not_supported_(?:file|format)|notsupportederror/.test(this.failure))return 'unsupported';
    if(/securityerror/.test(this.failure))return 'permission';
    if(/invalid_state|invalidstateerror|invalid_operation/.test(this.failure))return 'invalid';
    if(/timeout|init_stalled/.test(this.failure))return 'timeout';
    return undefined;
  }

  private stateCode(): string {
    try { return ({ NONE: 'n', IDLE: 'i', READY: 'r', PLAYING: 'p', PAUSED: 'h' } as Record<string, string>)[this.api.getState()] ?? 'u'; } catch { return 'u'; }
  }
  private noteFailure(value: unknown, prefix = 'avplay.prepare_'): void {
    const errors = ['PLAYER_ERROR_NONE', 'PLAYER_ERROR_INVALID_PARAMETER', 'PLAYER_ERROR_NO_SUCH_FILE', 'PLAYER_ERROR_INVALID_OPERATION', 'PLAYER_ERROR_SEEK_FAILED', 'PLAYER_ERROR_INVALID_STATE', 'PLAYER_ERROR_NOT_SUPPORTED_FILE', 'PLAYER_ERROR_NOT_SUPPORTED_FORMAT', 'PLAYER_ERROR_INVALID_URI', 'PLAYER_ERROR_CONNECTION_FAILED', 'PLAYER_ERROR_GENEREIC'];
    const names = ['NotSupportedError', 'InvalidValuesError', 'InvalidAccessError', 'InvalidStateError', 'UnknownError', 'TypeMismatchError', 'SecurityError'];
    if (typeof value === 'string' && errors.includes(value)) this.failure = prefix + value.toLowerCase();
    else { let name: unknown; try { name = value && typeof value === 'object' ? (value as { name?: unknown }).name : value; } catch { /* Unrecognized SDK errors remain unclassified. */ } this.failure = typeof name === 'string' && names.includes(name) ? prefix + name.toLowerCase() : prefix + 'unclassified'; }
  }
  private pending = new Set<(reason: unknown) => void>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  constructor(private readonly api: AvplayApi, private readonly saver: ScreenSaverApi, private readonly validateUrl: (url: string) => string, private readonly progressiveBuffering = false, private readonly prebufferSeeking = false, private readonly initialization?: PreparationInitialization) {}
  prepare(source: MediaSource, onTime: (timeMs: number) => void, onEnd: () => void, onError: () => void): Promise<void> {
    return this.prepareAt(source, onTime, onEnd, onError);
  }
  private prepareAt(source: MediaSource, onTime: (ms: number) => void, onEnd: () => void, onError: () => void, startMs?: number): Promise<void> {
    this.close();
    const epoch = this.epoch, operation = startMs === undefined ? 'prepare' : 'seek_restart';
    this.failure = `avplay.${operation}_unclassified`; this.operation = operation; this.buffering = false; this.bufferingConfigured = false;
    this.seekTarget = startMs; this.seekTargetSeen = false;
    const url = this.validateUrl(source.url);
    this.binding = { source: { ...source, url }, onTime, onEnd, onError };
    return this.callbackOperation(epoch, operation, (resolve, reject) => {
      this.failure = `avplay.${operation}_open_failed`; this.api.open(url);
      if (this.api.getState() !== 'IDLE') throw new DomainError('invalid');
      this.failure = `avplay.${operation}_listener_failed`; this.api.setListener({
        oncurrentplaytime: timeMs => { if (epoch === this.epoch) {
          if (this.seekTarget !== undefined && Number.isFinite(timeMs) && Math.abs(timeMs - this.seekTarget) <= 1500) this.seekTargetSeen = true;
          onTime(timeMs);
        } },
        onbufferingstart: () => { if (epoch === this.epoch) this.buffering = true; },
        onbufferingcomplete: () => { if (epoch === this.epoch) this.buffering = false; },
        onstreamcompleted: () => { if (epoch === this.epoch) onEnd(); },
        onerror: value => { if (epoch === this.epoch) { this.noteFailure(value, `avplay.${this.operation}_event_`); reject(new DomainError('network')); onError(); } },
      });
      this.failure = `avplay.${operation}_display_failed`; this.api.setDisplayRect(0, 0, 1920, 1080);
      if (startMs !== undefined) {
        this.failure = 'avplay.seek_restart_prebuffer_failed';
        try { this.api.setStreamingProperty!('PREBUFFER_MODE', String(startMs)); }
        catch (value) { this.noteFailure(value, 'avplay.seek_restart_prebuffer_'); throw new DomainError('network'); }
      }
      if (this.progressiveBuffering && this.api.setBufferingParam && this.api.setTimeoutForBuffering) {
        this.failure = `avplay.${operation}_buffering_failed`;
        this.api.setBufferingParam('PLAYER_BUFFER_FOR_PLAY', 'PLAYER_BUFFER_SIZE_IN_SECOND', 4);
        this.api.setBufferingParam('PLAYER_BUFFER_FOR_RESUME', 'PLAYER_BUFFER_SIZE_IN_SECOND', 4);
        this.api.setTimeoutForBuffering(10); this.bufferingConfigured = true;
      }
      this.failure = `avplay.${operation}_callback_pending`;
      try { this.api.prepareAsync(() => {
        if (epoch !== this.epoch) { reject(new DomainError('cancelled')); return; }
        const preparedState = this.api.getState();
        // PREBUFFER_MODE success signals prebuffer completion, which this TV
        // reports in IDLE. Never accept ordinary IDLE or an absent callback.
        if (startMs !== undefined && preparedState === 'IDLE') this.prebufferComplete = true;
        if (preparedState !== 'READY' && !this.prebufferComplete) { this.failure = `avplay.${operation}_ready_state_${this.stateCode()}`; reject(new DomainError('invalid')); return; }
        this.operation = 'playback'; resolve();
      }, value => { if (epoch === this.epoch) { this.noteFailure(value, `avplay.${operation}_`); this.failure += '_s' + this.stateCode(); } reject(new DomainError('network')); });
      } catch (value) { this.noteFailure(value, `avplay.${operation}_throw_`); this.failure += '_s' + this.stateCode(); reject(new DomainError('network')); }
    });
  }
  private callbackOperation(epoch: number, operation: 'prepare' | 'seek' | 'seek_restart', start: (resolve: () => void, reject: (reason: unknown) => void) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;
      let activityTimer: ReturnType<typeof setTimeout> | undefined;
      const large = operation !== 'seek' && this.progressiveBuffering && this.initialization && Number.isInteger(this.initialization.mib) && this.initialization.mib > 8 && this.initialization.mib <= 128 ? this.initialization : undefined;
      const clock = large?.clock ?? (() => performance.now());
      const startedAt = large ? clock() : 0;
      const finish = (error?: unknown) => {
        if (settled) return;
        settled = true; clearTimeout(timer); this.timers.delete(timer); this.pending.delete(cancel);
        if (activityTimer !== undefined) { clearTimeout(activityTimer); this.timers.delete(activityTimer); }
        if (epoch !== this.epoch) reject(new DomainError('cancelled'));
        else if (error) reject(error); else resolve();
      };
      const cancel = (error: unknown) => finish(error);
      const timer = setTimeout(() => {
        this.failure = `avplay.${operation}_timeout${operation !== 'prepare' ? this.seekFacts() : `_b${this.buffering ? 1 : 0}_s${this.stateCode()}`}`; finish(new DomainError('timeout'));
        if (epoch === this.epoch) this.close();
      }, large ? Math.min(180000, large.mib * 4000 + 10000) : operation !== 'prepare' || this.progressiveBuffering ? 30000 : 15000);
      this.timers.add(timer); this.pending.add(cancel);
      if (large) {
        const check = () => {
          if (activityTimer !== undefined) this.timers.delete(activityTimer);
          if (settled || epoch !== this.epoch) return;
          let now = Number.NaN, progress = Number.NaN;
          try { now = clock(); progress = large.latestProgress(); } catch { /* Missing activity is never success. */ }
          const last = Number.isFinite(progress) && progress >= startedAt && progress <= now ? progress : startedAt;
          if (!Number.isFinite(now) || now - last >= 20000) {
            this.failure = `avplay.${operation}_init_stalled_b${this.buffering ? 1 : 0}_s${this.stateCode()}`;
            finish(new DomainError('timeout')); if (epoch === this.epoch) this.close(); return;
          }
          activityTimer = setTimeout(check, 1000); this.timers.add(activityTimer);
        };
        activityTimer = setTimeout(check, 20000); this.timers.add(activityTimer);
      }
      try { start(() => finish(), error => finish(error)); } catch { finish(new DomainError('network')); }
    });
  }
  play(): void {
    const state = this.api.getState();
    if (!['READY', 'PAUSED'].includes(state) && !(state === 'IDLE' && this.prebufferComplete)) throw new DomainError('invalid');
    this.api.play();
    if (this.api.getState() !== 'PLAYING') throw new DomainError('network');
    this.heldForResume = false; this.prebufferComplete = false;
  }
  pause(): void {
    if (this.api.getState() !== 'PLAYING') return;
    this.api.pause();
    if (this.api.getState() !== 'PAUSED') throw new DomainError('network');
  }
  async seek(timeMs: number): Promise<void> {
    this.failure = 'avplay.seek_invalid_state';
    const epoch = this.epoch, state = this.api.getState();
    const heldIdle = state === 'IDLE' && this.heldForResume && this.prebufferComplete;
    if (!Number.isFinite(timeMs) || timeMs < 0 || !['READY', 'PLAYING', 'PAUSED'].includes(state) && !heldIdle) throw new DomainError('invalid');
    if (this.progressiveBuffering && this.api.setStreamingProperty && this.binding) {
      if (state === 'PAUSED' || state === 'READY' && this.heldForResume || heldIdle) return this.restartSeek(timeMs, false);
      if (this.prebufferSeeking && state === 'PLAYING') return this.restartSeek(timeMs, true);
    }
    this.operation = 'seek'; this.seekTarget = timeMs; this.seekTargetSeen = false;
    this.failure = 'avplay.seek_callback_pending';
    try {
      await this.callbackOperation(epoch, 'seek', (resolve, reject) => {
        let callbackComplete = false;
        const failed = (value: unknown, kind: 'callback' | 'throw') => {
          if (callbackComplete || epoch !== this.epoch) return;
          callbackComplete = true;
          this.noteFailure(value, `avplay.seek_${kind}_`); this.failure += this.seekFacts() + '_s' + this.stateCode();
          // Only a completed callback (or synchronous rejection) with unchanged
          // active state permits a user retry. Never auto-retry or reuse a timeout.
          let retryable = false;
          try { retryable = (state === 'PLAYING' || state === 'PAUSED') && this.api.getState() === state; } catch { /* Unknown backend state must close. */ }
          reject(new DomainError('network', retryable));
        };
        try { this.api.seekTo(timeMs, () => {
          if (callbackComplete || epoch !== this.epoch) return;
          callbackComplete = true; this.failure = 'avplay.seek_callback_success' + this.seekFacts(); resolve();
        }, value => failed(value, 'callback')); } catch (value) { failed(value, 'throw'); }
      });
    } finally { if (epoch === this.epoch) { this.seekTarget = undefined; this.operation = 'playback'; } }
  }
  private async restartSeek(timeMs: number, resume: boolean): Promise<void> {
    // A fresh user seek, never a retry over an unfinished native seek. Keep the
    // current owned loopback lease; only AVPlay is recreated at a start offset.
    const binding = this.binding!;
    let preparation: Promise<void>;
    try { preparation = this.prepareAt(binding.source, binding.onTime, binding.onEnd, binding.onError, timeMs); }
    catch (error) { this.close(); throw error; }
    const epoch = this.epoch;
    try {
      await preparation;
      if (epoch !== this.epoch) throw new DomainError('cancelled');
      if (resume) {
        this.failure = 'avplay.seek_restart_play_failed'; this.play(); this.screensaver(false);
        this.failure = 'avplay.seek_restart_started' + this.seekFacts();
      } else {
        // Coordinator remains paused. Completed prebuffer is not PAUSED: no
        // hidden play/pause pair, timeline fabrication or unrequested audio.
        this.heldForResume = true; this.screensaver(true);
        this.failure = 'avplay.seek_restart_held' + this.seekFacts();
      }
    } catch (error) {
      if (epoch === this.epoch) this.close();
      throw error;
    } finally { if (epoch === this.epoch) this.seekTarget = undefined; }
  }
  durationMs(): number {
    if (this.pending.size || this.prebufferComplete) return 0;
    try { const n = this.api.getDuration?.(); return typeof n === 'number' && Number.isFinite(n) && n > 0 && n <= 86400000 ? Math.floor(n) : 0; } catch { return 0; }
  }
  trackSummary(): string {
    try {
      const tracks = this.api.getTotalTrackInfo?.();
      if (!Array.isArray(tracks) || tracks.length > 32) return 'avplay.tracks_unavailable';
      return `avplay.tracks_video${tracks.filter(track => track?.type === 'VIDEO').length}_audio${tracks.filter(track => track?.type === 'AUDIO').length}`;
    } catch { return 'avplay.tracks_unavailable'; }
  }
  // Decoder-reported stream metadata, not panel output or HDR proof. Keep raw
  // SDK extra_info out of diagnostics and never change playback to inspect it.
  streamSummary(): string {
    if (this.pending.size || this.prebufferComplete) return 'avplay.stream_unavailable';
    try {
      if (!['READY','PLAYING','PAUSED'].includes(this.api.getState())) return 'avplay.stream_unavailable';
      const tracks = this.api.getCurrentStreamInfo?.();
      if (!Array.isArray(tracks) || tracks.length > 32 || tracks.filter(t => t?.type === 'VIDEO').length !== 1) return 'avplay.stream_unavailable';
      const info = (type: string): Record<string, unknown> => {
        const raw = tracks.find(t => t?.type === type)?.extra_info;
        if (typeof raw !== 'string' || raw.length > 4096) return {};
        const value: unknown = JSON.parse(raw);
        return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
      };
      const number = (raw: unknown, max: number): number => {
        const value = typeof raw === 'string' && /^[0-9]{1,10}$/.test(raw.trim()) ? Number(raw.trim()) : raw;
        return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= max ? value : 0;
      };
      const codec = (raw: unknown): string => {
        const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
        return ['h264','avc1','avc3','hevc','h265','hvc1','hev1','av01','av1','vp9','vp90','vp8','aacl','aac','mp4a','ac3','eac3','ec-3','opus','flac','mp3'].includes(value) ? value.replace('-', '') : 'unknown';
      };
      const video = info('VIDEO'), audio = info('AUDIO');
      return `avplay.stream_v1_w${number(video.Width, 16384)}_h${number(video.Height, 8640)}_b${number(video.Bit_rate, 1000000000)}_v${codec(video.fourCC)}_a${codec(audio.fourCC)}`;
    } catch { return 'avplay.stream_unavailable'; }
  }
  closureConfirmed(): boolean { try { return this.api.getState() === 'NONE'; } catch { return false; } }
  close(): void {
    this.epoch++; this.binding = undefined; this.seekTarget = undefined; this.buffering = false; this.heldForResume = false; this.prebufferComplete = false;
    for (const cancel of [...this.pending]) cancel(new DomainError('cancelled'));
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    try {
      const state = this.api.getState();
      if (state === 'READY' || state === 'PLAYING' || state === 'PAUSED') this.api.stop();
      if (this.api.getState() !== 'NONE') this.api.close();
    } finally { this.screensaver(true); }
  }
  screensaver(active: boolean): void {
    this.saver.setScreenSaver(active ? this.saver.AppCommonScreenSaverState.SCREEN_SAVER_ON : this.saver.AppCommonScreenSaverState.SCREEN_SAVER_OFF, () => {}, () => {});
  }
}
