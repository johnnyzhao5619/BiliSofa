import { DomainError, finite, record } from '../../contracts/src/index.ts';
import { parseSubtitleCues, subtitleText, type SubtitleCue } from '../../contracts/src/media-overlays.ts';
import { MAX_MEDIA_MS, MAX_MEDIA_SECONDS } from '../../contracts/src/media-limits.ts';
export type Cue = SubtitleCue;
export function parseSubtitle(value: unknown): Cue[] {
  const body = record(value).body;
  if (!Array.isArray(body) || body.length > 10000) throw new DomainError('invalid');
  return parseSubtitleCues(body.map((item, index) => {
    const v = record(item);
    const startMs = finite(v.from, 0, MAX_MEDIA_SECONDS) * 1000;
    const endMs = finite(v.to, 0, MAX_MEDIA_SECONDS) * 1000;
    if (endMs <= startMs) throw new DomainError('invalid');
    return { id: `subtitle-${index}`, startMs, endMs, content: subtitleText(v.content) };
  }));
}
export class OverlayTimeline {
  private cues: Cue[] = [];
  replace(cues: Cue[]): void {
    this.cues = parseSubtitleCues(cues);
  }
  at(mediaTimeMs: number, offsetMs = 0, max = 32): Cue[] {
    finite(mediaTimeMs, 0, MAX_MEDIA_MS); finite(offsetMs, -60000, 60000); finite(max, 1, 64);
    if (!Number.isInteger(max)) throw new DomainError('invalid');
    const timeMs = mediaTimeMs - offsetMs;
    const active: Cue[] = [];
    for (const cue of this.cues) {
      if (cue.startMs > timeMs) break;
      if (cue.endMs > timeMs && active.length < max) active.push({ ...cue });
    }
    return active;
  }
  clear(): void { this.cues = []; }
}
