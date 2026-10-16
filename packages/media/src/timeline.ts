import { DomainError, finite, record, text } from '../../contracts/src/index.ts';
export interface Cue { id: string; startMs: number; endMs: number; content: string; }
export function parseSubtitle(value: unknown): Cue[] {
  const body = record(value).body;
  if (!Array.isArray(body) || body.length > 10000) throw new DomainError('invalid');
  return body.map((item, index) => {
    const v = record(item);
    const startMs = finite(v.from, 0, 86400) * 1000;
    const endMs = finite(v.to, 0, 86400) * 1000;
    if (endMs <= startMs) throw new DomainError('invalid');
    return { id: `subtitle-${index}`, startMs, endMs, content: text(v.content, 2048) };
  }).sort((a, b) => a.startMs - b.startMs);
}
export class OverlayTimeline {
  private cues: Cue[] = [];
  replace(cues: Cue[]): void {
    if (cues.length > 10000) throw new DomainError('invalid');
    this.cues = cues.map(cue => {
      if (!Number.isFinite(cue.startMs) || !Number.isFinite(cue.endMs) || cue.startMs < 0 || cue.endMs <= cue.startMs) throw new DomainError('invalid');
      return { ...cue, content: text(cue.content, 2048) };
    }).sort((a, b) => a.startMs - b.startMs);
  }
  at(mediaTimeMs: number, offsetMs = 0, max = 32): Cue[] {
    finite(mediaTimeMs, 0, 86400000); finite(offsetMs, -60000, 60000); finite(max, 1, 64);
    const timeMs = mediaTimeMs - offsetMs;
    const active: Cue[] = [];
    for (const cue of this.cues) {
      if (cue.startMs > timeMs) break;
      if (cue.endMs > timeMs && active.length < max) active.push(cue);
    }
    return active;
  }
  clear(): void { this.cues = []; }
}
