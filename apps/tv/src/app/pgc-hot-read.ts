import { DomainError } from '../../../../packages/contracts/src/index.ts';
import type { PgcRankCard } from '../../../../packages/contracts/src/ranking.ts';
import { SessionManager } from '../../../../packages/bili-client/src/session.ts';
import { PgcRankingWorker } from '../platform/ranking-worker.ts';
import type { ResourceOwner } from './resource-owner.ts';
import type { LibraryEntry } from './product-library-read.ts';
const PAGE = 20;
/** Public 番剧 ranking for 番剧影视 (ADR-096): one bounded read per page visit, served in pages
 * of 20; refresh reads again. Anonymous lane only, no account or write surface. */
export class PgcHotRead {
  private readonly sessions = new SessionManager();
  private readonly worker = new PgcRankingWorker();
  private snapshot: PgcRankCard[] | undefined;
  constructor(owner: ResourceOwner) {
    owner.add('pgc-hot-read', async () => { this.sessions.dispose(); await this.worker.dispose(); });
  }
  async read(page: number, fresh = false): Promise<{ page: number; noMore: boolean; total: number; items: LibraryEntry[] }> {
    if (!this.snapshot || fresh) {
      const task = this.sessions.begin('pgc-hot');
      try {
        const result = await this.worker.run({ version: 1, scope: task.scope, operation: 'public-pgc-ranking' }, task.signal);
        if (!this.sessions.accepts(task.scope)) throw new DomainError('cancelled');
        if (result.kind !== 'ok' || !result.seasons) throw new DomainError(result.kind === 'cancelled' ? 'cancelled' : 'network');
        this.snapshot = result.seasons;
      } finally { task.finish(); }
    }
    const all = this.snapshot, start = (page - 1) * PAGE;
    return { page, noMore: start + PAGE >= all.length, total: all.length, items: all.slice(start, start + PAGE).map(card => ({ id: 'hot-' + card.seasonId, seasonId: card.seasonId, title: card.title, subtitle: [card.subtitle, card.rating].filter(Boolean).join(' · ') || '番剧', badge: card.badge || '番剧', description: '', ...(card.cover ? { cover: card.cover } : {}) })) };
  }
}
