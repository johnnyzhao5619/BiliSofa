import { DomainError, finite, record, text } from './index.ts';
import { localOwner } from './local-profile.ts';

import type { OverlayBinding, OverlayPreferences, SubtitleCue } from './overlay-dto.ts';
export type { OverlayBinding, OverlayPreferences, SubtitleCue } from './overlay-dto.ts';
function keys(value: Record<string, unknown>, allowed: readonly string[]): void {
  if (Object.keys(value).length !== allowed.length || Object.keys(value).some(k => !allowed.includes(k))) throw new DomainError('invalid');
}
function integer(value: unknown, low: number, high: number): number {
  const n = finite(value, low, high); if (!Number.isInteger(n)) throw new DomainError('invalid'); return n;
}
export function parseOverlayBinding(value: unknown): OverlayBinding {
  const v = record(value); keys(v, ['accountId', 'generation', 'mediaSessionId', 'itemKey']);
  const mediaSessionId = text(v.mediaSessionId, 96), itemKey = text(v.itemKey, 96);
  if (![mediaSessionId, itemKey].every(s => /^[A-Za-z0-9_.:-]+$/.test(s))) throw new DomainError('invalid');
  return { accountId: localOwner(v.accountId), generation: integer(v.generation, 0, Number.MAX_SAFE_INTEGER), mediaSessionId, itemKey };
}
/** Plain subtitle text may contain line breaks, never embedded control bytes. */
export function subtitleText(value: unknown): string {
  if (typeof value !== 'string' || value.length < 1 || value.length > 2048 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) throw new DomainError('invalid');
  return value.replace(/\r\n?/g, '\n');
}
export function parseSubtitleCues(value: unknown): SubtitleCue[] {
  if (!Array.isArray(value) || value.length > 10000) throw new DomainError('invalid');
  const ids = new Set<string>(); let total = 0;
  return value.map(item => {
    const v = record(item); keys(v, ['id', 'startMs', 'endMs', 'content']);
    const id = text(v.id, 96), startMs = finite(v.startMs, 0, 86400000), endMs = finite(v.endMs, 0, 86400000), content = subtitleText(v.content);
    total += content.length;
    if (ids.has(id) || endMs <= startMs || total > 2097152) throw new DomainError('invalid'); ids.add(id);
    return { id, startMs, endMs, content };
  }).sort((a, b) => a.startMs - b.startMs);
}
export function overlayDefaults(): OverlayPreferences {
  return { schema: 1, danmaku: { enabled: true, fontSize: 32, opacity: 1, density: 24, area: .5, filters: [] }, subtitles: { enabled: true, fontSize: 40, offsetMs: 0, language: 'auto' } };
}
export function parseOverlayPreferences(value: unknown): OverlayPreferences {
  const v = record(value);
  if (v.schema !== 1) throw new DomainError('unsupported');
  keys(v, ['schema', 'danmaku', 'subtitles']);
  const d = record(v.danmaku), s = record(v.subtitles);
  keys(d, ['enabled', 'fontSize', 'opacity', 'density', 'area', 'filters']); keys(s, ['enabled', 'fontSize', 'offsetMs', ...(s.language === undefined ? [] : ['language'])]);
  if (typeof d.enabled !== 'boolean' || typeof s.enabled !== 'boolean' || ![.25, .5, 1].includes(Number(d.area)) || typeof d.area !== 'number' || !Array.isArray(d.filters) || d.filters.length > 64) throw new DomainError('invalid');
  const filters = d.filters.map(v => text(v, 80)); if (new Set(filters).size !== filters.length) throw new DomainError('invalid');
  const language = s.language === undefined ? 'auto' : text(s.language, 32); if (!/^[A-Za-z0-9_-]+$/.test(language)) throw new DomainError('invalid');
  return { schema: 1, danmaku: { enabled: d.enabled, fontSize: integer(d.fontSize, 24, 64), opacity: finite(d.opacity, .2, 1), density: integer(d.density, 1, 64), area: d.area, filters }, subtitles: { enabled: s.enabled, fontSize: integer(s.fontSize, 24, 72), offsetMs: integer(s.offsetMs, -60000, 60000), language } };
}
