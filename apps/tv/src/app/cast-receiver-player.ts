export type CastPlayerFact='snapshot_local_inactive'|'timeline_tick'|'timeline_changed'|'seek_target_nonzero'|'seek_target_hit'|'seek_target_window_missed';
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
  private startedAt:number|undefined;
  private startupPosition=true;
  private positionObservation:{value:number;at:number}|undefined;
  private target: { ms: number; last: number; enabled: boolean; first?: { at: number; ms: number } } | undefined;
  constructor(private readonly player: PlayerCoordinator, private readonly url: string, private readonly valid: () => boolean, private readonly durationMs: () => number, private readonly publish: (value: ReceiverSnapshot) => void, private readonly acknowledge: (id: number, accepted: boolean) => void, private readonly seekResult: (ok: boolean) => void, private readonly observe: (fact: CastPlayerFact) => void = () => {}, private readonly seekOutcome: (stage: 'started' | 'succeeded' | 'failed') => void = () => {}, private readonly clock: () => number = () => performance.now(), private readonly alignStartup=false,private readonly initialAlignment:()=>void=()=>{},private readonly nativePlayingSeek=false,private readonly idempotentPosition=false,private readonly positionAligned:()=>void=()=>{}) {}
  get knownDurationMs(): number { return this.duration; }
  private observePosition():void {
    const value=this.player.timeMs;
    if(this.player.state==='playing'&&!this.player.seeking&&Number.isFinite(value)&&value>0&&this.positionObservation?.value!==value){
      const at=this.clock();if(Number.isFinite(at))this.positionObservation={value,at};
    }
  }
  snapshot(): void {
    if (!this.valid()) { this.observe('snapshot_local_inactive'); return; }
    this.observePosition();
    if(this.player.state==='playing'&&this.startedAt===undefined)this.startedAt=this.clock();
    if (this.player.timeMs > 0) { this.observe('timeline_tick'); if (this.firstTime === undefined) this.firstTime = this.player.timeMs; else if (Math.abs(this.player.timeMs - this.firstTime) >= 1000) this.observe('timeline_changed'); }
    const target = this.target;
    if (target?.enabled && !this.player.seeking && this.player.state === 'playing' && this.player.timeMs !== target.last) {
      target.last = this.player.timeMs;
      if (Math.abs(this.player.timeMs - target.ms) <= 1500) { this.observe('seek_target_hit'); this.target = undefined; }
      else if (!target.first) target.first = { at: this.clock(), ms: this.player.timeMs };
      else if (this.clock() - target.first.at >= 4000 && this.player.timeMs - target.first.ms >= 2000) { this.observe('seek_target_window_missed'); this.target = undefined; }
    }
    // AVPlay forbids other API calls until asynchronous prepare/seek finishes.
    // Publish cached duration while busy; coordinator fields remain safe to read.
    if (!this.player.seeking && ['ready', 'playing', 'paused'].includes(this.player.state)) {
      const n = this.durationMs(); if (Number.isFinite(n) && n > 0 && n <= 86400000) this.duration = Math.floor(n);
    }
    this.publish({ frame: ++this.frame, state: this.player.state, timeMs: Math.min(86400000, Math.floor(this.player.timeMs)), durationMs: this.duration, seeking: this.player.seeking, controller: this.controller });
  }
  takeRemote(): boolean {
    if (!this.valid() || this.player.seeking || this.player.state === 'preparing') return false;
    this.startupPosition=false;this.controller = 'remote'; this.snapshot(); return true;
  }
  handBack(): boolean { if (!this.valid() || this.player.seeking || this.player.state === 'preparing') return false; this.controller = 'sender'; this.snapshot(); return true; }
  execute(id: number, command: ReceiverCommand): void {
    if (!this.valid() || this.controller !== 'sender' || this.player.seeking || this.player.state === 'preparing' || id <= this.lastId) { this.acknowledge(id, false); return; }
    this.lastId = id; const operation = ++this.operation;
    const current = () => this.valid() && operation === this.operation;
    try {
      let pending: Promise<void> | undefined;
      if(command.type==='pause'||command.type==='stop')this.startupPosition=false;
      if (command.type === 'pause') {
        if (!['playing', 'paused'].includes(this.player.state)) throw new Error();
        this.player.pause();
      } else if (command.type === 'stop') { this.target = undefined; this.player.close(); }
      else if (command.type === 'play') {
        if (this.player.state === 'idle') {
          this.startupPosition=true;this.startedAt=undefined;this.duration=0;this.firstTime=undefined;this.positionObservation=undefined;
          pending = this.player.open({ url: this.url, kind: 'vod' }).then(() => { if (current()) this.player.play(); });
        }
        else if (this.player.state !== 'playing') this.player.play();
      } else if (command.type === 'seek') {
        if (!['playing', 'paused', 'ready'].includes(this.player.state) || this.duration > 0 && command.timeMs >= this.duration) throw new Error();
        this.observePosition();
        const now=this.clock(),initial=this.startupPosition;this.startupPosition=false;
        // SOAP reports RelTime in whole seconds. Seeking to that same current
        // second is idempotent: a needless SDK seek can move to another decode
        // position. Require a recent observed real tick, never a stale cache,
        // paused state, fractional target or an arbitrary distance tolerance.
        const position=this.positionObservation;
        if(this.idempotentPosition&&this.nativePlayingSeek&&this.player.state==='playing'&&this.duration>0&&position&&Number.isFinite(now)&&now>=position.at&&now-position.at<=1000&&command.timeMs%1000===0&&Math.floor(this.player.timeMs/1000)*1000===command.timeMs){
          this.target=undefined;this.positionAligned();this.snapshot();this.acknowledge(id,true);this.seekResult(true);return;
        }
        // Official senders can align an initial 00:00:00/00:00:01 after the
        // first live position response. Only merge this first near-start seek:
        // keep actual ticks, never reopen an already aligned decoder. Later
        // rewind-to-zero, nonzero resume, pause/remote ownership stay exact.
        if(this.alignStartup&&initial&&this.player.state==='playing'&&this.startedAt!==undefined&&Number.isFinite(now)&&now>=this.startedAt&&now-this.startedAt<=4000&&this.duration>0&&this.player.timeMs<=2500&&command.timeMs<=1000&&Math.abs(command.timeMs-this.player.timeMs)<=2500){
          this.initialAlignment();this.snapshot();this.acknowledge(id,true);this.seekResult(true);return;
        }
        this.target = { ms: command.timeMs, last: this.player.timeMs, enabled: false };
        if (command.timeMs >= 3000) this.observe('seek_target_nonzero');
        // Keep an active nonzero seek in PLAYING. Forcing PAUSED here
        // selected the PREBUFFER reopen workaround and could restart at zero
        // despite its successful prepare callback (retail 0.41 trace).
        const resume = this.player.state === 'playing';
        const pauseForSeek = resume && (!this.nativePlayingSeek || command.timeMs === 0);
        if (pauseForSeek) this.player.pause();
        this.seekOutcome('started');
        pending = this.player.seek(command.timeMs).then(() => { if (current()) { if (pauseForSeek) this.player.play(); if (this.target) this.target.enabled = true; } });
      }
      // This ACK means accepted dispatch, never seek completion or A/V proof.
      this.snapshot(); this.acknowledge(id, true);
      if (pending) void pending.then(() => { if (current()) { this.snapshot(); if (command.type === 'seek') { this.seekOutcome('succeeded'); this.seekResult(true); } } }, () => { if (current()) { if (command.type === 'seek') { this.target = undefined; this.player.close(); } this.snapshot(); if (command.type === 'seek') this.seekOutcome('failed'); this.seekResult(false); } });
    } catch { if (current()) { this.snapshot(); this.acknowledge(id, false); } }
  }
}
