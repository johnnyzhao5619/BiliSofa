import { DomainError } from '../../../../packages/contracts/src/index.ts';
import type { PopularCard } from '../../../../packages/contracts/src/index.ts';
import type { UserSearchCard } from '../../../../packages/contracts/src/user-search.ts';
import type { PgcSearchCard } from '../../../../packages/contracts/src/pgc-search.ts';
import { SessionManager } from '../../../../packages/bili-client/src/session.ts';
import { SearchWorker } from '../platform/search-worker.ts';
import { UserSearchWorker } from '../platform/user-search-worker.ts';
import { PgcSearchWorker } from '../platform/pgc-search-worker.ts';
import type { ResourceOwner } from './resource-owner.ts';
export type SearchType = 'video' | 'up' | 'pgc';
export type SearchEntry = {
  kind: 'video';
  card: PopularCard;
} | {
  kind: 'up';
  card: UserSearchCard;
} | {
  kind: 'pgc';
  card: PgcSearchCard;
};
export class ProductSearchError extends Error {
  constructor(readonly detail: string) { super(detail); }
}
/** One public read lane; replacement waits for native close before another type starts. */
export class ProductSearchRead {
  private readonly sessions = new SessionManager();
  private readonly video = new SearchWorker();
  private readonly up = new UserSearchWorker();
  private readonly pgc = new PgcSearchWorker();
  private generation = 0;
  private confirmed = true;
  constructor(private readonly owner: ResourceOwner) {
    const abort = () => this.sessions.invalidate();
    owner.signal.addEventListener('abort', abort, { once: true });
    owner.add('product-search-read', async () => { owner.signal.removeEventListener('abort', abort); this.sessions.dispose(); await this.cancel(); });
  }
  private async cancel(): Promise<void> {
    this.sessions.invalidate();
    const result = await Promise.allSettled([this.video.dispose(), this.up.dispose(), this.pgc.dispose()]);
    if (result.some(item => item.status === 'rejected'))
      this.confirmed = false;
    if (!this.confirmed)
      throw new DomainError('unknown');
  }
  async read(type: SearchType, keyword: string, page: number): Promise<{
    items: SearchEntry[];
    noMore: boolean;
  }> {
    const generation = ++this.generation;
    await this.cancel();
    if (this.owner.signal.aborted || generation !== this.generation)
      throw new DomainError('cancelled');
    const task = this.sessions.begin('product-search');
    try {
      const base = { version: 1 as const, scope: task.scope, keyword, page };
      const result = type === 'video' ? await this.video.run({ ...base, operation: 'public-video-search' }, task.signal) : type === 'up' ? await this.up.run({ ...base, operation: 'public-user-search' }, task.signal) : await this.pgc.run({ ...base, operation: 'public-pgc-search' }, task.signal);
      if (this.owner.signal.aborted || generation !== this.generation || !this.sessions.accepts(task.scope))
        throw new DomainError('cancelled');
      if (result.kind !== 'ok')
        throw new ProductSearchError(result.kind === 'api_error' ? 'API ' + result.apiCode : result.code);
      const items: SearchEntry[] = result.operation === 'public-video-search' ? result.items.map(card => ({ kind: 'video', card })) : result.operation === 'public-user-search' ? result.items.map(card => ({ kind: 'up', card })) : result.items.map(card => ({ kind: 'pgc', card }));
      return { items, noMore: result.noMore };
    }
    finally {
      task.finish();
    }
  }
}
