import { parseCategoryId, type CategoryId } from './categories.ts';
import { DomainError, boundedMessage, finite, popularScope, record, text, parsePopularCard, parseCoverReference, type Scope, type PopularCard, type PopularResult, type CoverReference } from './index.ts';
import { pgcId } from './pgc-season.ts';
import { parseUpArchiveCard, upMid, upPage, type UpArchiveCard } from './up-archives.ts';
import { parseVisitorId, visitorArgument, type VisitorId } from './visitor.ts';
/** One public 番剧 ranking row (ADR-096); a season, not a BV-keyed video card. */
export interface PgcRankCard { seasonId: string; title: string; subtitle: string; rating: string; badge: string; cover?: CoverReference; }
export function parsePgcRankCard(value: unknown): PgcRankCard {
  const v = record(value); if (Object.keys(v).some(k => !['seasonId','title','subtitle','rating','badge','cover'].includes(k))) throw new DomainError('invalid');
  const optional = (x: unknown, max: number) => x === '' ? '' : text(x, max);
  return { seasonId: pgcId(v.seasonId), title: text(v.title, 120), subtitle: optional(v.subtitle, 48), rating: optional(v.rating, 16), badge: optional(v.badge, 16), ...(v.cover === undefined ? {} : { cover: parseCoverReference(v.cover) }) };
}
export type RankingRequest = { version: 1; scope: Scope; operation: 'public-ranking'; }
  /** 0.51.3 (ADR-106): `visitor` is the stored B站 visitor identity for this anonymous read; it never comes back in a result. */
  | { version: 1; scope: Scope; operation: 'public-category-ranking'; categoryId: CategoryId; visitor?: string; }
  | { version: 1; scope: Scope; operation: 'public-pgc-ranking'; seasonType: PgcRankType; span: PgcRankSpan; page: number; }
  /** 0.51.0 (ADR-103): one page of an UP's public uploads. */
  | { version: 1; scope: Scope; operation: 'public-up-archives'; mid: string; page: number; visitor?: string; }
  /** 0.51.3 (ADR-106): obtain B站's anonymous visitor identity (x/frontend/finger/spi), itself without any cookie. */
  | { version: 1; scope: Scope; operation: 'public-visitor'; };
/** 0.50.0 (ADR-098): 番剧 (1) or 国创 (4); public 3-/7-day ranking, or all time by followers (index, pages 1-5). */
export type PgcRankType = 1 | 4;
export type PgcRankSpan = 'day3' | 'week' | 'all';
export type RankingResult = RankingRequest & {
  closed: true;
  kind: PopularResult['kind']; status: number; apiCode?: number; code: string; items: PopularCard[];
  /** Only for public-pgc-ranking; `items` is then empty. */
  seasons?: PgcRankCard[];
  /** Index lane only: the service reports another page. */
  seasonsMore?: boolean;
  /** Only for public-up-archives; `items` is then empty. */
  archives?: UpArchiveCard[];
  /** The UP's total public uploads as the service reports them. */
  archivesTotal?: number;
  /** Only for public-visitor with kind ok. */
  visitorId?: VisitorId;
}
export function parseRankingRequest(value: unknown): RankingRequest {
  const v = boundedMessage(value);
  const visitor = v.visitor !== undefined ? { visitor: visitorArgument(v.visitor) } : {}, extra = 'visitor' in visitor ? 1 : 0;
  if (v.operation === 'public-visitor') {
    if (v.version !== 1 || Object.keys(v).length !== 3 || Object.keys(v).some(k => !['version','scope','operation'].includes(k))) throw new DomainError('invalid');
    return { version: 1, scope: popularScope(v.scope), operation: 'public-visitor' };
  }
  if (v.operation === 'public-up-archives') {
    if (v.version !== 1 || Object.keys(v).length !== 5 + extra || Object.keys(v).some(k => !['version','scope','operation','mid','page',...(extra?['visitor']:[])].includes(k))) throw new DomainError('invalid');
    return { version: 1, scope: popularScope(v.scope), operation: 'public-up-archives', mid: upMid(v.mid), page: upPage(v.page), ...visitor };
  }
  if (v.operation === 'public-pgc-ranking') {
    // Requests without filters (0.49.x) mean 番剧, three days, page 1.
    const seasonType = v.seasonType ?? 1, span = v.span ?? 'day3', page = v.page ?? 1;
    if (v.version !== 1 || Object.keys(v).some(k => !['version','scope','operation','seasonType','span','page'].includes(k)) || (seasonType !== 1 && seasonType !== 4) || !['day3','week','all'].includes(String(span)) || !Number.isInteger(page) || (page as number) < 1 || (page as number) > (span === 'all' ? 5 : 1)) throw new DomainError('invalid');
    return { version: 1, scope: popularScope(v.scope), operation: 'public-pgc-ranking', seasonType: seasonType as PgcRankType, span: span as PgcRankSpan, page: page as number };
  }
  const category = v.operation === 'public-category-ranking';
  if ((!category && extra) || Object.keys(v).length !== (category ? 4 + extra : 3) || Object.keys(v).some(k => !['version','scope','operation',...(category?['categoryId']:[]),...(extra?['visitor']:[])].includes(k)) || v.version !== 1 || (!category && v.operation !== 'public-ranking' && v.operation !== 'public-pgc-ranking')) throw new DomainError('invalid');
  return category ? { version: 1, scope: popularScope(v.scope), operation: 'public-category-ranking', categoryId: parseCategoryId(v.categoryId), ...visitor } : { version: 1, scope: popularScope(v.scope), operation: 'public-ranking' };
}
export function parseRankingResult(value: unknown): RankingResult {
  let encoded: string;
  try { encoded = JSON.stringify(value); } catch { throw new DomainError('invalid'); }
  if (!encoded || new TextEncoder().encode(encoded).length > 131072) throw new DomainError('invalid');
  const v = record(value), request = parseRankingRequest({version:v.version,scope:v.scope,operation:v.operation,...('categoryId' in v?{categoryId:v.categoryId}:{}),...(v.operation==='public-pgc-ranking'?{seasonType:v.seasonType,span:v.span,page:v.page}:{}),...(v.operation==='public-up-archives'?{mid:v.mid,page:v.page}:{})}), status = finite(v.status, 0, 599), code = text(v.code, 64);
  if (Object.keys(v).some(k => !['version','scope','operation','categoryId','seasonType','span','page','closed','kind','status','apiCode','code','items','seasons','seasonsMore','mid','archives','archivesTotal','visitorId'].includes(k)) || v.version !== 1 || v.closed !== true || !Number.isInteger(status) || (status !== 0 && status < 100) || !['ok','http_error','api_error','invalid_response','transport_error','cancelled'].includes(String(v.kind))) throw new DomainError('invalid');
  if (!Array.isArray(v.items) || v.items.length > 100 || (v.kind !== 'ok' && v.items.length)) throw new DomainError('invalid');
  const items = v.items.map(parsePopularCard);
  if (new Set(items.map(item => item.bvid)).size !== items.length) throw new DomainError('invalid');
  const pgc = request.operation === 'public-pgc-ranking';
  if (pgc ? items.length || !Array.isArray(v.seasons) || v.seasons.length > 100 || (v.kind !== 'ok' && v.seasons.length) : v.seasons !== undefined) throw new DomainError('invalid');
  const seasons = pgc ? (v.seasons as unknown[]).map(parsePgcRankCard) : undefined;
  if (seasons && new Set(seasons.map(s => s.seasonId)).size !== seasons.length) throw new DomainError('invalid');
  if (v.seasonsMore !== undefined && (!pgc || typeof v.seasonsMore !== 'boolean')) throw new DomainError('invalid');
  const up = request.operation === 'public-up-archives';
  if (up ? items.length || !Array.isArray(v.archives) || v.archives.length > 50 || (v.kind !== 'ok' && v.archives.length) : v.archives !== undefined || v.archivesTotal !== undefined) throw new DomainError('invalid');
  const archives = up ? (v.archives as unknown[]).map(parseUpArchiveCard) : undefined;
  if (archives && new Set(archives.map(a => a.bvid)).size !== archives.length) throw new DomainError('invalid');
  if (v.archivesTotal !== undefined && (!Number.isSafeInteger(v.archivesTotal) || (v.archivesTotal as number) < 0 || (v.archivesTotal as number) > 10000000)) throw new DomainError('invalid');
  const visitorOp = request.operation === 'public-visitor';
  if (visitorOp ? items.length || (v.kind === 'ok') !== (v.visitorId !== undefined) : v.visitorId !== undefined) throw new DomainError('invalid');
  const visitorId = v.visitorId === undefined ? undefined : parseVisitorId(v.visitorId);
  const apiCode = v.apiCode === undefined ? undefined : finite(v.apiCode, -2147483648, 2147483647);
  if (apiCode !== undefined && !Number.isInteger(apiCode)) throw new DomainError('invalid');
  if (v.kind === 'ok' && (status !== 200 || apiCode !== 0 || code !== 'ranking.ok')) throw new DomainError('invalid');
  if (v.kind === 'http_error' && (status === 0 || status === 200 || apiCode !== undefined || code !== `ranking.http_${status}`)) throw new DomainError('invalid');
  if (v.kind === 'api_error' && (status !== 200 || apiCode === undefined || apiCode === 0 || code !== 'ranking.api_error')) throw new DomainError('invalid');
  if (v.kind === 'invalid_response' && (apiCode !== undefined || code !== 'ranking.invalid_response')) throw new DomainError('invalid');
  if (v.kind === 'transport_error' && (apiCode !== undefined || !/^ranking\.(transport_[0-9]{1,3}|native_unavailable)$/.test(code))) throw new DomainError('invalid');
  if (v.kind === 'cancelled' && (status !== 0 || apiCode !== undefined || code !== 'ranking.cancelled')) throw new DomainError('invalid');
  return { ...request, closed: true, kind: v.kind as RankingResult['kind'], status, ...(apiCode === undefined ? {} : { apiCode }), code, items, ...(seasons ? { seasons } : {}), ...(v.seasonsMore === undefined ? {} : { seasonsMore: v.seasonsMore as boolean }), ...(archives ? { archives } : {}), ...(v.archivesTotal === undefined ? {} : { archivesTotal: v.archivesTotal as number }), ...(visitorId ? { visitorId } : {}) };
}
