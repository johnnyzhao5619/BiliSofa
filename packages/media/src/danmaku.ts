import { DomainError, finite } from '../../contracts/src/index.ts';
import { parseOverlayDanmaku, type OverlayDanmaku } from '../../contracts/src/overlay-read.ts';
import { MAX_MEDIA_MS } from '../../contracts/src/media-limits.ts';
export type Danmaku = OverlayDanmaku;
// Controlled normalized records. Protobuf/XML transport decoding is still an integration gate.
export function parseDanmaku(value: unknown): Danmaku[] {
  if (Array.isArray(value) && value.some(v => v && typeof v === 'object' && 'mode' in v && !['scroll', 'top', 'bottom'].includes(String(v.mode)))) throw new DomainError('unsupported');
  return parseOverlayDanmaku(value);
}
export class DanmakuTimeline {
  private records: Danmaku[] = [];
  replace(records: Danmaku[]): void { this.records = parseDanmaku(records); }
  frame(timeMs: number, filters: readonly string[], limit: number): Danmaku[] {
    finite(timeMs, 0, MAX_MEDIA_MS); finite(limit, 1, 128);
    if (filters.length > 64 || filters.some(term => typeof term !== 'string' || term.length > 80)) throw new DomainError('invalid');
    // Media-time window resets naturally on seek/part replacement and does not advance while paused.
    const active: Danmaku[] = [];
    for (const record of this.records) {
      if (record.timeMs > timeMs) break;
      const durationMs = record.mode === 'scroll' ? 8000 : 4000;
      if (timeMs < record.timeMs + durationMs && !filters.some(term => term && record.content.includes(term))) active.push(record);
      if (active.length > limit) active.shift();
    }
    return active;
  }
  clear(): void { this.records = []; }
}
