import { DomainError, type PopularCard } from '../../../../packages/contracts/src/index.ts';
import { ContentApiError } from '../../../../packages/contracts/src/content.ts';
import type { CategoryId } from '../../../../packages/contracts/src/categories.ts';
import { parsePublicReadResult, type PublicReadCommand, type PublicReadResult } from '../../../../packages/contracts/src/public-read.ts';
import type { UpArchiveCard } from '../../../../packages/contracts/src/up-archives.ts';
import type { AccountWorkspace } from './account-workspace.ts';
import { LIMITED_API_CODES, PublicLimitedError } from '../platform/public-lists.ts';
/** ADR-105: the two public lists read with the active account's own session (read-only GET). The page
 * never sees the account; a refusal becomes the same errors the anonymous lane produces. */
export function signedPublicReads(workspace: AccountWorkspace) {
  const run = (command: PublicReadCommand, signal: AbortSignal) => workspace.read(async (runtime, scope, accountSignal) => {
    if (!runtime.readPublic) throw new DomainError('unsupported');
    const controller = new AbortController(), cancel = () => controller.abort();
    signal.addEventListener('abort', cancel, { once: true }); accountSignal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted || accountSignal.aborted) cancel();
    try { return await runtime.readPublic(command, scope, controller.signal); }
    finally { signal.removeEventListener('abort', cancel); accountSignal.removeEventListener('abort', cancel); }
  }, parsePublicReadResult);
  const refused = (r: PublicReadResult & { kind: 'refused' }): Error =>
    (r.apiCode !== undefined && LIMITED_API_CODES.has(r.apiCode)) || r.http === 412 ? new PublicLimitedError(0, r.apiCode, r.http)
      : r.apiCode !== undefined ? new ContentApiError(r.apiCode) : new DomainError('network');
  return {
    async category(categoryId: CategoryId, signal: AbortSignal): Promise<PopularCard[]> {
      const r = await run({ kind: 'category', categoryId }, signal);
      if (r.kind === 'category') return r.items; if (r.kind === 'refused') throw refused(r); throw new DomainError('invalid');
    },
    async up(mid: string, page: number, signal: AbortSignal): Promise<{ archives: UpArchiveCard[]; total: number }> {
      const r = await run({ kind: 'up', mid, page }, signal);
      if (r.kind === 'up') return { archives: r.archives, total: r.total }; if (r.kind === 'refused') throw refused(r); throw new DomainError('invalid');
    },
  };
}
export type SignedPublicReads = ReturnType<typeof signedPublicReads>;
