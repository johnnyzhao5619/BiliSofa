import { DomainError, type MediaSource, type PlayerBackend, type PlayerState } from '../../contracts/src/index.ts';

export class PlayerCoordinator {
  private epoch = 0;
  private pendingSeeks = 0;
  get seeking(): boolean { return this.pendingSeeks > 0; }
  private serial: Promise<unknown> = Promise.resolve();
  private kind: MediaSource['kind'] = 'vod';
  state: PlayerState = 'idle';
  timeMs = 0;
  acceptedRate: 1 | 2 | undefined;
  private resumeRate: 1 | 2 | undefined;
  constructor(private readonly backend: PlayerBackend, private readonly terminal?: (reason: 'ended' | 'error') => void) {}
  async open(source: MediaSource): Promise<void> {
    this.close();
    const epoch = this.epoch;
    this.kind = source.kind;
    this.state = 'preparing';
    try {
      await this.backend.prepare(source, timeMs => {
        if (epoch === this.epoch && Number.isFinite(timeMs) && timeMs >= 0) this.timeMs = timeMs;
      }, () => { if (epoch === this.epoch) { this.notify('ended'); this.close(); } }, () => {
        if (epoch === this.epoch) { this.notify('error'); this.fail(); }
      });
      if (epoch !== this.epoch) throw new DomainError('cancelled');
      if (this.state !== 'preparing') throw new DomainError('network');
      this.state = 'ready';
    } catch (error) {
      if (epoch === this.epoch) this.fail();
      throw error;
    }
  }
  play(): void {
    if (this.seeking) return;
    if (this.state !== 'ready' && this.state !== 'paused') throw new DomainError('invalid');
    try {
      this.backend.play(); this.backend.screensaver(false); this.state = 'playing';
      if (this.resumeRate !== undefined) this.setRate(this.resumeRate);
    }
    catch { this.fail(); throw new DomainError('network'); }
  }
  /** A newly prepared source may remain silent until explicit continue. */
  hold(): void {
    if (this.seeking || this.state !== 'ready') throw new DomainError('invalid');
    this.backend.screensaver(true);
    this.state = 'paused';
  }
  pause(): void {
    if (this.seeking) return;
    if (this.state !== 'playing') return;
    try { this.backend.pause(); this.state = 'paused'; }
    catch { this.fail(); throw new DomainError('network'); }
    finally { this.backend.screensaver(true); }
  }
  setRate(rate: 1 | 2): 'accepted' | 'unsupported' | 'busy' | 'failed' {
    if (rate !== 1 && rate !== 2) throw new DomainError('invalid');
    if (this.kind !== 'vod') return 'unsupported';
    if (this.seeking || this.state !== 'playing') return 'busy';
    let result: 'accepted' | 'unsupported' | 'busy' | 'failed';
    try { result = this.backend.setRate?.(rate) ?? 'unsupported'; }
    catch { result = 'failed'; }
    if (result === 'accepted') this.acceptedRate = this.resumeRate = rate;
    return result;
  }
  seek(timeMs: number): Promise<void> {
    if (!Number.isFinite(timeMs) || timeMs < 0 || this.kind === 'live') return Promise.reject(new DomainError('invalid'));
    const epoch = this.epoch;
    let completed = false;
    const execute = async () => {
      if (epoch !== this.epoch) throw new DomainError('cancelled');
      if (!['ready', 'playing', 'paused'].includes(this.state)) throw new DomainError('invalid');
      await this.backend.seek(timeMs);
      if (epoch !== this.epoch) throw new DomainError('cancelled');
      // A backend may recreate its decoder for seek. Reapply only after a real
      // playable state, or on explicit continue when it stayed paused.
      this.acceptedRate = undefined;
      completed = true;
      // Time is updated only by backend events; successful seek is not a time tick.
    };
    this.pendingSeeks++;
    const result = this.serial.then(execute).finally(() => {
      if (epoch !== this.epoch) return;
      this.pendingSeeks--;
      if (completed && !this.seeking && this.resumeRate !== undefined && this.state === 'playing') this.setRate(this.resumeRate);
    });
    this.serial = result.catch(() => {});
    return result;
  }
  private notify(reason: 'ended' | 'error'): void { try { this.terminal?.(reason); } catch { /* Observers must never prevent decoder cleanup. */ } }
  private fail(): void { this.close(); this.state = 'error'; }
  close(): void {
    this.epoch++;
    this.serial = Promise.resolve();
    this.pendingSeeks = 0;
    try { this.backend.close(); } finally {
      this.backend.screensaver(true);
      this.state = 'idle';
      this.timeMs = 0;
      this.acceptedRate = this.resumeRate = undefined;
    }
  }
}
