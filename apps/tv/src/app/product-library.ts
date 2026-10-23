import {ContinuousGrid,PRODUCT_BROWSE} from '../ui/continuous-grid.ts';
import { DomainError } from '../../../../packages/contracts/src/index.ts';
import type { ProfileStore } from '../../../../packages/contracts/src/local-profile.ts';
import { queuePart, queueItemKey, type QueueStore, type QueueItem } from '../../../../packages/contracts/src/local-queue.ts';
import type { AccountWorkspace } from './account-workspace.ts';
import type { ResourceOwner } from './resource-owner.ts';
import type { TvShell } from './tv-shell.ts';
import { localCards, type LocalCard } from './product-local.ts';
import { ProductLibraryRead, type LibraryEntry, type PrivateLibrarySource } from './product-library-read.ts';
import { productButton } from './product-frame.ts';
import { CoverArt } from '../platform/cover-art.ts';
import { libraryCard, type LibraryCardView } from '../ui/library-card.ts';
import { clockTime } from '../ui/content-card.ts';
export type LibraryTab = 'local' | 'queue' | 'watchlater' | 'history' | 'folders';
export interface LibraryMemory {
  tab: LibraryTab;
  pages: Partial<Record<LibraryTab, number>>;
  anchors: Partial<Record<LibraryTab, string>>;
}
export interface LibraryServices {
  profile: ProfileStore;
  queue: QueueStore;
  workspace: AccountWorkspace;
  feedback: HTMLElement;
  play(target: {
    bvid: string;
    part: number;
  }, position: number): void;
  playQueue(items: QueueItem[], index: number, continuous: boolean): void;
}
interface Entry extends LibraryEntry {
  ordinal?:number;
  local?: LocalCard;
  queued?: QueueItem;
  queueIndex?: number;
  progress?: {
    timeMs: number;
    durationMs: number;
  };
}
const tabs: [
  LibraryTab,
  string
][] = [['local', '继续观看'], ['queue', '本机播放队列'], ['watchlater', '稍后再看'], ['history', '云端历史'], ['folders', '收藏夹']];
/** One product browser, preserving separate local stores and private read authority. */
export function productLibrary(owner: ResourceOwner, shell: TvShell, services: LibraryServices, memory: LibraryMemory, folder?: {
  key: string;
  title: string;
}): HTMLElement {
  const panel = document.createElement('section');
  panel.className = 'tv-library' + (folder ? ' tv-library-folder' : '');
  const heading = document.createElement(folder ? 'h2' : 'h1');
  heading.textContent = folder ? folder.title : '我的';
  heading.id=folder?'library-folder-title':'library-page-title';panel.setAttribute('aria-labelledby',heading.id);
  const note = document.createElement('p');
  note.className = 'tv-eyebrow';
  note.textContent = folder ? '账号收藏 · 只读' : '本机记录与账号片库';
  const filters = document.createElement('div');
  filters.className = 'tv-filters tv-library-tabs';
  const status = document.createElement('p');
  status.className = 'tv-status';
  status.setAttribute('role', 'status');
  const grid = document.createElement('div');
  grid.className = 'tv-library-grid';
  grid.setAttribute('aria-label', folder ? '收藏内容' : '片库内容');
  const paging = document.createElement('div');
  paging.className = 'tv-paging';
  const reader = new ProductLibraryRead(owner, services.workspace);
  let art = new CoverArt(), ticket = 0, currentPage = 1, currentKind: LibraryTab = memory.tab;
  const abort = () => art.close();
  owner.signal.addEventListener('abort', abort, { once: true });
  owner.add('library-art', () => { owner.signal.removeEventListener('abort', abort); art.close(); });
  const prefix = folder ? 'folder-library' : 'library';
  const button = (suffix: string, text: string, action: () => void) => productButton(prefix + '-' + suffix, text, () => { if (!owner.signal.aborted)
    action(); });
  const back = button('back', folder ? '返回收藏夹' : '管理记录与设置', () => { if (folder)
    void shell.closeOwnedModal(owner);
  else
    void shell.navigateTop({ page: 'settings' }); });
  const refresh = button('refresh', '刷新', () => { void read(1, true); }), previous = button('previous', '上一页', () => { if (!previous.disabled)
    void read(currentPage - 1); }), next = button('next', '下一页', () => { if (!next.disabled)
    void read(currentPage + 1); });
  const continuous = button('continuous', '播完自动下一项', () => { const value = services.queue.read(); if (value.kind === 'ok') {
    services.feedback.textContent = services.queue.continuous(!value.value.continuous) === 'saved' ? '连播设置已保存' : '连播设置保存未确认';
    void read(currentPage);
  } });
  continuous.setAttribute('role', 'switch');
  previous.disabled = next.disabled = true;
  const filterButtons = tabs.map(([kind, label]) => { const b = button('tab-' + kind, label, () => { if (folder)
    return; memory.tab = kind; void read(memory.pages[kind] ?? 1); }); if (kind !== 'local' && kind !== 'queue')
    b.disabled = services.workspace.state.kind !== 'active'; return b; });
  const login=button('login','登录查看账号片库',()=>{void shell.navigateTop({page:'account'});});
  if (folder) filters.append(back);
  else{filters.append(...filterButtons);if(services.workspace.state.kind!=='active')filters.append(login);}
  paging.append(previous, next, refresh, ...(folder ? [] : [continuous, back]));
  const feed=PRODUCT_BROWSE?new ContinuousGrid(owner,grid,{load:page=>read(page,false,undefined,undefined,true),restored:page=>{currentPage=page;memory.pages[currentKind]=page;},top:()=>folder?prefix+'-back':'library-tab-'+currentKind,left:()=>folder?prefix+'-back':'nav-library',bottom:()=>prefix+'-refresh'}):undefined;
  if(feed)previous.hidden=next.hidden=true;
  function currentTarget(entry: Entry): {
    target: {
      bvid: string;
      part: number;
    };
    position: number;
  } | undefined {
    if (!entry.target)
      return;
    const saved = services.profile.readPart(entry.target.bvid, entry.target.part);
    return { target: entry.target, position: saved.kind === 'ok' && saved.value ? saved.value.timeMs : 0 };
  }
  function confirmRemoval(entry: Entry): void {
    const ordinal = entry.ordinal ?? (currentPage - 1) * 4 + [...grid.querySelectorAll<HTMLElement>('[data-focus-id]')].findIndex(node => node.dataset.focusId === entry.id);
    shell.openModal('library-delete', child => {
      const modal = document.createElement('section');
      modal.className = 'tv-library-detail';
      const title = document.createElement('h2');
      title.textContent = entry.local ? '删除这个分P的本机续播位置？' : '从本机队列移除此项？';
      const detail = document.createElement('p');
      detail.textContent = entry.title + ` · P${entry.target!.part}；保留${entry.local ? '队列、设置' : '续播、其他队列项'}与云端数据`;
      const keep = productButton('library-delete-keep', '保留并返回', () => { void shell.closeOwnedModal(child); });
      const remove = productButton('library-delete-confirm', '确认仅删除本机此项', () => { if (child.signal.aborted)
        return; const result = entry.local ? services.profile.forgetPart(entry.target!.bvid, entry.target!.part) : services.queue.remove(entry.target!.bvid, entry.target!.part); remove.disabled = true; services.feedback.textContent = result === 'saved' ? '本机条目已删除' : '本机删除未确认，请重新读取核查'; void shell.closeOwnedModal(child).then(() => { if (!owner.signal.aborted)
        void read(feed?Math.floor(ordinal/4)+1:currentPage, false, undefined, Math.max(0, ordinal)); }); });
      modal.append(title, detail, keep, remove);
      return modal;
    }, 'library-delete-keep');
  }
  function details(entry: Entry): void {
    if (entry.folderKey) {
      const childMemory: LibraryMemory = { tab: 'folders', pages: {}, anchors: {} };
      shell.openModal('library-folder', child => productLibrary(child, shell, services, childMemory, { key: entry.folderKey!, title: entry.title }), 'folder-library-back');
      return;
    }
    shell.openModal('library-detail', child => {
      const modal = document.createElement('section');
      modal.className = 'tv-library-detail';
      const title = document.createElement('h2');
      title.id = 'library-detail-title';
      title.textContent = entry.title;
      modal.setAttribute('aria-labelledby', title.id);
      const text = document.createElement('p');
      text.textContent = entry.subtitle + '；' + entry.description;
      const actions = document.createElement('div');
      actions.className = 'tv-detail-actions';
      const value = currentTarget(entry);
      const closeThen = (action: () => void) => { void shell.closeOwnedModal(child).then(() => { if (!owner.signal.aborted && !shell.restartRequired)
        action(); }); };
      if (value) {
        const play = productButton('library-detail-play', entry.queued ? '从本项开始播放' : value.position ? `继续观看 · P${value.target.part} ${clockTime(value.position / 1000)}` : `播放 · P${value.target.part}`, () => { if (child.signal.aborted)
          return; closeThen(() => { if (entry.queued) {
          const current = services.queue.read();
          if (current.kind === 'ok') {
            const index = current.value.items.findIndex(item => queueItemKey(item) === queueItemKey(entry.queued!));
            if (index >= 0)
              services.playQueue(current.value.items, index, current.value.continuous);
          }
        }
        else
          services.play(value.target, value.position); }); });
        play.className = 'tv-primary';
        actions.append(play);
        if (value.position && !entry.queued)
          actions.append(productButton('library-detail-start', '从头播放此分P', () => { if (!child.signal.aborted)
            closeThen(() => services.play(value.target, 0)); }));
        if (!entry.queued)
          actions.append(productButton('library-detail-enqueue', `加入本机队列 · P${value.target.part}`, () => { if (child.signal.aborted)
            return; const outcome = services.queue.add({ bvid: value.target.bvid, part: value.target.part, title: entry.title }); result.textContent = outcome === 'saved' ? '已加入本机队列' : outcome === 'full' ? '本机队列已满' : '本机保存未确认，请重新读取'; }));
      }
      else {
        const unavailable = document.createElement('p');
        unavailable.textContent = '此条目没有可用的普通视频/分P标识，当前只能查看；不会替换成其他视频播放。';
        modal.append(unavailable);
      }
      if (entry.queued) {
        const current = services.queue.read();
        const index = current.kind === 'ok' ? current.value.items.findIndex(item => queueItemKey(item) === queueItemKey(entry.queued!)) : -1;
        for (const [direction, label] of [[-1, '上移'], [1, '下移']] as const) {
          const move = productButton('library-detail-move-' + (direction === -1 ? 'up' : 'down'), label, () => { if (child.signal.aborted)
            return; const outcome = services.queue.move(entry.queued!.bvid, direction, queuePart(entry.queued!)); services.feedback.textContent = outcome === 'saved' ? '队列顺序已保存' : '顺序保存未确认'; closeThen(() => { const data = services.queue.read(), at = data.kind === 'ok' ? data.value.items.findIndex(item => queueItemKey(item) === queueItemKey(entry.queued!)) : -1; void read(at >= 0 ? Math.floor(at / 4) + 1 : currentPage, false, entry.id); }); });
          move.disabled = index < 0 || direction === -1 && index === 0 || direction === 1 && (current.kind !== 'ok' || index >= current.value.items.length - 1);
          actions.append(move);
        }
      }
      if (entry.local || entry.queued)
        actions.append(productButton('library-detail-remove', '删除本机此项', () => { if (!child.signal.aborted)
          closeThen(() => confirmRemoval(entry)); }));
      const result = document.createElement('p');
      result.setAttribute('role', 'status');
      actions.append(productButton('library-detail-back', '返回原卡', () => { void shell.closeOwnedModal(child); }));
      modal.append(title, text, actions, result);
      return modal;
    }, 'library-detail-' + (entry.target ? 'play' : 'back'));
  }
  async function read(page: number, fresh = false, restore?: string, ordinal?: number, stream=false): Promise<void> {
    const generation = ++ticket, source = folder ? { kind: 'items' as const, folderKey: folder.key } : { kind: memory.tab };
    currentKind = memory.tab;
    const sourceKey=JSON.stringify(source);feed?.prepare(sourceKey,!stream);const retained=!!feed&&grid.childElementCount>0;
    panel.dataset.source = folder ? 'items' : currentKind;
    previous.disabled = next.disabled = true;
    refresh.disabled = true;
    continuous.hidden = !!folder || currentKind !== 'queue';
    filterButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(tabs[i]![0] === currentKind)));
    const active = document.activeElement as HTMLElement | null, activeId = restore ?? (!panel.isConnected ? shell.navigation.current.anchor.focusId : active?.dataset.focusId);
    if(!feed)grid.querySelectorAll<HTMLButtonElement>('button').forEach(b => b.disabled = true);
    if (!feed && panel.isConnected && grid.contains(active))
      (folder ? back : filterButtons.find((_button, i) => tabs[i]![0] === currentKind) ?? back).focus();
    status.textContent = '正在读取' + (folder ? '收藏内容' : tabs.find(([kind]) => kind === currentKind)![1]);
    try {
      await reader.cancel();
      if (owner.signal.aborted || generation !== ticket)
        return;
      let noMore = true, note = '';
      let items: Entry[];
      if (source.kind === 'local') {
        const data = localCards(services.profile, services.queue, page);
        if (data.kind !== 'ok')
          throw new DomainError(data.kind === 'future' ? 'unsupported' : 'invalid');
        page = data.page;
        noMore = data.noMore;
        note = `本机 · ${data.total} 条${data.namesUnavailable ? ' · 部分名称暂不可读' : ''}`;
        items = data.items.map(card => ({ id: card.id, title: card.title, subtitle: card.subtitle, badge: `P${card.point.part}`, description: '仅保存在电视的续播位置，不写入云端', target: { bvid: card.point.bvid, part: card.point.part }, local: card, progress: card.point }));
      }
      else if (source.kind === 'queue') {
        const data = services.queue.read();
        if (data.kind !== 'ok')
          throw new DomainError('invalid');
        page = Math.max(1, Math.min(page, Math.max(1, Math.ceil(data.value.items.length / 4))));
        noMore = page * 4 >= data.value.items.length;
        note = `本机 · ${data.value.items.length}/64 项`;
        continuous.setAttribute('aria-checked', String(data.value.continuous));
        continuous.disabled = false;
        items = data.value.items.slice((page - 1) * 4, page * 4).map((item, i) => ({ id: 'queue-' + queueItemKey(item), title: item.title, subtitle: `第 ${(page - 1) * 4 + i + 1} 项 · P${queuePart(item)}`, badge: `P${queuePart(item)}`, description: '本机播放队列，不改动账号内容', target: { bvid: item.bvid, part: queuePart(item) }, queued: item }));
      }
      else {
        const data = await reader.read(source as PrivateLibrarySource, page, fresh);
        if (owner.signal.aborted || generation !== ticket)
          return;
        items = data.items;
        page = data.page;
        noMore = data.noMore;
        note = '账号只读' + (data.note ? ' · ' + data.note : '');
      }
      if (owner.signal.aborted || generation !== ticket)
        return;
      currentPage = page;
      memory.pages[currentKind] = page;
      if(!feed)art.close();
      art = new CoverArt();
      const seen = new Set<string>();
      const buttons = items.map((entry, i) => { entry.ordinal=(page-1)*4+i; if (seen.has(entry.id))
        entry.id += '-' + i; seen.add(entry.id); return libraryCard(entry as LibraryCardView, owner.signal, () => details(entry), art); });
      if(feed){const currentArt=art;feed.commit(sourceKey,page,buttons,noMore,currentKind==='local'&&!folder?48:25,1,()=>currentArt.close());}else grid.replaceChildren(...buttons);
      status.textContent = items.length ? `${note}${feed?' · 向下浏览更多':' · 第 '+page+' 页'}` : source.kind === 'history' && !noMore ? '本页没有当前范围内的记录，可继续下一页' : `${note} · ${source.kind === 'local' ? '还没有本机续播位置' : source.kind === 'queue' ? '队列为空，可从视频详情加入' : source.kind === 'watchlater' ? '稍后再看为空' : source.kind === 'history' ? '云端历史为空或未记录' : '收藏夹为空'}`;
      if(page>=25&&!noMore&&source.kind!=='local'&&source.kind!=='queue')status.textContent+=' · 当前读取上限25页，可刷新查看最新';
      previous.disabled = page <= 1;
      next.disabled = noMore || page >= (currentKind === 'local' && !folder ? 48 : 25);
      refresh.disabled = false;
      wire();
      const now = document.activeElement as HTMLElement | null, owns = !panel.isConnected || panel.contains(now) || now === document.body || now?.dataset.focusId === 'nav-library';
      if (!retained && owns && !owner.signal.aborted && (folder || !document.querySelector('#overlays>section'))) {
        const wanted = restore ?? memory.anchors[currentKind] ?? activeId;
        const target = buttons.find(b => b.dataset.focusId === wanted) ?? buttons[Math.max(0, Math.min(buttons.length - 1, (ordinal ?? ((page - 1) * 4)) - (page - 1) * 4))] ?? refresh;
        if (panel.isConnected)
          target.focus();
        else
          panel.dataset.initialFocusId = target.dataset.focusId;
      }
    }
    catch (error) {
      feed?.failure();
      if (owner.signal.aborted || generation !== ticket)
        return;
      if(!feed)art.close();
      if(!feed)grid.replaceChildren();
      status.textContent = error instanceof DomainError && error.code === 'login' ? '登录已失效，请在账号中重新扫码' : `片库暂未加载（${error instanceof DomainError ? error.code : 'unknown'}），本机数据保留，可重新读取或返回`;
      refresh.disabled = error instanceof DomainError && error.code === 'unknown';
      continuous.disabled = true;
      wire();
      if (panel.contains(document.activeElement) || document.activeElement === document.body)
        (refresh.disabled ? back : refresh).focus();
    }
  }
  const focused = (event: FocusEvent) => { const element = event.target as HTMLElement; if (grid.contains(element) && element.dataset.focusId)
    memory.anchors[currentKind] = element.dataset.focusId; };
  panel.addEventListener('focusin', focused);
  owner.add('library-focus', () => panel.removeEventListener('focusin', focused));
  function wire(): void {
    const buttons = [...grid.querySelectorAll<HTMLButtonElement>('button')], up = folder ? back.dataset.focusId! : 'library-tab-' + currentKind;
    buttons.forEach((b, i) => { b.dataset.left = i % 4 ? buttons[i - 1]!.dataset.focusId : folder ? back.dataset.focusId : 'nav-library'; b.dataset.right = buttons[i + 1]?.dataset.focusId ?? b.dataset.focusId; b.dataset.up = up; b.dataset.down = refresh.dataset.focusId; });
    const activeFilters = [...filterButtons,...(!folder&&services.workspace.state.kind!=='active'?[login]:[])].filter(b => !b.disabled && !b.hidden);
    activeFilters.forEach((b, i) => { b.dataset.left = activeFilters[i - 1]?.dataset.focusId ?? 'nav-library'; b.dataset.right = activeFilters[i + 1]?.dataset.focusId ?? b.dataset.focusId; b.dataset.up = b.dataset.focusId; b.dataset.down = buttons[0]?.dataset.focusId ?? refresh.dataset.focusId; });
    const controls = [previous, next, refresh, ...(continuous.hidden ? [] : [continuous]), back].filter(b => !b.disabled && !b.hidden);
    controls.forEach((b, i) => { b.dataset.left = controls[i - 1]?.dataset.focusId ?? (folder ? back.dataset.focusId : 'nav-library'); b.dataset.right = controls[i + 1]?.dataset.focusId ?? b.dataset.focusId; b.dataset.up = buttons[0]?.dataset.focusId ?? up; b.dataset.down = b.dataset.focusId; });
    feed?.wire();
  }
  panel.append(note, heading, filters, status, grid, paging);
  void read(folder ? 1 : memory.pages[memory.tab] ?? 1);
  return panel;
}
