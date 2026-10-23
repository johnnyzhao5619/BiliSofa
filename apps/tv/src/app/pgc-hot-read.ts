import { DomainError } from '../../../../packages/contracts/src/index.ts';
import type { PgcRankCard, PgcRankSpan, PgcRankType } from '../../../../packages/contracts/src/ranking.ts';
import { SessionManager } from '../../../../packages/bili-client/src/session.ts';
import { PgcRankingWorker } from '../platform/ranking-worker.ts';
import type { ResourceOwner } from './resource-owner.ts';
import type { LibraryEntry } from './product-library-read.ts';
const PAGE = 20, INDEX_PAGES = 5;
export interface PgcHotFilter { seasonType: PgcRankType; span: PgcRankSpan; }
/** Public 番剧/国创 lists for 番剧影视 (ADR-096/098). The 3-/7-day rankings are read once per filter and
 * served in pages of 20; the all-time list (by followers) is read page by page, at most five.
 * Anonymous lane only, no account or write surface. Refresh drops the cached filter. */
export class PgcHotRead {
  private readonly sessions = new SessionManager();
  private readonly worker = new PgcRankingWorker();
  private readonly cache = new Map<string, { seasons: PgcRankCard[]; more: boolean }>();
  constructor(owner: ResourceOwner) {
    owner.add('pgc-hot-read', async () => { this.sessions.dispose(); this.cache.clear(); await this.worker.dispose(); });
  }
  private async fetch(filter: PgcHotFilter, page: number): Promise<{ seasons: PgcRankCard[]; more: boolean }> {
    const task = this.sessions.begin('pgc-hot');
    try {
      const result = await this.worker.run({ version: 1, scope: task.scope, operation: 'public-pgc-ranking', seasonType: filter.seasonType, span: filter.span, page }, task.signal);
      if (!this.sessions.accepts(task.scope)) throw new DomainError('cancelled');
      if (result.kind !== 'ok' || !result.seasons) throw new DomainError(result.kind === 'cancelled' ? 'cancelled' : 'network');
      return { seasons: result.seasons, more: result.seasonsMore === true };
    } finally { task.finish(); }
  }
  async read(filter: PgcHotFilter, page: number, fresh = false): Promise<{ page: number; noMore: boolean; total?: number; items: LibraryEntry[] }> {
    if (fresh) for (const key of [...this.cache.keys()]) if (key.startsWith(`${filter.seasonType}:${filter.span}:`)) this.cache.delete(key);
    const all = filter.span === 'all', key = `${filter.seasonType}:${filter.span}:${all ? page : 1}`;
    let hit = this.cache.get(key); if (!hit) { hit = await this.fetch(filter, all ? page : 1); this.cache.set(key, hit); }
    const rows = all ? hit.seasons : hit.seasons.slice((page - 1) * PAGE, page * PAGE);
    const noMore = all ? !hit.more || page >= INDEX_PAGES : page * PAGE >= hit.seasons.length;
    const badge = filter.seasonType === 4 ? '国创' : '番剧';
    return { page, noMore, ...(all ? {} : { total: hit.seasons.length }), items: rows.map(card => ({ id: 'hot-' + card.seasonId, seasonId: card.seasonId, title: card.title, subtitle: [card.subtitle, card.rating].filter(Boolean).join(' · ') || badge, badge: card.badge || badge, description: '', ...(card.cover ? { cover: card.cover } : {}) })) };
  }
}
