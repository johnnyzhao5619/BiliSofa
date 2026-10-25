import { DomainError, type PopularCard } from '../../../../packages/contracts/src/index.ts';
import { UP_ARCHIVE_PAGE, UP_ARCHIVE_PAGES } from '../../../../packages/contracts/src/up-archives.ts';
import { SessionManager } from '../../../../packages/bili-client/src/session.ts';
import { UpArchivesWorker } from '../platform/ranking-worker.ts';
import type { ResourceOwner } from './resource-owner.ts';
import type { UpArchiveCard } from '../../../../packages/contracts/src/up-archives.ts';
import { PublicLimitedError, pacedRead, usedVisitor } from '../platform/public-lists.ts';
import { visitorIds } from '../platform/visitor-id.ts';
/** Why a page of uploads could not be shown; fixed words only. */
export class UpArchiveError extends Error { constructor(readonly reason: 'limited' | 'network' | 'invalid' | 'cancelled') { super(reason); } }
/** B站 risk control answers this lane with HTTP 412 or these API codes; the page says “限制访问” and does not retry. */
const LIMITED = new Set([-352, -412, -509, -799]);
/** UP主页·投稿 (ADR-103): anonymous public lane, one page per explicit request, no prefetch or retry. */
export class UpArchiveRead {
  private readonly sessions = new SessionManager();
  private readonly worker = new UpArchivesWorker();
  constructor(owner: ResourceOwner, private readonly signed?: (mid: string, page: number, signal: AbortSignal) => Promise<{ archives: UpArchiveCard[]; total: number }>) { owner.add('up-archive-read', async () => { this.sessions.dispose(); await this.worker.dispose(); }); }
  /** 0.51.2 (ADR-105): paced, and with an active account its own session; a refusal surfaces as PublicLimitedError. */
  private async paced(mid: string, page: number): Promise<{ archives: UpArchiveCard[]; total: number }> {
    const signed = this.signed;
    return pacedRead(`${mid}:${page}`, signed ? 'account' : 'guest', 'up', async () => {
      const task = this.sessions.begin('up-archives');
      try {
        if (signed) { const value = await signed(mid, page, task.signal); if (!this.sessions.accepts(task.scope)) throw new UpArchiveError('cancelled'); return value; }
        // ADR-106: anonymous reads carry B站's own visitor identity when one is (or can be) kept on this TV.
        const visitor = await visitorIds().ensure(task.scope, task.signal);
        if (!this.sessions.accepts(task.scope)) throw new UpArchiveError('cancelled');
        usedVisitor(!!visitor);
        const result = await this.worker.run({ version: 1, scope: task.scope, operation: 'public-up-archives', mid, page, ...(visitor ? { visitor } : {}) }, task.signal);
        if (!this.sessions.accepts(task.scope) || result.kind === 'cancelled') throw new UpArchiveError('cancelled');
        if ((result.kind === 'http_error' && result.status === 412) || (result.kind === 'api_error' && LIMITED.has(result.apiCode ?? 0))) throw new PublicLimitedError(0, result.apiCode, result.kind === 'http_error' ? result.status : undefined);
        if (result.kind !== 'ok' || !result.archives) throw new UpArchiveError(result.kind === 'invalid_response' ? 'invalid' : 'network');
        return { archives: result.archives, total: result.archivesTotal ?? result.archives.length };
      } catch (error) {
        if (error instanceof UpArchiveError || error instanceof PublicLimitedError) throw error;
        throw new UpArchiveError(error instanceof DomainError && error.code === 'cancelled' ? 'cancelled' : error instanceof DomainError && error.code === 'invalid' ? 'invalid' : 'network');
      } finally { task.finish(); }
    });
  }
  async read(mid: string, name: string, page: number): Promise<{ items: PopularCard[]; total: number; noMore: boolean }> {
    {
      const read = await this.paced(mid, page);
      const owner = name.slice(0, 48) || 'UP主', total = read.total;
      const items = read.archives.map(a => ({ bvid: a.bvid, title: a.title, owner, durationSec: a.durationSec, views: a.views, ...(a.cover ? { cover: a.cover } : {}) }));
      return { items, total, noMore: !items.length || page * UP_ARCHIVE_PAGE >= total || page >= UP_ARCHIVE_PAGES };
    }
  }
}
