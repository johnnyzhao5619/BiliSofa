import type { ReceiverCommand, ReceiverSnapshot } from '../../../../packages/contracts/src/cast-receiver.ts';
import type { PlayerCoordinator } from '../../../../packages/media/src/player.ts';

// UI owner: only this controller dispatches approved phone commands to the
// existing player. It never receives sender URLs, addresses or account data.
export class CastReceiverPlayer {
  private controller: 'sender' | 'remote' = 'sender';
  private frame = 0;
  private lastId = 0;
  private operation = 0;
  private duration = 0;
  private firstTime: number | undefined;
  constructor(private readonly player: PlayerCoordinator, private readonly url: string, private readonly valid: () => boolean, private readonly durationMs: () => number, private readonly publish: (value: ReceiverSnapshot) => void, private readonly acknowledge: (id: number, accepted: boolean) => void, private readonly seekResult: (ok: boolean) => void, private readonly observe: (fact: 'snapshot_local_inactive' | 'timeline_tick' | 'timeline_changed') => void = () => {}) {}
  snapshot(): void {
    if (!this.valid()) { this.observe('snapshot_local_inactive'); return; }
    if (this.player.timeMs > 0) { this.observe('timeline_tick'); if (this.firstTime === undefined) this.firstTime = this.player.timeMs; else if (Math.abs(this.player.timeMs - this.firstTime) >= 1000) this.observe('timeline_changed'); }
    // AVPlay forbids other API calls until asynchronous prepare/seek finishes.
    // Publish cached duration while busy; coordinator fields remain safe to read.
    if (!this.player.seeking && ['ready', 'playing', 'paused'].includes(this.player.state)) {
      const n = this.durationMs(); if (Number.isFinite(n) && n > 0 && n <= 86400000) this.duration = Math.floor(n);
    }
    this.publish({ frame: ++this.frame, state: this.player.state, timeMs: Math.min(86400000, Math.floor(this.player.timeMs)), durationMs: this.duration, seeking: this.player.seeking, controller: this.controller });
  }
  takeRemote(): boolean {
    if (!this.valid() || this.player.seeking || this.player.state === 'preparing') return false;
    this.controller = 'remote'; this.snapshot(); return true;
  }
  handBack(): boolean { if (!this.valid() || this.player.seeking || this.player.state === 'preparing') return false; this.controller = 'sender'; this.snapshot(); return true; }
  execute(id: number, command: ReceiverCommand): void {
    if (!this.valid() || this.controller !== 'sender' || this.player.seeking || this.player.state === 'preparing' || id <= this.lastId) { this.acknowledge(id, false); return; }
    this.lastId = id; const operation = ++this.operation;
    const current = () => this.valid() && operation === this.operation;
    try {
      let pending: Promise<void> | undefined;
      if (command.type === 'pause') {
        if (!['playing', 'paused'].includes(this.player.state)) throw new Error();
        this.player.pause();
      } else if (command.type === 'stop') this.player.close();
      else if (command.type === 'play') {
        if (this.player.state === 'idle') pending = this.player.open({ url: this.url, kind: 'vod' }).then(() => { if (current()) this.player.play(); });
        else if (this.player.state !== 'playing') this.player.play();
      } else if (command.type === 'seek') {
        if (!['playing', 'paused', 'ready'].includes(this.player.state) || this.duration > 0 && command.timeMs >= this.duration) throw new Error();
        pending = this.player.seek(command.timeMs);
      }
      // This ACK means accepted dispatch, never seek completion or A/V proof.
      this.snapshot(); this.acknowledge(id, true);
      if (pending) void pending.then(() => { if (current()) { this.snapshot(); if (command.type === 'seek') this.seekResult(true); } }, () => { if (current()) { this.snapshot(); this.seekResult(false); } });
    } catch { if (current()) { this.snapshot(); this.acknowledge(id, false); } }
  }
}
