import { DomainError, type CoverReference } from '../../../../packages/contracts/src/index.ts';
import { parseWatchLaterPage } from '../../../../packages/contracts/src/watch-later.ts';
import {parseFollowUpdatesPage} from '../../../../packages/contracts/src/follow-updates.ts';
import {parsePgcFollowValue} from '../../../../packages/contracts/src/pgc-follow-dto.ts';
import { parseHistoryPage } from '../../../../packages/contracts/src/history.ts';
import { parseFavoriteFoldersPage, parseFavoriteItemsPage } from '../../../../packages/contracts/src/favorites.ts';
import type { AccountRuntime } from '../../../../packages/contracts/src/private-account.ts';
import type { Scope } from '../../../../packages/contracts/src/index.ts';
import type { ResourceOwner } from './resource-owner.ts';
import type { AccountWorkspace } from './account-workspace.ts';
import { clockTime } from '../ui/content-card.ts';
export type PrivateLibrarySource = {
  kind: 'watchlater';
} | {
  kind: 'history';
} | {
  kind: 'folders';
} | {
  kind: 'updates';
} | {
  kind: 'bangumi';
} | {
  kind: 'drama';
} | {
  kind: 'items';
  folderKey: string;
};
export interface LibraryEntry {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  cover?: CoverReference;
  target?: {
    bvid: string;
    part: number;
  };
  seasonId?: string;
  folderKey?: string;
  count?: number;
}
export interface LibraryPage {
  page: number;
  items: LibraryEntry[];
  noMore: boolean;
  note?: string;
  total?: number;
}
/** Only native ACK is drained; workspace.read can rerender the current page. */
export class ProductLibraryRead {
  private controller: AbortController | undefined;
  private native: Promise<void> | undefined;
  private confirmed = true;
  private generation = 0;
  constructor(private owner: ResourceOwner, private workspace: AccountWorkspace) {
    const abort = () => this.controller?.abort();
    owner.signal.addEventListener('abort', abort, { once: true });
    owner.add('product-library-read', async () => { owner.signal.removeEventListener('abort', abort); await this.cancel(); });
  }
  async cancel(): Promise<void> { this.controller?.abort(); await this.native; if (!this.confirmed)
    throw new DomainError('unknown'); }
  private async load<T>(run: (runtime: AccountRuntime, scope: Scope, signal: AbortSignal) => Promise<T>, parse: (value: unknown) => T, controller: AbortController): Promise<T> {
    return this.workspace.read(async (runtime, scope, signal) => {
      const abort = () => controller.abort();
      signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted || this.owner.signal.aborted)
        abort();
      try {
        if (controller.signal.aborted)
          throw new DomainError('cancelled');
        const job = run(runtime, scope, controller.signal);
        this.native = job.then(() => { }, error => { if (!(error instanceof DomainError) || error.code === 'unknown')
          this.confirmed = false; });
        return await job;
      }
      finally {
        signal.removeEventListener('abort', abort);
      }
    }, parse);
  }
  async read(source: PrivateLibrarySource, page: number, fresh = false): Promise<LibraryPage> {
    const generation = ++this.generation;
    await this.cancel();
    if (this.owner.signal.aborted || generation !== this.generation)
      throw new DomainError('cancelled');
    const controller = new AbortController();
    this.controller = controller;
    if (source.kind === 'updates') {
      const result = await this.load((r, s, a) => { if (!r.readFollowUpdates) throw new DomainError('unsupported'); return r.readFollowUpdates({page, ...(fresh ? {refresh:true as const}: {})}, s, a); }, parseFollowUpdatesPage, controller);
      if(result.page!==page)throw new DomainError('invalid');
      return {page:result.page,noMore:result.noMore,items:result.items.map((card,i)=>({id:`update-${page}-${i}`,title:card.title,subtitle:`${card.author} · ${card.pubTime}`,badge:card.kind==='video'?'视频更新':'专栏更新',description:card.bvid?'视频更新 · 使用当前身份播放；不自动写入云端进度':card.kind==='article'?'专栏摘要 · 当前不提供专栏正文':'源端未提供可用视频标识，可在搜索中查找视频或UP主',...(card.bvid?{target:{bvid:card.bvid,part:1}}:{})}))};
    }
    if (source.kind === 'bangumi' || source.kind === 'drama') {
      const type=source.kind==='bangumi'?1:2;
      const result=await this.load((r,s,a)=>{if(!r.pgcFollow)throw new DomainError('unsupported');return r.pgcFollow({kind:'list',query:{type,page}},s,a);},parsePgcFollowValue,controller);
      if(result.kind!=='list'||result.page.page!==page||result.page.type!==type)throw new DomainError('invalid');
      return {page:result.page.page,noMore:result.page.noMore,total:result.page.total,items:result.page.items.map(card=>({id:'season-'+card.seasonId,seasonId:card.seasonId,title:card.title,subtitle:[card.status,card.progress].filter(Boolean).join(' · ')||'更新与观看状态未提供',badge:type===1?'追番':'追剧',description:card.status||'更新状态未提供'}))};
    }
    if (source.kind === 'watchlater') {
      const result = await this.load((r, s, a) => { if (!r.readWatchLater)
        throw new DomainError('unsupported'); return r.readWatchLater({ page }, s, a); }, parseWatchLaterPage, controller);
      return { page: result.page, noMore: result.noMore, items: result.items.map((card, i) => ({ id: 'watch-' + (card.bvid ?? page + '-' + i), title: card.title, badge: card.kind === 'ugc' ? '视频' : card.kind === 'pgc' ? '番剧影视' : '未提供类型', subtitle: card.availability === 'available' ? '稍后再看' : card.availability === 'unavailable' ? '内容已失效' : '状态未提供', description: `${card.partCount ? card.partCount + ' 个分P' : '分P信息未提供'}；来源：账号稍后再看`, ...(card.cover ? { cover: card.cover } : {}), ...(card.kind === 'ugc' && card.bvid && card.availability === 'available' ? { target: { bvid: card.bvid, part: 1 } } : {}) })) };
    }
    if (source.kind === 'history') {
      const result = await this.load((r, s, a) => { if (!r.readHistory)
        throw new DomainError('unsupported'); return r.readHistory({ page, ...(fresh ? { refresh: true as const } : {}) }, s, a); }, parseHistoryPage, controller);
      return { page: result.page, noMore: result.noMore, items: result.items.filter(card => card.kind !== 'live').map((card, i) => ({ id: 'history-' + (card.bvid ? card.bvid + '-p' + (card.part ?? 'unknown') : page + '-' + i), title: card.title, badge: card.kind === 'ugc' ? `P${card.part ?? '?'}` : card.kind === 'pgc' ? '番剧影视' : card.kind === 'article' ? '专栏' : '其他内容', subtitle: card.progressSec === null ? '云端未提供进度' : card.progressSec === -1 ? '云端记录：已看完' : `云端记录 ${clockTime(card.progressSec)}`, description: `${card.durationSec === null ? '时长未提供' : '时长 ' + clockTime(card.durationSec)} · ${new Date(card.viewedAtSec * 1000).toLocaleDateString('zh-CN')}；播放使用本机位置`, ...(card.cover ? { cover: card.cover } : {}), ...(card.kind === 'ugc' && card.bvid && card.part ? { target: { bvid: card.bvid, part: card.part } } : {}) })) };
    }
    if (source.kind === 'folders') {
      const result = await this.load((r, s, a) => { if (!r.readFavoriteFolders)
        throw new DomainError('unsupported'); return r.readFavoriteFolders({ page, ...(fresh ? { refresh: true as const } : {}) }, s, a); }, parseFavoriteFoldersPage, controller);
      return { page: result.page, noMore: result.noMore, ...(!result.complete ? { note: '来源仅返回部分收藏夹' } : {}), items: result.items.map(folder => ({ id: 'folder-' + folder.key, title: folder.title, subtitle: `${folder.count} 项内容`, badge: '收藏夹', description: '账号收藏夹', folderKey: folder.key, count: folder.count })) };
    }
    const result = await this.load((r, s, a) => { if (!r.readFavoriteItems)
      throw new DomainError('unsupported'); return r.readFavoriteItems({ folderKey: source.folderKey, page }, s, a); }, parseFavoriteItemsPage, controller);
    return { page: result.page, noMore: result.noMore, items: result.items.map((card, i) => ({ id: 'favorite-' + (card.bvid ?? page + '-' + i), title: card.title, subtitle: card.kind === 'ugc' ? '收藏视频' : card.kind === 'pgc' ? '番剧影视' : card.kind === 'course' ? '课程' : '类型未提供', badge: card.kind === 'ugc' ? '首P' : '收藏', description: `${card.providedParts ? card.providedParts + ' 个分P信息' : '源未提供分P信息'}；来源：账号收藏`, ...(card.cover ? { cover: card.cover } : {}), ...(card.kind === 'ugc' && card.bvid ? { target: { bvid: card.bvid, part: 1 } } : {}) })) };
  }
}
