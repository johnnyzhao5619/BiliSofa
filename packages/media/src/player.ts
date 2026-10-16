import { DomainError, type MediaSource, type PlayerBackend, type PlayerState } from '../../contracts/src/index.ts';

export class PlayerCoordinator {
  private epoch = 0;
  private pendingSeeks = 0;
  get seeking(): boolean { return this.pendingSeeks > 0; }
  private serial: Promise<unknown> = Promise.resolve();
  private kind: MediaSource['kind'] = 'vod';
  state: PlayerState = 'idle';
  timeMs = 0;
  constructor(private readonly backend: PlayerBackend) {}
  async open(source: MediaSource): Promise<void> {
    this.close();
    const epoch = this.epoch;
    this.kind = source.kind;
    this.state = 'preparing';
    try {
      await this.backend.prepare(source, timeMs => {
        if (epoch === this.epoch && Number.isFinite(timeMs) && timeMs >= 0) this.timeMs = timeMs;
      }, () => { if (epoch === this.epoch) this.close(); }, () => {
        if (epoch === this.epoch) this.fail();
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
    try { this.backend.play(); this.backend.screensaver(false); this.state = 'playing'; }
    catch { this.fail(); throw new DomainError('network'); }
  }
  pause(): void {
    if (this.seeking) return;
    if (this.state !== 'playing') return;
    try { this.backend.pause(); this.state = 'paused'; }
    catch { this.fail(); throw new DomainError('network'); }
    finally { this.backend.screensaver(true); }
  }
  seek(timeMs: number): Promise<void> {
    if (!Number.isFinite(timeMs) || timeMs < 0 || this.kind === 'live') return Promise.reject(new DomainError('invalid'));
    const epoch = this.epoch;
    const execute = async () => {
      if (epoch !== this.epoch) throw new DomainError('cancelled');
      if (!['ready', 'playing', 'paused'].includes(this.state)) throw new DomainError('invalid');
      await this.backend.seek(timeMs);
      if (epoch !== this.epoch) throw new DomainError('cancelled');
      // Time is updated only by backend events; successful seek is not a time tick.
    };
    this.pendingSeeks++;
    const result = this.serial.then(execute).finally(() => { if (epoch === this.epoch) this.pendingSeeks--; });
    this.serial = result.catch(() => {});
    return result;
  }
  private fail(): void { this.close(); this.state = 'error'; }
  close(): void {
    this.epoch++;
    this.serial = Promise.resolve();
    this.pendingSeeks = 0;
    try { this.backend.close(); } finally {
      this.backend.screensaver(true);
      this.state = 'idle';
      this.timeMs = 0;
    }
  }
}
