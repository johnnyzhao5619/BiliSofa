import { DomainError, BATCH_MESSAGE_BYTES, boundedMessage, parsePopularRequest, type PopularRequest } from './index.ts';
import { parseRankingRequest, type RankingRequest } from './ranking.ts';
import { parseSearchRequest, type SearchRequest } from './search.ts';
import { parseUserSearchRequest, type UserSearchRequest } from './user-search.ts';
import { parsePgcSearchRequest, type PgcSearchRequest } from './pgc-search.ts';
import { parseHotSearchRequest, type HotSearchRequest } from './hot-search.ts';
/** ADR-108: one request to the resident public kernel. `page` is the upstream batch (1-5, 20 rows). */
export type KernelRequest = PopularRequest | RankingRequest | SearchRequest | UserSearchRequest | PgcSearchRequest | HotSearchRequest;
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
