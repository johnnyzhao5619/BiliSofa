import { DomainError, finite, type ErrorCode } from '../../contracts/src/index.ts';
import { overlayDefaults, parseOverlayBinding, parseOverlayPreferences, parseSubtitleCues, type OverlayBinding, type OverlayPreferences, type SubtitleCue } from '../../contracts/src/media-overlays.ts';
import { parseDanmaku, type Danmaku } from './danmaku.ts';
import { OverlayTimeline, parseSubtitle } from './timeline.ts';
import { MAX_MEDIA_MS } from '../../contracts/src/media-limits.ts';

export interface OverlayViewport { width: number; height: number; }
export interface OverlayText { id: string; content: string; color: number; x: number; y: number; width: number; }
export interface OverlayFrame { danmaku: OverlayText[]; subtitles: SubtitleCue[]; preferences: OverlayPreferences; }
export interface OverlayReadState { state: 'idle' | 'loading' | 'ready' | 'empty' | 'error'; code?: ErrorCode; }
export type OverlayRead = (binding: Readonly<OverlayBinding>, signal: AbortSignal) => Promise<unknown>;
interface Placed { item: Danmaku; y: number; width: number; endMs: number; }
interface Request { controller: AbortController; binding: OverlayBinding; expired: boolean; }
function viewport(value: OverlayViewport): void {
  finite(value.width, 320, 7680); finite(value.height, 180, 4320);
  if (!Number.isInteger(value.width) || !Number.isInteger(value.height)) throw new DomainError('invalid');
}
/** Passive, per-source state. No wall-clock playback extrapolation, network,
 * platform globals, animation timers, or account writes. Only reads have a
 * deadline; private adapters still own actual native close acknowledgement. */
export class OverlaySession {
  private binding: OverlayBinding | undefined;
  private readonly reads = new Map<'danmaku' | 'subtitles', Request>();
  private states = { danmaku: { state: 'idle' } as OverlayReadState, subtitles: { state: 'idle' } as OverlayReadState };
  private preferences = overlayDefaults();
  private records: Danmaku[] = [];
  private readonly subtitles = new OverlayTimeline();
  private layout: Placed[] = [];
  private layoutKey = '';
  private closed = false;
  constructor(private readonly readBudgetMs = 12000) {
    if (!Number.isInteger(readBudgetMs) || readBudgetMs < 1 || readBudgetMs > 60000) throw new DomainError('invalid');
  }
  bind(value: OverlayBinding): void {
    if (this.closed) throw new DomainError('cancelled');
    const binding = parseOverlayBinding(value);
    this.cancel(); this.binding = binding; this.records = []; this.subtitles.clear(); this.layout = []; this.layoutKey = '';
    this.states = { danmaku: { state: 'idle' }, subtitles: { state: 'idle' } };
  }
  configure(value: OverlayPreferences): void {
    if (this.closed) throw new DomainError('cancelled');
    this.preferences = parseOverlayPreferences(value); this.layoutKey = '';
  }
  status(): { danmaku: OverlayReadState; subtitles: OverlayReadState; } {
    return { danmaku: { ...this.states.danmaku }, subtitles: { ...this.states.subtitles } };
  }
  loadDanmaku(read: OverlayRead): Promise<void> { return this.load('danmaku', read); }
  loadSubtitles(read: OverlayRead): Promise<void> { return this.load('subtitles', read); }
  loadSubtitleCues(read: OverlayRead): Promise<void> { return this.load('subtitles', read, true); }
  private async load(kind: 'danmaku' | 'subtitles', read: OverlayRead, normalized = false): Promise<void> {
    if (!this.binding || this.closed) throw new DomainError('cancelled');
    this.reads.get(kind)?.controller.abort();
    const request = { controller: new AbortController(), binding: this.binding, expired: false }; this.reads.set(kind, request);
    if (kind === 'danmaku') { this.records = []; this.layout = []; this.layoutKey = ''; } else this.subtitles.clear();
    this.states[kind] = { state: 'loading' };
    const current = () => !this.closed && (!request.controller.signal.aborted || request.expired) && this.binding === request.binding && this.reads.get(kind) === request;
    let rejectAbort!: (error: DomainError) => void;
    const cancelled = new Promise<never>((_yes, no) => { rejectAbort = no; });
    const abort = () => rejectAbort(new DomainError(request.expired ? 'timeout' : 'cancelled'));
    request.controller.signal.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => { request.expired = true; request.controller.abort(); }, this.readBudgetMs);
    try {
      const raw = await Promise.race([read(Object.freeze({ ...request.binding }), request.controller.signal), cancelled]);
      if (!current()) return;
      if (kind === 'danmaku') {
        const records = parseDanmaku(raw); this.records = records; this.states[kind] = { state: records.length ? 'ready' : 'empty' };
      } else {
        const cues = normalized ? parseSubtitleCues(raw) : parseSubtitle(raw); this.subtitles.replace(cues); this.states[kind] = { state: cues.length ? 'ready' : 'empty' };
      }
    } catch (error) {
      if (current()) this.states[kind] = { state: 'error', code: error instanceof DomainError ? error.code : 'network' };
    } finally { clearTimeout(timer); request.controller.signal.removeEventListener('abort', abort); if (this.reads.get(kind) === request) this.reads.delete(kind); }
  }
  private place(view: OverlayViewport): void {
    const d = this.preferences.danmaku, key = JSON.stringify([view.width, view.height, d]);
    if (this.layoutKey === key) return;
    const line = Math.ceil(d.fontSize * 1.4), rows = Math.min(64, Math.floor(view.height * d.area / line)), lanes: (Placed | undefined)[] = Array.from({ length: rows });
    const layout: Placed[] = [];
    for (const item of this.records) {
      if (d.filters.some(word => item.content.includes(word))) continue;
      const width = Math.min(view.width * 2, Math.ceil(Array.from(item.content).reduce((sum, ch) => sum + (ch.codePointAt(0)! < 128 ? .65 : 1.2), 0) * d.fontSize));
      const speed = (view.width + width) / 8000;
      for (let n = 0; n < rows; n++) {
        const lane = item.mode === 'bottom' ? rows - 1 - n : n, previous = lanes[lane];
        if (previous && previous.endMs > item.timeMs) {
          if (previous.item.mode !== 'scroll' || item.mode !== 'scroll') continue;
          const oldSpeed = (view.width + previous.width) / 8000;
          // Linear motion: both ends of the common interval must preserve a gap.
          if ((item.timeMs - previous.item.timeMs) * oldSpeed - previous.width < 16 || view.width - (previous.endMs - item.timeMs) * speed < 16) continue;
        }
        const placed = { item, y: lane * line, width, endMs: item.timeMs + (item.mode === 'scroll' ? 8000 : 4000) };
        lanes[lane] = placed; layout.push(placed); break;
      }
    }
    this.layout = layout; this.layoutKey = key;
  }
  frame(timeMs: number, state: 'playing' | 'paused' | 'seeking' | 'loading' | 'ended' | 'error' | 'closed', view: OverlayViewport, motionTimeMs = timeMs): OverlayFrame {
    finite(timeMs, 0, MAX_MEDIA_MS); viewport(view);
    finite(motionTimeMs, 0, MAX_MEDIA_MS);
    if (!['playing', 'paused', 'seeking', 'loading', 'ended', 'error', 'closed'].includes(state)) throw new DomainError('invalid');
    const preferences = parseOverlayPreferences(this.preferences), danmaku: OverlayText[] = [];
    if (this.closed || !this.binding || !['playing', 'paused'].includes(state)) return { danmaku, subtitles: [], preferences };
    if (preferences.danmaku.enabled) {
      this.place(view);
      // Only the preceding eight seconds can be visible. Layout stays stable on
      // pause/seek and is recomputed only for source, viewport or setting changes.
      let lo = 0, hi = this.layout.length;
      while (lo < hi) { const mid = (lo + hi) >>> 1; if (this.layout[mid]!.item.timeMs < motionTimeMs - 8000) lo = mid + 1; else hi = mid; }
      for (let i = lo; i < this.layout.length; i++) {
        const p = this.layout[i]!, item = p.item; if (item.timeMs > motionTimeMs) break;
        if (danmaku.length >= preferences.danmaku.density) break;
        if (motionTimeMs >= p.endMs) continue;
        danmaku.push({ id: item.id, content: item.content, color: item.color, x: item.mode === 'scroll' ? view.width - (motionTimeMs - item.timeMs) / 8000 * (view.width + p.width) : Math.max(0, (view.width - p.width) / 2), y: p.y, width: p.width });
      }
    }
    return { danmaku, subtitles: preferences.subtitles.enabled ? this.subtitles.at(timeMs, preferences.subtitles.offsetMs, 4) : [], preferences };
  }
  private cancel(): void { for (const request of this.reads.values()) request.controller.abort(); this.reads.clear(); }
  close(): void {
    if (this.closed) return;
    this.closed = true; this.cancel(); this.binding = undefined; this.records = []; this.layout = []; this.subtitles.clear();
    this.states = { danmaku: { state: 'idle' }, subtitles: { state: 'idle' } };
  }
}
