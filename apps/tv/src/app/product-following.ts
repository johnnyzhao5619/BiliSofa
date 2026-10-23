import {ContinuousGrid,PRODUCT_BROWSE} from '../ui/continuous-grid.ts';
import { DomainError } from '../../../../packages/contracts/src/index.ts';
import type { AccountWorkspace } from './account-workspace.ts';
import type { ResourceOwner } from './resource-owner.ts';
import type { TvShell } from './tv-shell.ts';
import { ProductLibraryRead, type LibraryEntry } from './product-library-read.ts';
import { libraryCard } from '../ui/library-card.ts';
import { productButton } from './product-frame.ts';
export type FollowingTab = 'updates' | 'bangumi' | 'drama';
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
}
const tabs = [['updates', '关注更新'], ['bangumi', '我的追番'], ['drama', '我的追剧']] as const;
/** Same product cards; source-bound summaries never invent playable IDs. */
export function productFollowing(owner: ResourceOwner, shell: TvShell, route: 'following' | 'catalog', memory: FollowingMemory, services: Services): HTMLElement {
  const privateContent = services.workspace.state.kind === 'active';
  if (route === 'catalog' && memory.tab === 'updates')
    memory.tab = 'bangumi';
  const available = tabs.filter(([kind]) => route === 'following' || kind !== 'updates');
  const node = document.createElement('section');
  node.className = 'tv-following';
  // Guests start on the sign-in action, the page's only way to its content.
  node.dataset.initialFocusId = privateContent ? 'following-search' : 'following-login';
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
  const previous = button('following-previous', '上一页', () => { if (!busy && page > 1)
    void read(page - 1); });
  const next = button('following-next', '下一页', () => { if (!busy && !noMore && page < maxPage())
    void read(page + 1); });
  const refresh = button('following-refresh', '刷新', () => { if (!busy && !blocked)
    void read(1, true, true); });
  const login = button('following-login', route === 'following' ? '登录查看关注更新' : '登录查看追番与追剧', () => { void shell.navigateTop({ page: 'account' }); });
  paging.append(previous, next, refresh);
  const feed=PRODUCT_BROWSE?new ContinuousGrid(owner,grid,{load:page=>read(page),restored:value=>{page=value;memory.pages[memory.tab]=value;},top:()=> 'following-tab-'+memory.tab,left:()=> 'nav-'+route,bottom:()=> 'following-refresh'}):undefined;
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
    search.dataset.down = privateContent ? tab : 'following-login';
    login.dataset.left = 'nav-' + route;
    login.dataset.right = login.dataset.focusId;
    login.dataset.up = 'following-search';
    login.dataset.down = login.dataset.focusId;
    tabButtons.forEach((b, i) => { b.disabled = !privateContent || blocked; b.setAttribute('aria-pressed', String(b.dataset.focusId === tab)); b.dataset.left = tabButtons[i - 1]?.dataset.focusId ?? 'nav-' + route; b.dataset.right = tabButtons[i + 1]?.dataset.focusId ?? b.dataset.focusId; b.dataset.up = 'following-search'; b.dataset.down = cards[0]?.dataset.focusId ?? (!refresh.disabled ? 'following-refresh' : 'following-search'); });
    const enabled = [previous, next, refresh].filter(b => !b.disabled && !b.hidden);
    cards.forEach((b, i) => { b.dataset.left = cards[i - 1]?.dataset.focusId ?? 'nav-' + route; b.dataset.right = cards[i + 1]?.dataset.focusId ?? b.dataset.focusId; b.dataset.up = tab; b.dataset.down = enabled[0]?.dataset.focusId ?? tab; });
    enabled.forEach((b, i) => { b.dataset.left = enabled[i - 1]?.dataset.focusId ?? 'nav-' + route; b.dataset.right = enabled[i + 1]?.dataset.focusId ?? b.dataset.focusId; b.dataset.up = cards[0]?.dataset.focusId ?? tab; b.dataset.down = b.dataset.focusId; });
    feed?.wire();
  }
  function controls(): void {
    source.textContent = memory.tab === 'updates' ? '网页关注更新摘要 · 完整动态暂不可用' : memory.tab === 'bangumi' ? '当前账号的追番列表' : '当前账号的追剧列表';
    search.disabled = blocked;
    previous.disabled = !privateContent || busy || blocked || page === 1;
    next.disabled = !privateContent || busy || blocked || noMore || page >= maxPage();
    refresh.disabled = !privateContent || busy || blocked;
    wire();
  }
  async function read(target: number, replace = false, fresh = false): Promise<void> {
    if (!privateContent || owner.signal.aborted || blocked)
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
      const result = await reader.read({ kind }, target, fresh && kind === 'updates');
      if (owner.signal.aborted || ticket !== generation)
        return;
      page = result.page;
      memory.pages[kind] = page;
      noMore = result.noMore;
      const rendered=result.items.map(card => {
        const item = libraryCard({ ...card, id: 'following-card-' + card.id }, owner.signal, () => details(card));
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
  node.append(lead, toolbar, categories, source, status, login, grid, paging);
  if (privateContent)
    void read(page);
  else {
    status.textContent = route === 'catalog' ? '登录查看已追列表，也可直接搜索番剧影视' : '登录后查看关注更新，也可先搜索UP主';
    grid.hidden = paging.hidden = true;
    controls();
  }
  return node;
}
