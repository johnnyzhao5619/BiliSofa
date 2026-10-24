import { parseRankingRequest, parseRankingResult, type RankingRequest, type RankingResult } from '../../../../packages/contracts/src/ranking.ts';
import { ScopedGuestWorker } from './scoped-guest-worker.ts';
export class RankingWorker extends ScopedGuestWorker<RankingRequest, RankingResult> {
  constructor() { super('catalog-worker.js', 'public-ranking', value=>{const q=parseRankingRequest(value);if(q.operation!=='public-ranking')throw new Error('invalid');return q;}, parseRankingResult, 20000, 12000, (_q,r)=>r.operation==='public-ranking'); }
}

/** Separate parent operation so cancellation cannot address another catalog lane. */
export class CategoryRankingWorker extends ScopedGuestWorker<RankingRequest & {operation:'public-category-ranking'}, RankingResult> {
  constructor() { super('catalog-worker.js', 'public-category-ranking', value=>{const q=parseRankingRequest(value);if(q.operation!=='public-category-ranking')throw new Error('invalid');return q;}, parseRankingResult, 20000, 12000, (q,r)=>r.operation===q.operation&&r.categoryId===q.categoryId); }
}
/** Public 番剧 ranking (ADR-096); its own parent operation like the category lane. */
export class PgcRankingWorker extends ScopedGuestWorker<RankingRequest & {operation:'public-pgc-ranking'}, RankingResult> {
  constructor() { super('catalog-worker.js', 'public-pgc-ranking', value=>{const q=parseRankingRequest(value);if(q.operation!=='public-pgc-ranking')throw new Error('invalid');return q;}, parseRankingResult, 20000, 12000, (q,r)=>r.operation===q.operation); }
}
/** An UP's public uploads (ADR-103); its own parent operation so cancellation cannot address another lane. */
export class UpArchivesWorker extends ScopedGuestWorker<RankingRequest & {operation:'public-up-archives'}, RankingResult> {
  constructor() { super('catalog-worker.js', 'public-up-archives', value=>{const q=parseRankingRequest(value);if(q.operation!=='public-up-archives')throw new Error('invalid');return q;}, parseRankingResult, 20000, 12000, (q,r)=>r.operation===q.operation&&r.mid===(q as {mid:string}).mid&&r.page===q.page); }
}
/** B站 visitor identity (ADR-106); its own parent operation, never carrying a visitor itself. */
export class VisitorIdWorker extends ScopedGuestWorker<RankingRequest & {operation:'public-visitor'}, RankingResult> {
  constructor() { super('catalog-worker.js', 'public-visitor', value=>{const q=parseRankingRequest(value);if(q.operation!=='public-visitor')throw new Error('invalid');return q;}, parseRankingResult, 20000, 12000, (q,r)=>r.operation===q.operation); }
}
