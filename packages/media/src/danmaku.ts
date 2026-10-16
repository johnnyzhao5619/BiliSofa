import { DomainError, finite, record, text } from '../../contracts/src/index.ts';
export interface Danmaku { id: string; timeMs: number; mode: 'scroll' | 'top' | 'bottom'; color: number; content: string; }
// Controlled normalized records. Protobuf/XML transport decoding is still an integration gate.
export function parseDanmaku(value: unknown): Danmaku[] {
  if (!Array.isArray(value) || value.length > 20000) throw new DomainError('invalid');
  const ids = new Set<string>();
  return value.map<Danmaku>(item => {
    const v = record(item);
    const id = text(v.id); if (ids.has(id)) throw new DomainError('invalid'); ids.add(id);
    const mode = v.mode;
    if (mode !== 'scroll' && mode !== 'top' && mode !== 'bottom') throw new DomainError('unsupported');
    const color = finite(v.color, 0, 0xffffff); if (!Number.isInteger(color)) throw new DomainError('invalid');
    return { id, timeMs: finite(v.timeMs, 0, 86400000), mode, color, content: text(v.content, 512) };
  }).sort((a, b) => a.timeMs - b.timeMs);
}
export class DanmakuTimeline {
  private records: Danmaku[] = [];
  replace(records: Danmaku[]): void { this.records = parseDanmaku(records); }
  frame(timeMs: number, filters: readonly string[], limit: number): Danmaku[] {
    finite(timeMs, 0, 86400000); finite(limit, 1, 128);
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
