import { BATCH_ROWS, DomainError, parsePopularRequest, parsePopularResult, type PopularCard, type PopularRequest, type PopularResult } from '../../../../packages/contracts/src/index.ts';
import { parseRankingRequest, parseRankingResult, type RankingRequest, type RankingResult } from '../../../../packages/contracts/src/ranking.ts';
import { parseSearchRequest, parseSearchResult, type SearchRequest, type SearchResult } from '../../../../packages/contracts/src/search.ts';
import { parseUserSearchRequest, parseUserSearchResult, type UserSearchCard, type UserSearchRequest, type UserSearchResult } from '../../../../packages/contracts/src/user-search.ts';
import { parsePgcSearchRequest, parsePgcSearchResult, type PgcSearchCard, type PgcSearchRequest, type PgcSearchResult } from '../../../../packages/contracts/src/pgc-search.ts';
import { parseHotSearchRequest, parseHotSearchResult, type HotSearchRequest, type HotSearchResult } from '../../../../packages/contracts/src/hot-search.ts';
import { parseVideoViewRequest, parseVideoViewResult, type KernelRequest, type VideoViewRequest, type VideoViewResult } from '../../../../packages/contracts/src/public-kernel.ts';
import { publicKernel, type PublicKernel } from './public-kernel.ts';
import { BatchedPages, type BatchRead } from './batched-pages.ts';
/** ADR-108: anonymous public reads through the resident kernel, with the same `run`/`dispose`
 * shape as the per-request Workers they replace. `dispose` cancels only this lane's own
 * transfers; the shared kernel and its connections stay. Results carry the caller's own scope. */
class KernelLane<Q extends KernelRequest, R> {
  private readonly controllers = new Set<AbortController>();
  constructor(protected readonly parseRequest: (value: unknown) => Q, private readonly parseResult: (value: unknown) => R,
    private readonly matches: (query: Q, result: R) => boolean = () => true, protected readonly kernel: () => PublicKernel = publicKernel) {}
  async run(value: Q, signal: AbortSignal): Promise<R> {
    const query = this.parseRequest(value), result = this.parseResult({ ...(await this.fetch(query, signal)), scope: query.scope });
    // As the per-request Workers did: an answer for another category, UP or page is never accepted.
    if (!this.matches(query, result)) throw new DomainError('invalid');
    return result;
  }
  dispose(): Promise<void> { for (const c of this.controllers) c.abort(); this.controllers.clear(); return Promise.resolve(); }
  protected async fetch(query: KernelRequest, signal: AbortSignal, prefetch = false): Promise<Record<string, unknown>> {
    const controller = new AbortController(), abort = () => controller.abort();
    if (signal.aborted) throw new DomainError('cancelled');
    signal.addEventListener('abort', abort, { once: true }); this.controllers.add(controller);
    try { return await this.kernel().run(query, controller.signal, prefetch); }
    finally { signal.removeEventListener('abort', abort); this.controllers.delete(controller); }
  }
}
/** Short app-lifetime reuse for whole lists; only successful answers are kept. */
const memo = new Map<string, { at: number; result: Record<string, unknown> }>();
const memoKey = (query: KernelRequest) => JSON.stringify({ ...query, scope: undefined });
class CachedLane<Q extends KernelRequest, R> extends KernelLane<Q, R> {
  constructor(parseRequest: (value: unknown) => Q, parseResult: (value: unknown) => R, private readonly ttlMs: number, matches?: (query: Q, result: R) => boolean, kernel?: () => PublicKernel) { super(parseRequest, parseResult, matches, kernel); }
  invalidate(value: Q): void { memo.delete(memoKey(this.parseRequest(value))); }
  protected override async fetch(query: KernelRequest, signal: AbortSignal): Promise<Record<string, unknown>> {
    const key = memoKey(query), hit = memo.get(key);
    if (hit && Date.now() - hit.at < this.ttlMs) return hit.result;
    const result = await super.fetch(query, signal);
    if (result.kind === 'ok') { memo.delete(key); memo.set(key, { at: Date.now(), result }); while (memo.size > 48) memo.delete(memo.keys().next().value!); }
    return result;
  }
}
type Paged = PopularRequest | SearchRequest | UserSearchRequest | PgcSearchRequest;
/** Screen pages (4 cards) cut from 20-row kernel batches; see BatchedPages. */
class BatchedLane<Q extends Paged, C, R> extends KernelLane<Q, R> {
  constructor(parseRequest: (value: unknown) => Q, private readonly screen: (value: unknown) => R, private readonly batch: (value: unknown) => { kind: string; items: C[]; noMore: boolean },
    private readonly pages: BatchedPages<C>, private readonly ok: string, kernel?: () => PublicKernel) { super(parseRequest, screen, undefined, kernel); }
  private key(query: Q): string { return JSON.stringify({ ...query, scope: undefined, page: undefined }); }
  invalidate(value: Q): void { this.pages.invalidate(this.key(this.parseRequest(value))); }
  override async run(value: Q, signal: AbortSignal): Promise<R> {
    const query = this.parseRequest(value);
    const read = async (page: number): Promise<BatchRead<C>> => {
      const raw = await this.fetch({ ...query, page } as Q, signal), parsed = this.batch({ ...raw, scope: query.scope });
      return parsed.kind === 'ok' ? { ok: true, items: parsed.items, noMore: parsed.noMore } : { ok: false, result: raw };
    };
    const outcome = await this.pages.page(this.key(query), query.page, read);
    if (!outcome.ok) return this.screen({ ...outcome.result, scope: query.scope });
    return this.screen({ version: 1, scope: query.scope, operation: query.operation, closed: true, kind: 'ok', status: 200, apiCode: 0, code: this.ok, items: outcome.items, noMore: outcome.noMore });
  }
}
const popularPages = new BatchedPages<PopularCard>(card => card.bvid, 300000);
const videoPages = new BatchedPages<PopularCard>(card => card.bvid, 600000);
const userPages = new BatchedPages<UserSearchCard>(card => card.uid, 600000);
const pgcPages = new BatchedPages<PgcSearchCard>(card => card.seasonId, 600000);
export class KernelPopular extends BatchedLane<PopularRequest, PopularCard, PopularResult> {
  constructor(kernel?: () => PublicKernel) { super(parsePopularRequest, value => parsePopularResult(value), value => parsePopularResult(value, BATCH_ROWS), popularPages, 'guest.popular_ok', kernel); }
}
export class KernelVideoSearch extends BatchedLane<SearchRequest, PopularCard, SearchResult> {
  constructor(kernel?: () => PublicKernel) { super(parseSearchRequest, value => parseSearchResult(value), value => parseSearchResult(value, BATCH_ROWS), videoPages, 'search.ok', kernel); }
}
export class KernelUserSearch extends BatchedLane<UserSearchRequest, UserSearchCard, UserSearchResult> {
  constructor(kernel?: () => PublicKernel) { super(parseUserSearchRequest, value => parseUserSearchResult(value), value => parseUserSearchResult(value, BATCH_ROWS), userPages, 'up.ok', kernel); }
}
export class KernelPgcSearch extends BatchedLane<PgcSearchRequest, PgcSearchCard, PgcSearchResult> {
  constructor(kernel?: () => PublicKernel) { super(parsePgcSearchRequest, value => parsePgcSearchResult(value), value => parsePgcSearchResult(value, BATCH_ROWS), pgcPages, 'pgc.ok', kernel); }
}
const only = <O extends RankingRequest['operation']>(operation: O) => (value: unknown) => { const q = parseRankingRequest(value); if (q.operation !== operation) throw new DomainError('invalid'); return q as RankingRequest & { operation: O }; };
/** 全站排行 (100 cards): reused for five minutes so the home shelf and its full grid share one read. */
export class KernelRanking extends CachedLane<RankingRequest & { operation: 'public-ranking' }, RankingResult> {
  constructor(kernel?: () => PublicKernel) { super(only('public-ranking'), parseRankingResult, 300000, (_q, r) => r.operation === 'public-ranking', kernel); }
}
/** Category reads are paced and reused by public-lists (ADR-105); this lane adds nothing on top. */
export class KernelCategoryRanking extends KernelLane<RankingRequest & { operation: 'public-category-ranking' }, RankingResult> {
  constructor(kernel?: () => PublicKernel) { super(only('public-category-ranking'), parseRankingResult, (q, r) => r.operation === q.operation && r.categoryId === q.categoryId, kernel); }
}
export class KernelPgcRanking extends CachedLane<RankingRequest & { operation: 'public-pgc-ranking' }, RankingResult> {
  constructor(kernel?: () => PublicKernel) { super(only('public-pgc-ranking'), parseRankingResult, 600000, (_q, r) => r.operation === 'public-pgc-ranking', kernel); }
}
export class KernelUpArchives extends KernelLane<RankingRequest & { operation: 'public-up-archives' }, RankingResult> {
  constructor(kernel?: () => PublicKernel) { super(only('public-up-archives'), parseRankingResult, (q, r) => r.operation === q.operation && r.mid === q.mid && r.page === q.page, kernel); }
}
export class KernelVisitor extends KernelLane<RankingRequest & { operation: 'public-visitor' }, RankingResult> {
  constructor(kernel?: () => PublicKernel) { super(only('public-visitor'), parseRankingResult, (_q, r) => r.operation === 'public-visitor', kernel); }
}
export class KernelHotSearch extends CachedLane<HotSearchRequest, HotSearchResult> {
  constructor(kernel?: () => PublicKernel) { super(parseHotSearchRequest, parseHotSearchResult, 300000, undefined, kernel); }
}
/** ADR-110: the detail page's parts and facts, reused for ten minutes. */
export class KernelVideoView extends CachedLane<VideoViewRequest, VideoViewResult> {
  constructor(kernel?: () => PublicKernel) { super(parseVideoViewRequest, parseVideoViewResult, 600000, (q, r) => r.kind !== 'ok' || r.detail.parts.length > 0 || q.bvid.length === 12, kernel); }
}
/** Drops every cached public list (设置 → 清除读取缓存, or after an identity change). */
export function clearPublicLists(): void { memo.clear(); for (const pages of [popularPages, videoPages, userPages, pgcPages]) pages.invalidate(); }
