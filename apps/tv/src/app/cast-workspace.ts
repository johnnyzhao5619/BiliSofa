import { DomainError, type ErrorCode } from '../../../../packages/contracts/src/index.ts';
import type { CastProbeResult } from '../../../../packages/contracts/src/cast-probe.ts';
import type { ReceiverSnapshot } from '../../../../packages/contracts/src/cast-receiver.ts';
import type { ReceiverLink } from '../../../../packages/contracts/src/receiver-link.ts';
import { PlayerCoordinator } from '../../../../packages/media/src/player.ts';
import type { MediaClosure, OwnedPlayerBackend } from '../../../../packages/media/src/session.ts';
import { CastReceiverPlayer } from './cast-receiver-player.ts';
export type CastPlaybackFact='seek_zero'|'seek_nonzero'|'startup_aligned'|'seek_completed'|'source_changed'|'autoplay_started'|'seek_target_hit'|'seek_target_missed'|'seek_current_position';
export interface CastBackend extends OwnedPlayerBackend { durationMs(): number; }
export interface CastStatus {
  phase: 'starting' | 'waiting' | 'checking' | 'switching' | 'preparing' | 'playing' | 'paused' | 'idle' | 'closing' | 'closed';
  generation: number; initializationMib: number; receivedMib: number; timeMs: number; durationMs: number; seeking: boolean; controller: 'sender' | 'remote';
}
interface Media { player: PlayerCoordinator; backend: CastBackend; receiver: CastReceiverPlayer; }
/** Foreground, one-use receiver owner; never mounts UI or installs key listeners.
 * Source replacement requires actual old decoder closure plus the Worker's
 * native-close, independently checked source and fresh bridge-ready facts. */
export class CastWorkspace {
  private readonly controller = new AbortController();
  private media: Media | undefined;
  private generation = 1;
  private token: string;
  private readonly tokens = new Set<string>();
  private phase: CastStatus['phase'] = 'starting';
  private last: ReceiverSnapshot | undefined;
  private started = false;
  private passed = false;
  private approved = false;
  private nativeClosed = false;
  private transitionReady = false;
  private decoderUnknown = false;
  private initMib: number | undefined;
  private readMib = 0;
  private readAt = 0;
  private timer: ReturnType<typeof setInterval> | undefined;
  private setupTimer: ReturnType<typeof setTimeout> | undefined;
  private health: { generation: number; ms: number; at: number } | undefined;
  private closing: Promise<MediaClosure> | undefined;
  constructor(private readonly link: ReceiverLink,
    private readonly createBackend: (url: string, initialization: { mib: number; latestProgress: () => number } | undefined) => CastBackend | undefined,
    private readonly finished: (error: ErrorCode | undefined, closure: MediaClosure) => void,
    private readonly clock = () => performance.now(), private readonly closeMs = 6000,private readonly product=false,private readonly observe:(fact:CastPlaybackFact)=>void=()=>{},private readonly nativePlayingSeek=false,private readonly idempotentPosition=false) {
    if (!/^[a-f0-9]{32}$/.test(link.token) || !Number.isInteger(closeMs) || closeMs < 10 || closeMs > 60000) throw new DomainError('invalid');
    this.token = link.token; this.tokens.add(this.token);
  }
  status(): CastStatus {
    return { phase: this.phase, generation: this.generation, initializationMib: this.initMib ?? 0, receivedMib: this.readMib, timeMs: this.last?.timeMs ?? 0, durationMs: this.last?.durationMs ?? 0,
      seeking: this.last?.seeking ?? false, controller: this.last?.controller ?? 'sender' };
  }
  start(): void {
    if (this.started || this.closing) throw new DomainError('invalid'); this.started = true;
    if(this.product)this.setupTimer=setTimeout(()=>{void this.finish('timeout');},20000);
    this.timer = setInterval(() => this.pulse(), 200);
    void Promise.resolve().then(() => {
      if (!this.closing) return this.link.run(this.controller.signal, event => this.event(event));
    }).then(() => { if (!this.closing) void this.finish(); }, error => { if (!this.closing) void this.finish(error instanceof DomainError ? error.code : 'unknown'); });
  }
  private event(event: CastProbeResult): void {
    if (this.closing) return;
    if (event.command) {
      if (this.media && this.phase !== 'switching') {
        if (event.command.value.type === 'play' && this.media.player.state === 'idle' && !this.media.backend.closureConfirmed()) { this.decoderUnknown = true; this.link.acknowledge(event.command.id, false); void this.finish('unknown'); return; }
        if(event.command.value.type==='seek')this.observe(event.command.value.timeMs===0?'seek_zero':'seek_nonzero');
        this.media.receiver.execute(event.command.id, event.command.value);
        if (this.media?.player.state === 'idle' && !this.media.backend.closureConfirmed()) { this.decoderUnknown = true; void this.finish('unknown'); }
      }
      else this.link.acknowledge(event.command.id, false);
      return;
    }
    if (event.transition) {
      const next = event.transition;
      if (!this.media || next.generation !== this.generation + 1 || next.generation > (this.product?2147483646:4) || this.tokens.has(next.token)) { this.link.decoderClosed(next.generation, false); void this.finish('invalid'); return; }
      this.observe('source_changed');
      const old = this.media; this.media = undefined; this.last = undefined; this.health = undefined;
      this.generation = next.generation; this.token = next.token; this.tokens.add(next.token);if(this.product&&this.tokens.size>16)this.tokens.delete(this.tokens.values().next().value!);
      this.phase = 'switching'; this.passed = this.approved = this.nativeClosed = this.transitionReady = false;
      this.initMib = undefined; this.readMib = this.readAt = 0;
      const closed = this.closeDecoder(old); this.decoderUnknown ||= !closed;
      if (!this.link.decoderClosed(this.generation, closed) || !closed) { void this.finish('unknown'); return; }
      this.armSetup(); return;
    }
    const native = /^cast\.transition_native_closed_([1-9][0-9]{0,9})$/.exec(event.code);
    if (native) { if (Number(native[1]) !== this.generation || this.phase !== 'switching') { void this.finish('invalid'); return; } this.nativeClosed = true; return; }
    const ready = /^cast\.transition_ready_([1-9][0-9]{0,9})$/.exec(event.code);
    if (ready) { if (Number(ready[1]) !== this.generation || !this.nativeClosed) { void this.finish('invalid'); return; } this.transitionReady = true; return; }
    const init = /^cast\.source_init_mib_([1-9][0-9]{0,2})$/.exec(event.code);
    if (init) this.initMib = Number(init[1]);
    const read = /^cast\.media_read_mib_([1-9][0-9]{0,2})$/.exec(event.code);
    if (read && Number(read[1]) > this.readMib) { this.readMib = Number(read[1]); this.readAt = this.clock(); }
    if (event.code === 'cast.ready') { if (this.phase === 'starting') {clearTimeout(this.setupTimer);this.setupTimer=undefined;this.phase = 'waiting';} }
    else if (event.code === 'cast.source_started') { if (this.generation === 1) this.phase = 'checking'; }
    else if (event.code === 'cast.source_pass') {
      if (this.approved || this.media || this.generation > 1 && !this.nativeClosed) { void this.finish('invalid'); return; }
      this.passed = true; this.approved = true;
      if (!this.link.approve()) { void this.finish('unknown'); return; }
      this.armSetup();
    } else if (event.code === 'cast.media_ready') {
      if (!this.passed || !this.approved || this.media || this.generation > 1 && (!this.nativeClosed || !this.transitionReady)) { void this.finish('invalid'); return; }
      clearTimeout(this.setupTimer); this.setupTimer = undefined; void this.open();
    } else if (/^cast\.(transition_failed|source_(failed_|invalid_)|media_(issue_|stopped|expired|unavailable|failed))/.test(event.code)) void this.finish('network');
    else {
      const isolated = /^cast\.media_timeout_isolated_g([1-9][0-9]{0,9})$/.exec(event.code);
      if (isolated && Number(isolated[1]) === this.generation) {
        if (!this.media || this.media.player.state !== 'playing' || this.media.player.seeking) void this.finish('network');
        else this.health = { generation: this.generation, ms: this.media.player.timeMs, at: this.clock() };
      }
    }
  }
  private armSetup(): void {
    clearTimeout(this.setupTimer); this.setupTimer = setTimeout(() => { void this.finish('timeout'); }, 10000);
  }
  private async open(): Promise<void> {
    const generation = this.generation; let owned: Media | undefined;
    try {
      const url = `http://127.0.0.1:40324/${this.token}/cast.mp4`;
      const backend = this.createBackend(url, this.initMib === undefined ? undefined : { mib: this.initMib, latestProgress: () => this.readAt });
      if (!backend) throw new DomainError('unsupported');
      if (!backend.closureConfirmed()) { this.decoderUnknown = true; throw new DomainError('unknown'); }
      const player = new PlayerCoordinator(backend);
      const valid = () => !this.closing && this.media?.player === player;
      const receiver = new CastReceiverPlayer(player, url, valid, () => backend.durationMs(), value => {
        if (!valid()) return; this.last = value; if (!this.link.snapshot({ ...value, generation: this.generation })) void this.finish('unknown');
      }, (id, accepted) => { if (valid()) this.link.acknowledge(id, accepted); }, ok => { if (valid()) { if(ok)this.observe('seek_completed');this.link.seekResult(ok); if (!ok) void this.finish('network'); } },fact=>{if(valid()&&this.nativePlayingSeek){if(fact==='seek_target_hit')this.observe('seek_target_hit');else if(fact==='seek_target_window_missed')this.observe('seek_target_missed');}},()=>{},this.clock,this.product&&!this.nativePlayingSeek,()=>{if(valid())this.observe('startup_aligned');},this.nativePlayingSeek,this.idempotentPosition,()=>{if(valid())this.observe('seek_current_position');});
      owned = { backend, player, receiver }; this.media = owned; this.phase = 'preparing';
      const prepared = player.open({ url, kind: 'vod' }); receiver.snapshot();
      await prepared;
      if (!valid()) return;
      player.play();this.observe('autoplay_started'); this.pulse();
    } catch (error) { if (!this.closing && generation === this.generation && (!owned || this.media === owned)) void this.finish(error instanceof DomainError ? error.code : 'network'); }
  }
  private pulse(): void {
    if (this.closing || !this.media) return;
    try {
      const { player, receiver } = this.media; receiver.snapshot();
      if (player.state === 'error') { void this.finish('network'); return; }
      if (player.state === 'idle' && !this.media.backend.closureConfirmed()) { this.decoderUnknown = true; void this.finish('unknown'); return; }
      this.phase = player.state === 'ready' ? 'preparing' : player.state;
      const proof = this.health;
      if (proof && proof.generation === this.generation) {
        const now = this.clock();
        if (!Number.isFinite(now) || now < proof.at) { void this.finish('unknown'); return; }
        if (player.state !== 'playing' || player.seeking || player.timeMs !== proof.ms) { proof.at = now; proof.ms = player.timeMs; }
        else if (now - proof.at >= 5000) void this.finish('network');
      }
    } catch { void this.finish('unknown'); }
  }
  toggle(): void {
    const media = this.media; if (this.closing || !media || !media.receiver.takeRemote()) return;
    try { if (media.player.state === 'playing') media.player.pause(); else if (media.player.state === 'paused') media.player.play(); this.pulse(); }
    catch { void this.finish('network'); }
  }
  async seek(timeMs: number): Promise<void> {
    const media = this.media;
    if (this.closing || !media || !Number.isSafeInteger(timeMs) || timeMs < 0 || media.receiver.knownDurationMs > 0 && timeMs >= media.receiver.knownDurationMs || !media.receiver.takeRemote()) throw new DomainError('invalid');
    const resume = media.player.state === 'playing';
    const pauseForSeek=resume&&(!this.nativePlayingSeek||timeMs===0);
    try {
      if (pauseForSeek) media.player.pause(); const pending = media.player.seek(timeMs); media.receiver.snapshot(); await pending;
      if (this.closing || this.media !== media) return;
      if (pauseForSeek) media.player.play(); this.pulse();
    } catch (error) { if (!this.closing && this.media === media) void this.finish('network'); throw error; }
  }
  handBack(): void { if (!this.closing) { this.media?.receiver.handBack(); this.pulse(); } }
  private closeDecoder(media: Media | undefined): boolean {
    if (!media) return !this.decoderUnknown;
    try { media.player.close(); return media.backend.closureConfirmed(); } catch { return false; }
  }
  private async finish(error?: ErrorCode): Promise<void> {
    if (this.closing) return;
    const closure = await this.close(); this.finished(error, closure);
  }
  close(): Promise<MediaClosure> {
    if (this.closing) return this.closing;
    let resolve!: (value: MediaClosure) => void; this.closing = new Promise(yes => { resolve = yes; });
    clearInterval(this.timer); clearTimeout(this.setupTimer); this.phase = 'closing'; this.health = undefined;
    const media = this.media; this.media = undefined;
    const decoderClosed = this.closeDecoder(media) && !this.decoderUnknown;
    this.controller.abort();
    void (async () => {
      let timer: ReturnType<typeof setTimeout> | undefined, transportClosed = false;
      try { await Promise.race([Promise.resolve().then(() => this.link.close()), new Promise<never>((_yes, no) => { timer = setTimeout(() => no(new DomainError('timeout')), this.closeMs); })]); transportClosed = true; }
      catch { /* Worker termination alone is not a native ACK. */ } finally { clearTimeout(timer); }
      this.phase = 'closed'; this.last = undefined;
      resolve(Object.freeze({ closed: decoderClosed && transportClosed, decoderClosed, transportClosed }));
    })();
    return this.closing;
  }
}
