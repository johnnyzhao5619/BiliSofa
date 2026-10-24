import {ContinuousGrid,PRODUCT_BROWSE} from '../ui/continuous-grid.ts';
import { DomainError } from '../../../../packages/contracts/src/index.ts';
import type { AccountWorkspace } from './account-workspace.ts';
import type { ResourceOwner } from './resource-owner.ts';
import type { TvShell } from './tv-shell.ts';
import { ProductLibraryRead, type LibraryEntry } from './product-library-read.ts';
import { libraryCard } from '../ui/library-card.ts';
import { productButton } from './product-frame.ts';
import { PRODUCT_SEASON } from './season-policy.ts';
import { PgcHotRead, type PgcHotFilter } from './pgc-hot-read.ts';
import { PRODUCT_PROFILES } from './profile-policy.ts';
const HOT_FILTER_KEY = 'bilisofa.hot-filter.v1';
/** Remembered 热门番剧 filter (0.50.0, ADR-098); 国创 first because overseas 番剧 are often region-locked. */
function savedHotFilter(): PgcHotFilter {
  try { const v = JSON.parse(localStorage.getItem(HOT_FILTER_KEY) ?? 'null') as Partial<PgcHotFilter> | null; if (v && (v.seasonType === 1 || v.seasonType === 4) && (v.span === 'day3' || v.span === 'week' || v.span === 'all')) return { seasonType: v.seasonType, span: v.span }; } catch { /* default below */ }
  return { seasonType: 4, span: 'day3' };
}
import { CoverArt } from '../platform/cover-art.ts';
import { PRODUCT_UP, UP_FIX } from '../../../../packages/contracts/src/up-archives.ts';
export type FollowingTab = 'updates' | 'bangumi' | 'drama' | 'hot';
export interface FollowingMemory {
  tab: FollowingTab;
  pages: Partial<Record<FollowingTab, number>>;
  anchors: Partial<Record<FollowingTab, string>>;
}
interface Services {
  workspace: AccountWorkspace;
  openSearch(type: 'up' | 'pgc'): void;
  play?(target:{bvid:string;part:number}):void;
  openSeason(card: {
    seasonId: string;
  }): void;
  /** 0.51.0 (ADR-103): 关注 links to 番剧影视's own 追番/追剧 lists instead of repeating them. */
  openCatalog?(tab: 'bangumi' | 'drama'): void;
  /** 0.51.1 (ADR-104): the shared video detail page, resuming this update's part. */
  openVideo?(card: { bvid: string; title: string; owner: string; durationSec: number; views: number; cover?: LibraryEntry['cover'] }, part: number): void;
}
const tabs = [['hot', '热门番剧'], ['updates', '关注更新'], ['bangumi', '我的追番'], ['drama', '我的追剧']] as const;
/** Same product cards; source-bound summaries never invent playable IDs. */
export function productFollowing(owner: ResourceOwner, shell: TvShell, route: 'following' | 'catalog', memory: FollowingMemory, services: Services): HTMLElement {
  const privateContent = services.workspace.state.kind === 'active';
  // 0.49.0 (ADR-096): 番剧影视 opens on the public 热门番剧 ranking, which guests can browse too.
  const hot = PRODUCT_SEASON && route === 'catalog';
  if (route === 'catalog' && memory.tab === 'updates')
    memory.tab = hot ? 'hot' : 'bangumi';
  if (!hot && memory.tab === 'hot') memory.tab = route === 'following' ? 'updates' : 'bangumi';
  const direct = PRODUCT_UP && route === 'following' && !!services.openCatalog;
  if (direct) memory.tab = 'updates';
  const available = tabs.filter(([kind]) => kind === 'hot' ? hot : route === 'following' ? !direct || kind === 'updates' : kind !== 'updates');
  const open = () => privateContent || memory.tab === 'hot';
  const hotReader = hot ? new PgcHotRead(owner) : undefined, art = hot ? new CoverArt() : undefined;
  if (art) owner.add('following-art', () => art.close());
  // 0.49.x read 番剧 · 三日 only; 0.50.0 adds the type and time-span filter row.
  const hotFilter: PgcHotFilter = PRODUCT_PROFILES ? savedHotFilter() : { seasonType: 1, span: 'day3' };
  const filters = document.createElement('div'); filters.className = 'tv-filters tv-hot-filters'; filters.setAttribute('role', 'group'); filters.setAttribute('aria-label', '热门番剧筛选');
  const filterButtons = PRODUCT_PROFILES && hot ? ([['type', 4, '国创'], ['type', 1, '番剧'], ['span', 'day3', '近三日'], ['span', 'week', '近一周'], ['span', 'all', '累计热门']] as const).map(([group, value, label]) => {
    const b = productButton(`hot-${group}-${value}`, label, () => {
      // A newer filter supersedes a load in progress (generation tickets drop the stale reply).
      if (owner.signal.aborted || blocked) return;
      if (group === 'type') hotFilter.seasonType = value as PgcHotFilter['seasonType']; else hotFilter.span = value as PgcHotFilter['span'];
      try { localStorage.setItem(HOT_FILTER_KEY, JSON.stringify(hotFilter)); } catch { /* still applies for this visit */ }
      memory.pages.hot = 1; delete memory.anchors.hot; void read(1, true);
    });
    b.dataset.group = group; b.dataset.value = String(value); return b;
  }) : [];
  filters.append(...filterButtons);
  const filterOn = () => filterButtons.length > 0 && memory.tab === 'hot';
  const activeFilter = () => filterButtons.find(b => b.dataset.group === 'type' && b.dataset.value === String(hotFilter.seasonType))?.dataset.focusId;
  const node = document.createElement('section');
  node.className = 'tv-following';
  // Guests start on the sign-in action, the page's only way to its content.
  node.dataset.initialFocusId = privateContent || hot ? 'following-search' : 'following-login';
  const heading = document.createElement('h1');
  heading.id = 'following-title';
  heading.textContent = route === 'following' ? '关注' : '番剧影视';
  node.setAttribute('aria-labelledby', heading.id);
  const lead = document.createElement('p');
  lead.className = 'tv-eyebrow';
  lead.textContent = route === 'following' ? '关心的创作者，追着看的故事' : '找到下一部想看的故事';
  const toolbar = document.createElement('div');
  toolbar.className = 'tv-following-header';
  const button = (id: string, label: string, action: () => void) => productButton(id, label, () => { if (!owner.signal.aborted)
    action(); });
  const search = button('following-search', route === 'following' ? '查找UP主' : '搜索番剧影视', () => services.openSearch(route === 'following' ? 'up' : 'pgc'));
  toolbar.append(heading, search);
  const categories = document.createElement('div');
  categories.className = 'tv-filters tv-following-tabs';
  categories.setAttribute('role', 'group');
  categories.setAttribute('aria-label', route === 'following' ? '关注栏目' : '已追列表');
  const source = document.createElement('p');
  source.className = 'tv-source-note';
  source.hidden = !privateContent;
  const status = document.createElement('p');
  status.className = 'tv-status';
  status.setAttribute('role', 'status');
  const grid = document.createElement('div');
  grid.className = 'tv-library-grid';
  grid.setAttribute('aria-label', route === 'following' ? '关注内容' : '已追番剧影视');
  const paging = document.createElement('div');
  paging.className = 'tv-paging';
  const reader = new ProductLibraryRead(owner, services.workspace);
  let busy = false, blocked = false, generation = 0, page = memory.pages[memory.tab] ?? 1, noMore = true;
  const tabButtons = available.map(([kind, label]) => button('following-tab-' + kind, label, () => {
    if (memory.tab === kind || blocked)
      return;
    remember();
    memory.tab = kind;
    page = memory.pages[kind] ?? 1;
    void read(page, true);
  }));
  categories.append(...tabButtons);
  // One home for 追番/追剧 (番剧影视); here a direct card replaces the repeated lists.
  const shortcut = direct ? button('following-to-catalog', '我的追番 · 我的追剧 → 番剧影视', () => { if (!blocked) services.openCatalog!('bangumi'); }) : undefined;
  if (shortcut) { shortcut.classList.add('tv-following-shortcut'); categories.append(shortcut); }
  const previous = button('following-previous', '上一页', () => { if (!busy && page > 1)
    void read(page - 1); });
  const next = button('following-next', '下一页', () => { if (!busy && !noMore && page < maxPage())
    void read(page + 1); });
  const refresh = button('following-refresh', '刷新', () => { if (!busy && !blocked)
    void read(1, true, true); });
  const login = button('following-login', route === 'following' ? '登录查看关注更新' : '登录查看追番与追剧', () => { void shell.navigateTop({ page: 'account' }); });
  paging.append(previous, next, refresh);
  const feed=PRODUCT_BROWSE?new ContinuousGrid(owner,grid,{load:page=>read(page),restored:value=>{page=value;memory.pages[memory.tab]=value;},top:()=> filterOn() ? activeFilter()! : 'following-tab-'+memory.tab,left:()=> 'nav-'+route,bottom:()=> 'following-refresh'}):undefined;
  if(feed)previous.hidden=next.hidden=true;
  login.hidden = privateContent;
  const maxPage = () => memory.tab === 'updates' ? 25 : 25000;
  function remember(): void {
    const active = document.activeElement as HTMLElement | null;
    if (grid.contains(active) && active?.dataset.focusId)
      memory.anchors[memory.tab] = active.dataset.focusId;
  }
  const focusIn = (event: FocusEvent) => { const target = event.target as HTMLElement; if (grid.contains(target) && target.dataset.focusId)
    memory.anchors[memory.tab] = target.dataset.focusId; };
  node.addEventListener('focusin', focusIn);
  owner.add('following-focus', () => node.removeEventListener('focusin', focusIn));
  function details(card: LibraryEntry): void {
    if (busy && !feed || owner.signal.aborted)
      return;
    // A season card opens the season page itself; the intermediate panel only repeated it.
    if (PRODUCT_SEASON && card.seasonId && !card.target) { services.openSeason({ seasonId: card.seasonId }); return; }
    if (UP_FIX && services.openVideo && card.target) { services.openVideo({ bvid: card.target.bvid, title: card.title, owner: '', durationSec: 0, views: 0, ...(card.cover ? { cover: card.cover } : {}) }, card.target.part); return; }
    shell.openModal('following-detail', child => {
      const panel = document.createElement('section');
      panel.className = 'tv-library-detail';
      const title = document.createElement('h2');
      title.id = 'following-detail-title';
      title.textContent = card.title;
      panel.setAttribute('aria-labelledby', title.id);
      const by = document.createElement('p');
      by.textContent = card.subtitle;
      const description = document.createElement('p');
      description.textContent = card.description;
      const actions = document.createElement('div');
      actions.className = 'tv-detail-actions';
      let opening = false;
      if(card.target&&services.play){const target={...card.target};actions.append(button('following-detail-play','播放视频',()=>{if(opening||child.signal.aborted)return;opening=true;void reader.cancel().then(()=>shell.closeOwnedModal(child)).then(()=>{if(!owner.signal.aborted&&!shell.restartRequired)services.play!(target);}).catch(()=>{description.textContent='读取资源关闭未确认，请返回并重新打开应用';});}));}
      if (card.seasonId) {
        const seasonId = card.seasonId;
        actions.append(button('following-detail-season', '查看选集与播放', () => { if (opening || child.signal.aborted)
          return; opening = true; void shell.closeOwnedModal(child).then(() => { if (!owner.signal.aborted && !shell.restartRequired)
          services.openSeason({ seasonId }); }); }));
      }
      actions.append(button('following-detail-back', '返回原卡', () => { void shell.closeOwnedModal(child); }));
      panel.append(title, by, description, actions);
      return panel;
    });
  }
  function wire(): void {
    const cards = [...grid.querySelectorAll<HTMLButtonElement>('button')], tab = 'following-tab-' + memory.tab;
    search.dataset.left = 'nav-' + route;
    search.dataset.right = search.dataset.focusId;
    search.dataset.up = search.dataset.focusId;
    search.dataset.down = privateContent || hot ? tab : 'following-login';
    login.dataset.left = 'nav-' + route;
    login.dataset.right = login.dataset.focusId;
    login.dataset.up = 'following-search';
    login.dataset.down = login.dataset.focusId;
    tabButtons.forEach((b, i) => { b.disabled = (!privateContent && b.dataset.focusId !== 'following-tab-hot') || blocked; b.setAttribute('aria-pressed', String(b.dataset.focusId === tab)); b.dataset.left = tabButtons[i - 1]?.dataset.focusId ?? 'nav-' + route; b.dataset.right = tabButtons[i + 1]?.dataset.focusId ?? b.dataset.focusId; b.dataset.up = 'following-search'; b.dataset.down = filterOn() ? activeFilter()! : cards[0]?.dataset.focusId ?? (!refresh.disabled ? 'following-refresh' : 'following-search'); });
    if (shortcut) {
      const last = tabButtons.at(-1)!;
      last.dataset.right = shortcut.dataset.focusId; shortcut.disabled = blocked;
      shortcut.dataset.left = last.dataset.focusId; shortcut.dataset.right = shortcut.dataset.focusId; shortcut.dataset.up = 'following-search';
      shortcut.dataset.down = cards[0]?.dataset.focusId ?? shortcut.dataset.focusId;
    }
    filters.hidden = !filterOn();
    filterButtons.forEach((b, i) => { b.setAttribute('aria-pressed', String(b.dataset.value === String(b.dataset.group === 'type' ? hotFilter.seasonType : hotFilter.span))); b.disabled = blocked; b.dataset.left = filterButtons[i - 1]?.dataset.focusId ?? 'nav-' + route; b.dataset.right = filterButtons[i + 1]?.dataset.focusId ?? b.dataset.focusId; b.dataset.up = 'following-tab-hot'; b.dataset.down = cards[0]?.dataset.focusId ?? b.dataset.focusId; });
    const enabled = [previous, next, refresh].filter(b => !b.disabled && !b.hidden);
    cards.forEach((b, i) => { b.dataset.left = cards[i - 1]?.dataset.focusId ?? 'nav-' + route; b.dataset.right = cards[i + 1]?.dataset.focusId ?? b.dataset.focusId; b.dataset.up = filterOn() ? activeFilter()! : tab; b.dataset.down = enabled[0]?.dataset.focusId ?? tab; });
    enabled.forEach((b, i) => { b.dataset.left = enabled[i - 1]?.dataset.focusId ?? 'nav-' + route; b.dataset.right = enabled[i + 1]?.dataset.focusId ?? b.dataset.focusId; b.dataset.up = cards[0]?.dataset.focusId ?? tab; b.dataset.down = b.dataset.focusId; });
    feed?.wire();
  }
  function controls(): void {
    source.textContent = memory.tab === 'hot' ? (filterButtons.length ? `${hotFilter.seasonType === 4 ? '国创' : '番剧'} · ${hotFilter.span === 'all' ? '按追番人数累计' : hotFilter.span === 'week' ? '公开排行近一周' : '公开排行近三日'}，不是个性化推荐` : '公开番剧排行（近三日），不是个性化推荐') : memory.tab === 'updates' ? '网页关注更新摘要 · 完整动态暂不可用' : memory.tab === 'bangumi' ? '当前账号的追番列表' : '当前账号的追剧列表';
    source.hidden = !open();
    search.disabled = blocked;
    previous.disabled = !open() || busy || blocked || page === 1;
    next.disabled = !open() || busy || blocked || noMore || page >= maxPage();
    refresh.disabled = !open() || busy || blocked;
    grid.hidden = !open(); login.hidden = privateContent || memory.tab === 'hot';
    wire();
  }
  async function read(target: number, replace = false, fresh = false): Promise<void> {
    if (!open() || owner.signal.aborted || blocked)
      return;
    const ticket = ++generation, kind = memory.tab;
    busy = true;
    const sourceKey=memory.tab;feed?.prepare(sourceKey,replace||fresh);const retained=!!feed&&grid.childElementCount>0;
    remember();
    if (replace) {
      grid.replaceChildren();
      noMore = true;
    }
    controls();
    status.textContent = '正在加载' + tabs.find(t => t[0] === kind)![1];
    const active = document.activeElement as HTMLElement | null, focused = active?.dataset.focusId ?? shell.navigation.current.anchor.focusId;
    try {
      const result = kind === 'hot' ? await hotReader!.read({ ...hotFilter }, target, fresh) : await reader.read({ kind }, target, fresh && kind === 'updates');
      if (owner.signal.aborted || ticket !== generation)
        return;
      page = result.page;
      memory.pages[kind] = page;
      noMore = result.noMore;
      const rendered=result.items.map(card => {
        const item = libraryCard({ ...card, id: 'following-card-' + card.id }, owner.signal, () => details(card), art);
        item.setAttribute('aria-label', `${card.badge}，${card.title}，${card.subtitle}`);
        return item;
      });
      if(feed)feed.commit(sourceKey,page,rendered,result.noMore,maxPage());else grid.replaceChildren(...rendered);
      status.textContent = result.items.length ? `${feed?'向下浏览更多':'第 '+page+' 页'}${result.total === undefined ? '' : ' · 共 ' + result.total + ' 项'}` : '暂无' + tabs.find(t => t[0] === kind)![1];
      if (page === maxPage() && !noMore)
        status.textContent += ' · 已到可浏览范围，可刷新读取近期内容';
      controls();
      const now = document.activeElement as HTMLElement | null;
      if (!retained && !document.querySelector('#overlays>section') && (now === active || now === document.body || node.contains(now))) {
        const anchor = memory.anchors[kind] ?? focused;
        const restored = anchor ? node.querySelector<HTMLButtonElement>(`[data-focus-id="${anchor}"]:not(:disabled)`) : null;
        (restored ?? grid.querySelector<HTMLButtonElement>('button') ?? refresh).focus();
      }
    }
    catch (error) {
      feed?.failure();
      if (owner.signal.aborted || ticket !== generation)
        return;
      const code = error instanceof DomainError ? error.code : 'unknown';
      if(code==='cancelled'){status.textContent='已保留当前内容，向下可继续浏览';return;}
      blocked = code === 'unknown';
      status.textContent = blocked ? '资源关闭未确认，请退出并重新打开应用' : code === 'login' ? '登录已失效，请重新扫码' : `内容暂时无法加载，可重试或返回${grid.childElementCount ? '；下方保留上次同类内容' : ''}`; status.title = `${kind === 'updates' ? 'follow' : 'pgc'}.${code}`;
    }
    finally {
      if (!owner.signal.aborted && ticket === generation) {
        busy = false;
        controls();
      }
    }
  }
  node.append(lead, toolbar, categories, filters, source, status, login, grid, paging);
  if (open())
    void read(page);
  else {
    status.textContent = route === 'catalog' ? '登录查看已追列表，也可直接搜索番剧影视' : '登录后查看关注更新，也可先搜索UP主';
    grid.hidden = paging.hidden = true;
    controls();
  }
  return node;
}
