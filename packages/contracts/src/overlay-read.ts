import { DomainError, record, parseScope, text, type Scope, type ErrorCode } from './index.ts';
import { vodBvid, vodInteger, vodKeys } from './vod-catalog.ts';
import { pgcId } from './pgc-season.ts';
import { parsePrivateAccount, type PrivateAccount } from './private-account.ts';
import { parseSubtitleCues } from './media-overlays.ts';
import type { OverlayCommand, OverlayDanmaku, OverlayTarget, OverlayValue, SubtitleTrack } from './overlay-dto.ts';
import { MAX_DANMAKU_SEGMENT, MAX_MEDIA_MS } from './media-limits.ts';
export type { OverlayAccess, OverlayCommand, OverlayDanmaku, OverlayTarget, OverlayValue, SubtitleTrack } from './overlay-dto.ts';
export interface OverlayRequest { version: 1; operation: 'media-overlay-read'; scope: Scope; target: OverlayTarget; command: OverlayCommand; account?: PrivateAccount; }
export type OverlayResult = { version: 1; operation: 'media-overlay-read'; scope: Scope; closed: true } & ({ kind: 'ok'; value: OverlayValue } | { kind: 'error'; code: ErrorCode });
export function parseSubtitleTrack(value: unknown): SubtitleTrack {
  const v = record(value); vodKeys(v, ['key', 'language', 'label', 'automatic']);
  if (typeof v.key !== 'string' || !/^s(?:0|[1-9][0-9]?)$/.test(v.key) || typeof v.language !== 'string' || !/^[A-Za-z0-9_-]{1,32}$/.test(v.language) || typeof v.automatic !== 'boolean') throw new DomainError('invalid');
  return { key: v.key, language: v.language, label: text(v.label, 80), automatic: v.automatic };
}
export function parseOverlayTarget(value: unknown): OverlayTarget {
  const v = record(value); vodKeys(v, ['bvid', 'part', ...(v.seasonId === undefined ? [] : ['seasonId'])]);
  return { bvid: vodBvid(v.bvid), part: vodInteger(v.part, 1, v.seasonId === undefined ? 10000 : 1), ...(v.seasonId === undefined ? {} : { seasonId: pgcId(v.seasonId) }) };
}
export function parseOverlayCommand(value: unknown): OverlayCommand {
  const v = record(value);
  if (v.kind === 'metadata') { vodKeys(v, ['kind']); return { kind: 'metadata' }; }
  if (v.kind === 'subtitles') { vodKeys(v, ['kind', 'track']); return { kind: 'subtitles', track: parseSubtitleTrack(v.track) }; }
  if (v.kind === 'danmaku') { vodKeys(v, ['kind', 'segment']); return { kind: 'danmaku', segment: vodInteger(v.segment, 1, MAX_DANMAKU_SEGMENT) }; }
  throw new DomainError('invalid');
}
export function parseOverlayDanmaku(value: unknown): OverlayDanmaku[] {
  if (!Array.isArray(value) || value.length > 20000) throw new DomainError('invalid');
  const ids = new Set<string>(); let total = 0;
  return value.map(raw => {
    const v = record(raw); vodKeys(v, ['id', 'timeMs', 'mode', 'color', 'content']); const id = text(v.id, 128), content = text(v.content, 512);
    if (ids.has(id) || !['scroll', 'top', 'bottom'].includes(String(v.mode)) || typeof v.timeMs !== 'number' || !Number.isFinite(v.timeMs) || v.timeMs < 0 || v.timeMs > MAX_MEDIA_MS || (total += content.length) > 2097152) throw new DomainError('invalid');
    ids.add(id); return { id, timeMs: v.timeMs, mode: v.mode as OverlayDanmaku['mode'], color: vodInteger(v.color, 0, 0xffffff), content };
  }).sort((a, b) => a.timeMs - b.timeMs);
}
export function parseOverlayValue(value: unknown): OverlayValue {
  const v = record(value);
  if (v.kind === 'metadata') {
    vodKeys(v, ['kind', 'tracks', 'loginRequired']); if (!Array.isArray(v.tracks) || v.tracks.length > 64 || typeof v.loginRequired !== 'boolean') throw new DomainError('invalid');
    const tracks = v.tracks.map(parseSubtitleTrack); if (tracks.some((t, i) => t.key !== `s${i}`)) throw new DomainError('invalid');
    return { kind: 'metadata', tracks, loginRequired: v.loginRequired };
  }
  if (v.kind === 'subtitles') { vodKeys(v, ['kind', 'cues']); return { kind: 'subtitles', cues: parseSubtitleCues(v.cues) }; }
  if (v.kind === 'danmaku') { vodKeys(v, ['kind', 'items']); return { kind: 'danmaku', items: parseOverlayDanmaku(v.items) }; }
  throw new DomainError('invalid');
}
export function parseOverlayRequest(value: unknown): OverlayRequest {
  const v = record(value); vodKeys(v, ['version', 'operation', 'scope', 'target', 'command', ...(v.account === undefined ? [] : ['account'])]);
  if (v.version !== 1 || v.operation !== 'media-overlay-read') throw new DomainError('invalid');
  const scope = parseScope(v.scope); if (Object.keys(record(v.scope)).length !== 4) throw new DomainError('invalid');
  const account = v.account === undefined ? undefined : parsePrivateAccount(v.account);
  if (scope.accountId !== (account?.id ?? 'guest')) throw new DomainError('invalid');
  return { version: 1, operation: 'media-overlay-read', scope, target: parseOverlayTarget(v.target), command: parseOverlayCommand(v.command), ...(account ? { account } : {}) };
}
export function parseOverlayResult(value: unknown): OverlayResult {
  const v = record(value); vodKeys(v, ['version', 'operation', 'scope', 'closed', 'kind', v.kind === 'ok' ? 'value' : 'code']);
  if (v.version !== 1 || v.operation !== 'media-overlay-read' || v.closed !== true || Object.keys(record(v.scope)).length !== 4) throw new DomainError('invalid');
  const scope = parseScope(v.scope), base = { version: 1 as const, operation: 'media-overlay-read' as const, scope, closed: true as const };
  if (v.kind === 'ok') return { ...base, kind: 'ok', value: parseOverlayValue(v.value) };
  if (v.kind !== 'error' || !['invalid', 'cancelled', 'timeout', 'network', 'login', 'permission', 'unsupported', 'unknown'].includes(String(v.code))) throw new DomainError('invalid');
  return { ...base, kind: 'error', code: v.code as ErrorCode };
}
