import { DomainError, record, text, type ErrorCode, type MediaSource } from './index.ts';
import { parseVodCatalog, parseVodDetailSummary, vodBvid, vodInteger, vodKeys, type VodCatalog, type VodCapabilities, type VodDetail, type VodChoice } from './vod-catalog.ts';
import type { PgcSeason } from './pgc-season.ts';
import type { VideoInteractionAccess } from './video-interactions-dto.ts';
import type { CommentAccess } from './comments-dto.ts';
import type { OverlayAccess, OverlayPreferenceAccess } from './overlay-dto.ts';

export interface VodReadResult { detail: VodDetail; catalog: VodCatalog; }
/** Public capability; its implementation retains private account and source data. */
export interface VodAccess {
  read(query: { bvid: string; part: number }, signal: AbortSignal): Promise<VodReadResult>;
  transport(choice: VodChoice): { run(signal: AbortSignal, ready: (source: MediaSource) => void): Promise<void>; close(): Promise<void> };
  close(): Promise<void>;
  overlays?(catalogId: string): OverlayAccess;
  comments?(catalogId: string): CommentAccess;
  interactions?(catalogId: string): VideoInteractionAccess;
  overlayPreferences?: OverlayPreferenceAccess;
}
export interface PgcAccess extends VodAccess { season(signal: AbortSignal): Promise<PgcSeason>; }
export function parseVodReadResult(value: unknown): VodReadResult {
  const v = record(value); vodKeys(v, ['detail', 'catalog']);
  const result = { detail: parseVodDetailSummary(v.detail), catalog: parseVodCatalog(v.catalog) };
  const part = result.detail.parts[result.catalog.item.part - 1];
  if (!part || part.bvid !== result.catalog.item.bvid || Math.abs(part.durationMs - result.catalog.item.durationMs) > 3000) throw new DomainError('invalid');
  return result;
}
export function parseVodCapabilities(value: unknown): VodCapabilities {
  const v = record(value); vodKeys(v, ['video', 'audio', 'qualities', 'maxWidth', 'maxHeight', 'maxFps', 'rates']);
  function list(raw: unknown, choices: readonly unknown[]): unknown[] {
    if (!Array.isArray(raw) || !raw.length || raw.length > choices.length || new Set(raw).size !== raw.length || raw.some(x => !choices.includes(x))) throw new DomainError('invalid');
    return raw.slice();
  }
  if (!Array.isArray(v.qualities) || !v.qualities.length || v.qualities.length > 127 || new Set(v.qualities).size !== v.qualities.length) throw new DomainError('invalid');
  return { video: list(v.video, ['avc', 'hevc', 'av1']) as VodCapabilities['video'], audio: list(v.audio, ['aac', 'eac3', 'flac']) as VodCapabilities['audio'],
    qualities: v.qualities.map(q => vodInteger(q, 1, 127)), maxWidth: vodInteger(v.maxWidth, 1, 16384), maxHeight: vodInteger(v.maxHeight, 1, 8640),
    maxFps: vodInteger(v.maxFps, 1, 240), rates: list(v.rates, [1, 2]) as VodCapabilities['rates'] };
}
export function vodNonce(value: unknown): string { const s = text(value, 32); if (!/^[a-f0-9]{32}$/.test(s)) throw new DomainError('invalid'); return s; }
export function vodReadQuery(value: unknown): { bvid: string; part: number } {
  const v = record(value); vodKeys(v, ['bvid', 'part']); return { bvid: vodBvid(v.bvid), part: vodInteger(v.part, 1, 10000) };
}
export function vodErrorCode(value: unknown): ErrorCode {
  if (!['invalid', 'cancelled', 'timeout', 'network', 'login', 'permission', 'unsupported', 'unknown'].includes(String(value))) throw new DomainError('invalid');
  return value as ErrorCode;
}
