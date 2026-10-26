import { DomainError, BATCH_MESSAGE_BYTES, boundedMessage, popularScope, parsePopularRequest, record, text, type ErrorCode, type PopularRequest, type Scope } from './index.ts';
import { parseVodAbout, type VodAbout } from './vod-catalog.ts';
import { parseRankingRequest, type RankingRequest } from './ranking.ts';
import { parseSearchRequest, type SearchRequest } from './search.ts';
import { parseUserSearchRequest, type UserSearchRequest } from './user-search.ts';
import { parsePgcSearchRequest, type PgcSearchRequest } from './pgc-search.ts';
import { parseHotSearchRequest, type HotSearchRequest } from './hot-search.ts';
/** ADR-110: the public video view behind the detail page (parts and facts); never playurl, player or CDN. */
export interface VideoViewRequest { version: 1; scope: Scope; operation: 'public-video-view'; bvid: string; }
export interface VideoViewDetail { partCount: number; parts: { part: number; title: string; durationMs: number }[]; owner?: string; about?: VodAbout; }
export type VideoViewResult = { version: 1; scope: Scope; operation: 'public-video-view'; closed: true } & ({ kind: 'ok'; detail: VideoViewDetail } | { kind: 'error'; code: ErrorCode });
/** The detail page lists at most this many parts; the count of all of them travels alongside. */
export const VIEW_PARTS = 48;
const bvid = (value: unknown) => { if (typeof value !== 'string' || !/^BV[A-Za-z0-9]{10}$/.test(value)) throw new DomainError('invalid'); return value; };
export function parseVideoViewRequest(value: unknown): VideoViewRequest {
  const v = boundedMessage(value);
  if (Object.keys(v).length !== 4 || v.version !== 1 || v.operation !== 'public-video-view') throw new DomainError('invalid');
  return { version: 1, scope: popularScope(v.scope), operation: 'public-video-view', bvid: bvid(v.bvid) };
}
export function parseVideoViewResult(value: unknown): VideoViewResult {
  const v = boundedMessage(value, BATCH_MESSAGE_BYTES);
  if (v.version !== 1 || v.operation !== 'public-video-view' || v.closed !== true) throw new DomainError('invalid');
  const base = { version: 1 as const, scope: popularScope(v.scope), operation: 'public-video-view' as const, closed: true as const };
  if (v.kind === 'error' && Object.keys(v).length === 6 && ['invalid', 'cancelled', 'timeout', 'network', 'login', 'permission', 'unsupported', 'unknown'].includes(String(v.code))) return { ...base, kind: 'error', code: v.code as ErrorCode };
  if (v.kind !== 'ok' || Object.keys(v).length !== 6) throw new DomainError('invalid');
  const d = record(v.detail), keys = ['partCount', 'parts', 'owner', 'about'];
  if (Object.keys(d).some(k => !keys.includes(k)) || !Number.isSafeInteger(d.partCount) || Number(d.partCount) < 1 || Number(d.partCount) > 10000 || !Array.isArray(d.parts) || !d.parts.length || d.parts.length > Math.min(VIEW_PARTS, Number(d.partCount))) throw new DomainError('invalid');
  const parts = d.parts.map(raw => { const p = record(raw); if (Object.keys(p).length !== 3 || !Number.isSafeInteger(p.part) || Number(p.part) < 1 || Number(p.part) > 10000 || !Number.isSafeInteger(p.durationMs) || Number(p.durationMs) < 0 || Number(p.durationMs) > 86400000) throw new DomainError('invalid'); return { part: Number(p.part), title: text(p.title, 120), durationMs: Number(p.durationMs) }; });
  return { ...base, kind: 'ok', detail: { partCount: Number(d.partCount), parts, ...(d.owner === undefined ? {} : { owner: text(d.owner, 48) }), ...(d.about === undefined ? {} : { about: parseVodAbout(d.about) }) } };
}
/** ADR-108: one request to the resident public kernel. `page` is the upstream batch (1-5, 20 rows). */
export type KernelRequest = PopularRequest | RankingRequest | SearchRequest | UserSearchRequest | PgcSearchRequest | HotSearchRequest | VideoViewRequest;
export type KernelSearchRequest = SearchRequest | UserSearchRequest | PgcSearchRequest;
export interface WbiKeys { img: string; sub: string; }
export type KernelCommand =
  | { version: 1; type: 'request'; requestId: string; request: KernelRequest; keys?: WbiKeys }
  | { version: 1; type: 'stop'; requestId: string }
  | { version: 1; type: 'close' };
/** `result` keeps the existing lane result shape; it is checked again by the lane's own parser. */
export type KernelEvent =
  | { version: 1; type: 'ready' }
  | { version: 1; type: 'failed' }
  | { version: 1; type: 'result'; requestId: string; result: Record<string, unknown>; keys?: WbiKeys }
  | { version: 1; type: 'stopped'; requestId: string }
  | { version: 1; type: 'closed'; confirmed: boolean };
export const KERNEL_BATCHES = 5;
const requestId = (value: unknown) => { if (typeof value !== 'string' || !/^k[0-9]{1,9}$/.test(value)) throw new DomainError('invalid'); return value; };
const keyText = (value: unknown) => { if (typeof value !== 'string' || !/^[0-9a-f]{32}$/.test(value)) throw new DomainError('invalid'); return value; };
export function parseWbiKeys(value: unknown): WbiKeys {
  const v = boundedMessage(value);
  if (Object.keys(v).length !== 2) throw new DomainError('invalid');
  return { img: keyText(v.img), sub: keyText(v.sub) };
}
export const isSearchRequest = (request: KernelRequest): request is KernelSearchRequest =>
  request.operation === 'public-video-search' || request.operation === 'public-user-search' || request.operation === 'public-pgc-search';
export function parseKernelRequest(value: unknown): KernelRequest {
  const operation = boundedMessage(value).operation;
  const request: KernelRequest = operation === 'guest-popular' ? parsePopularRequest(value)
    : operation === 'public-video-search' ? parseSearchRequest(value)
    : operation === 'public-user-search' ? parseUserSearchRequest(value)
    : operation === 'public-pgc-search' ? parsePgcSearchRequest(value)
    : operation === 'public-search-hot' ? parseHotSearchRequest(value)
    : operation === 'public-video-view' ? parseVideoViewRequest(value)
    : parseRankingRequest(value);
  if ((request.operation === 'guest-popular' || isSearchRequest(request)) && request.page > KERNEL_BATCHES) throw new DomainError('invalid');
  return request;
}
export function parseKernelCommand(value: unknown): KernelCommand {
  const v = boundedMessage(value);
  if (v.version !== 1) throw new DomainError('invalid');
  if (v.type === 'close' && Object.keys(v).length === 2) return { version: 1, type: 'close' };
  if (v.type === 'stop' && Object.keys(v).length === 3) return { version: 1, type: 'stop', requestId: requestId(v.requestId) };
  if (v.type !== 'request' || Object.keys(v).some(k => !['version', 'type', 'requestId', 'request', 'keys'].includes(k))) throw new DomainError('invalid');
  const request = parseKernelRequest(v.request);
  if (v.keys !== undefined && !isSearchRequest(request)) throw new DomainError('invalid');
  return { version: 1, type: 'request', requestId: requestId(v.requestId), request, ...(v.keys === undefined ? {} : { keys: parseWbiKeys(v.keys) }) };
}
export function parseKernelEvent(value: unknown): KernelEvent {
  // Ranking batches carry up to 100 cards; their lane parser keeps its own 128 KiB bound.
  const v = boundedMessage(value, 4 * BATCH_MESSAGE_BYTES + 4096);
  if (v.version !== 1) throw new DomainError('invalid');
  const keys = Object.keys(v);
  if ((v.type === 'ready' || v.type === 'failed') && keys.length === 2) return { version: 1, type: v.type };
  if (v.type === 'stopped' && keys.length === 3) return { version: 1, type: 'stopped', requestId: requestId(v.requestId) };
  if (v.type === 'closed' && keys.length === 3 && typeof v.confirmed === 'boolean') return { version: 1, type: 'closed', confirmed: v.confirmed };
  if (v.type !== 'result' || keys.some(k => !['version', 'type', 'requestId', 'result', 'keys'].includes(k)) || !v.result || typeof v.result !== 'object' || Array.isArray(v.result)) throw new DomainError('invalid');
  return { version: 1, type: 'result', requestId: requestId(v.requestId), result: v.result as Record<string, unknown>, ...(v.keys === undefined ? {} : { keys: parseWbiKeys(v.keys) }) };
}
