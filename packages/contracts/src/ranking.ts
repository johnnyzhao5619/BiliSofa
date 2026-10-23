import { parseCategoryId, type CategoryId } from './categories.ts';
import { DomainError, boundedMessage, finite, popularScope, record, text, parsePopularCard, type Scope, type PopularCard, type PopularResult } from './index.ts';
export type RankingRequest = { version: 1; scope: Scope; operation: 'public-ranking'; }
  | { version: 1; scope: Scope; operation: 'public-category-ranking'; categoryId: CategoryId; };
export type RankingResult = RankingRequest & {
  closed: true;
  kind: PopularResult['kind']; status: number; apiCode?: number; code: string; items: PopularCard[];
}
export function parseRankingRequest(value: unknown): RankingRequest {
  const v = boundedMessage(value);
  const category = v.operation === 'public-category-ranking';
  if (Object.keys(v).length !== (category ? 4 : 3) || Object.keys(v).some(k => !['version','scope','operation',...(category?['categoryId']:[])].includes(k)) || v.version !== 1 || (!category && v.operation !== 'public-ranking')) throw new DomainError('invalid');
  return category ? { version: 1, scope: popularScope(v.scope), operation: 'public-category-ranking', categoryId: parseCategoryId(v.categoryId) } : { version: 1, scope: popularScope(v.scope), operation: 'public-ranking' };
}
export function parseRankingResult(value: unknown): RankingResult {
  let encoded: string;
  try { encoded = JSON.stringify(value); } catch { throw new DomainError('invalid'); }
  if (!encoded || new TextEncoder().encode(encoded).length > 131072) throw new DomainError('invalid');
  const v = record(value), request = parseRankingRequest({version:v.version,scope:v.scope,operation:v.operation,...('categoryId' in v?{categoryId:v.categoryId}:{})}), status = finite(v.status, 0, 599), code = text(v.code, 64);
  if (Object.keys(v).some(k => !['version','scope','operation','categoryId','closed','kind','status','apiCode','code','items'].includes(k)) || v.version !== 1 || v.closed !== true || !Number.isInteger(status) || (status !== 0 && status < 100) || !['ok','http_error','api_error','invalid_response','transport_error','cancelled'].includes(String(v.kind))) throw new DomainError('invalid');
  if (!Array.isArray(v.items) || v.items.length > 100 || (v.kind !== 'ok' && v.items.length)) throw new DomainError('invalid');
  const items = v.items.map(parsePopularCard);
  if (new Set(items.map(item => item.bvid)).size !== items.length) throw new DomainError('invalid');
  const apiCode = v.apiCode === undefined ? undefined : finite(v.apiCode, -2147483648, 2147483647);
  if (apiCode !== undefined && !Number.isInteger(apiCode)) throw new DomainError('invalid');
  if (v.kind === 'ok' && (status !== 200 || apiCode !== 0 || code !== 'ranking.ok')) throw new DomainError('invalid');
  if (v.kind === 'http_error' && (status === 0 || status === 200 || apiCode !== undefined || code !== `ranking.http_${status}`)) throw new DomainError('invalid');
  if (v.kind === 'api_error' && (status !== 200 || apiCode === undefined || apiCode === 0 || code !== 'ranking.api_error')) throw new DomainError('invalid');
  if (v.kind === 'invalid_response' && (apiCode !== undefined || code !== 'ranking.invalid_response')) throw new DomainError('invalid');
  if (v.kind === 'transport_error' && (apiCode !== undefined || !/^ranking\.(transport_[0-9]{1,3}|native_unavailable)$/.test(code))) throw new DomainError('invalid');
  if (v.kind === 'cancelled' && (status !== 0 || apiCode !== undefined || code !== 'ranking.cancelled')) throw new DomainError('invalid');
  return { ...request, closed: true, kind: v.kind as RankingResult['kind'], status, ...(apiCode === undefined ? {} : { apiCode }), code, items };
}
