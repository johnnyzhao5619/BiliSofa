import { DomainError } from '../../../../packages/contracts/src/index.ts';
import { parseRecommendationPage } from '../../../../packages/contracts/src/recommendations.ts';
import type { AccountWorkspace } from './account-workspace.ts';
import type { ResourceOwner } from './resource-owner.ts';
import type { HomeServices } from './product-home.ts';
/** Drain the native job, not workspace.read: its finally may itself rerender us. */
export function productRecommendations(owner: ResourceOwner, workspace: AccountWorkspace): NonNullable<HomeServices['recommend']> {
    let nativePending: Promise<void> | undefined, closed = true;
    owner.add('home-recommend-native', async () => { await nativePending; if (!closed)
        throw new DomainError('unknown'); });
    return async (page, signal, fresh) => {
        const result = await workspace.read(async (runtime, scope, accountSignal) => {
            if (!runtime.readRecommendations)
                throw new DomainError('unsupported');
            const controller = new AbortController(), cancel = () => controller.abort();
            signal.addEventListener('abort', cancel, { once: true });
            accountSignal.addEventListener('abort', cancel, { once: true });
            if (signal.aborted || accountSignal.aborted)
                cancel();
            try {
                const job = runtime.readRecommendations({ page, ...(fresh ? { refresh: true as const } : {}) }, scope, controller.signal);
                nativePending = job.then(() => { }, error => { if (!(error instanceof DomainError) || error.code === 'unknown')
                    closed = false; });
                return await job;
            }
            finally {
                signal.removeEventListener('abort', cancel);
                accountSignal.removeEventListener('abort', cancel);
            }
        }, parseRecommendationPage);
        return { items: result.items.map(card => ({ bvid: card.bvid, title: card.title, owner: card.author, durationSec: card.durationSeconds, views: 0, ...(card.cover ? { cover: card.cover } : {}) })), noMore: result.noMore, firstPage: result.firstPage };
    };
}
