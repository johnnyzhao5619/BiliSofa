import {ContinuousGrid} from '../ui/continuous-grid.ts';
import { DomainError, type PopularCard } from '../../../../packages/contracts/src/index.ts';
import type { SearchHistoryStore } from '../../../../packages/contracts/src/search-history.ts';
import type { ProfileStore } from '../../../../packages/contracts/src/local-profile.ts';
import type { QueueStore } from '../../../../packages/contracts/src/local-queue.ts';
import type { ResourceOwner } from './resource-owner.ts';
import type { TvShell } from './tv-shell.ts';
import { ProductSearchRead, ProductSearchError, type SearchEntry, type SearchType } from './product-search-read.ts';
import { productButton } from './product-frame.ts';
import { searchKeyword } from './search-keyword.ts';
import { hotSearch } from './hot-search.ts';
import { historyPanel } from './search-history.ts';
import { CoverArt } from '../platform/cover-art.ts';
import { libraryCard } from '../ui/library-card.ts';
import { clockTime } from '../ui/content-card.ts';
import { keywordPad } from './keyword-pad.ts';
import { frameBack } from './product-frame.ts';
export interface SearchMemory {
  keyword?: string;
  type: SearchType;
  pages: Partial<Record<SearchType, number>>;
}
interface Services {
  history: SearchHistoryStore;
  profile: ProfileStore;
  queue: QueueStore;
  feedback: HTMLElement;
  play(card: PopularCard, position: number): void;
  openSeason(card: {
    seasonId: string;
  }): void;
  /** ADR-103: the shared video detail page and the UP page. */
  openVideo?(card: PopularCard): void;
  openUp?(up: { mid: string; name: string; fans: number; videos: number }): void;
}
const types = [['video', '视频'], ['up', 'UP主'], ['pgc', '番剧影视']] as const;
/** Shared query and type state; no SDK/network globals or page-level key owner. */
export function productSearch(owner: ResourceOwner, shell: TvShell, memory: SearchMemory, services: Services): HTMLElement {
  const button = (id: string, label: string, action: () => void) => productButton(id, label, () => { if (!owner.signal.aborted) action(); });
  const node = document.createElement('section');
  node.className = 'tv-search';
  node.dataset.initialFocusId = 'search-input';
  const title = document.createElement('h1');
  title.textContent = '搜索';
  title.id = 'tv-search-title';
  node.setAttribute('aria-labelledby', title.id);
  const lead = document.createElement('p');
  lead.className = 'tv-eyebrow';
  lead.textContent = '视频、UP主、番剧影视';
  const tools = document.createElement('div');
  tools.className = 'tv-search-actions';
  const tabs = document.createElement('div');
  tabs.className = 'tv-search-types';
  tabs.setAttribute('role', 'group');
  tabs.setAttribute('aria-label', '搜索类型');
  const status = document.createElement('p');
  status.className = 'tv-status';
  status.setAttribute('role', 'status');
  const grid = document.createElement('div');
  grid.className = 'tv-library-grid';
  grid.setAttribute('aria-label', '搜索结果');
  const paging = document.createElement('div');
  paging.className = 'tv-paging';
  const reader = new ProductSearchRead(owner);
  let art = new CoverArt(), epoch = 0, busy = false, blocked = false, committedPage = memory.pages[memory.type] ?? 1, noMore = true;
  const closeArt = () => art.close();
  owner.signal.addEventListener('abort', closeArt, { once: true });
  owner.add('search-art', () => { owner.signal.removeEventListener('abort', closeArt); art.close(); });
  function accepted(keyword: string): void {
    if (owner.signal.aborted || blocked)
      return;
    memory.keyword = keyword;
    memory.pages = {};
    if (services.history.remember(keyword) !== 'saved')
      services.feedback.textContent = '搜索历史保存未确认，可在设置核查';
    void read(1, true);
  }
  const input = button('search-input', '输入关键词', () => shell.openModal('search-keyword', child => searchKeyword(child, shell, accepted, '内容'), 'keyword-key-a'));
  const hot = button('search-hot', '热搜', () => shell.openModal('search-hot', child => hotSearch(child, shell, accepted), 'hot-back'));
  const history = button('search-history', '搜索历史', () => shell.openModal('search-history', child => historyPanel(child, shell, services.history, accepted), 'history-back'));
  tools.append(input, hot, history);
  // One-page search (ADR-092): keys and candidates stay on the left; choosing a word searches at once.
  let focusResults = false;
  const recent = document.createElement('div'); recent.className = 'tv-search-recent'; recent.setAttribute('aria-label', '最近搜索');
  const pad = keywordPad(owner, keyword => { focusResults = true; accepted(keyword); }, () => { delete memory.keyword; memory.pages = {}; void read(1, true); }, memory.keyword ?? '');
  if (pad) { input.hidden = true; node.dataset.initialFocusId = pad.firstId; frameBack.set(node, () => pad.back()); }
  function showRecent(): void {
    if (!pad) return; recent.replaceChildren(); recent.hidden = !!memory.keyword;
    const saved = services.history.read(); if (memory.keyword || saved.kind !== 'ok' || !saved.value.enabled) return;
    recent.append(...saved.value.terms.slice(0, 8).map((term, i) => button('search-recent-' + i, term, () => { pad.set(term); focusResults = true; accepted(term); })));
  }
  const tabButtons = types.map(([type, label]) => button('search-type-' + type, label, () => {
    if (owner.signal.aborted || blocked || memory.type === type)
      return;
    memory.type = type;
    void read(memory.pages[type] ?? 1, true);
  }));
  tabs.append(...tabButtons);
  const previous = button('search-previous', '上一页', () => { if (!busy && committedPage > 1)
    void read(committedPage - 1); });
  const next = button('search-next', '下一页', () => { if (!busy && !noMore && committedPage < 10)
    void read(committedPage + 1); });
  const refresh = button('search-refresh', '刷新', () => { if (!busy && memory.keyword && !blocked)
    void read(1,true); });
  paging.append(previous, next, refresh);
  const feed=new ContinuousGrid(owner,grid,{load:page=>read(page),restored:page=>{committedPage=page;memory.pages[memory.type]=page;},top:()=> 'search-type-'+memory.type,left:()=> 'keyword-key-f',bottom:()=> 'search-refresh'});
  if(feed)previous.hidden=next.hidden=true;
  function detail(entry: SearchEntry): void {
    if (owner.signal.aborted || busy && !feed)
      return;
    if (entry.kind === 'video' && services.openVideo) { services.openVideo(entry.card); return; }
    if (entry.kind === 'up' && services.openUp) { services.openUp({ mid: entry.card.uid, name: entry.card.name, fans: entry.card.fans, videos: entry.card.videos }); return; }
    shell.openModal('search-detail', child => {
      const panel = document.createElement('section');
      panel.className = 'tv-detail';
      const heading = document.createElement('h2');
      heading.id = 'search-detail-title';
      heading.textContent = entry.kind === 'up' ? entry.card.name : entry.card.title;
      panel.setAttribute('aria-labelledby', heading.id);
      const description = document.createElement('p');
      description.className = 'tv-secondary';
      const actions = document.createElement('div');
      actions.className = 'tv-detail-actions';
      const result = document.createElement('p');
      result.setAttribute('role', 'status');
      let opening = false;
      const launch = (action: () => void) => { if (opening || child.signal.aborted)
        return; opening = true; void shell.closeOwnedModal(child).then(() => { if (!owner.signal.aborted && !shell.restartRequired)
        action(); }); };
      const video = (card: PopularCard) => {
        const saved = services.profile.readPart(card.bvid, 1), at = saved.kind === 'ok' && saved.value && saved.value.timeMs < card.durationSec * 1000 ? saved.value.timeMs : 0;
        actions.append(button('search-detail-play', at ? '继续观看 · ' + clockTime(at / 1000) : '播放', () => launch(() => services.play(card, at))));
        if (at)
          actions.append(button('search-detail-start', '从头播放', () => launch(() => services.play(card, 0))));
        actions.append(button('search-detail-queue', '加入本机队列 · 首P', () => { if (child.signal.aborted)
          return; const saved = services.queue.add({ bvid: card.bvid, title: card.title }); result.textContent = saved === 'saved' ? '已加入本机队列' : saved === 'full' ? '本机队列已满' : '本机队列保存未确认'; }));
      };
      if (entry.kind === 'video') {
        description.textContent = `${entry.card.owner} · ${clockTime(entry.card.durationSec)} · 视频首P`;
        video(entry.card);
      }
      if (entry.kind === 'up') {
        description.textContent = `${entry.card.videos} 投稿 · ${entry.card.fans} 粉丝 · 搜索附带信息`;
        const note = document.createElement('p');
        note.textContent = entry.card.preview ? '附带视频预览：' + entry.card.preview.title : '本次搜索没有附带视频预览';
        panel.append(note);
        if (entry.card.preview)
          video(entry.card.preview);
      }
      if (entry.kind === 'pgc') {
        const card = entry.card;
        description.textContent = [card.category || '类型未提供', card.region || '地区未提供', card.status || '更新未提供', card.score === undefined ? '评分未提供' : '评分 ' + card.score, card.tags].filter(Boolean).join(' · ');
        actions.append(button('search-detail-season', '查看选集与播放', () => launch(() => services.openSeason(card))));
      }

      // Back closes the detail; a visible return remains only when the entry offers no action.
      if (!actions.querySelector('button')) actions.append(button('search-detail-back', '返回搜索结果', () => { void shell.closeOwnedModal(child); }));
      panel.prepend(heading, description);
      panel.append(actions, result);
      return panel;
    });
  }
  function wire(): void {
    const buttons = [...grid.querySelectorAll<HTMLButtonElement>('button')], typeId = 'search-type-' + memory.type;
    if (pad) { showRecent(); for (const b of [...recent.querySelectorAll<HTMLButtonElement>('button')]) { delete b.dataset.left; delete b.dataset.right; } }
    // The hidden legacy input must not be a direction target in the one-page layout.
    (pad ? [hot, history] : [input, hot, history]).forEach((b, i, all) => { b.dataset.left = all[i - 1]?.dataset.focusId ?? 'nav-search'; b.dataset.right = all[i + 1]?.dataset.focusId ?? b.dataset.focusId; b.dataset.up = b.dataset.focusId; b.dataset.down = typeId; });
    tabButtons.forEach((b, i) => { b.setAttribute('aria-pressed', String(b.dataset.focusId === typeId)); b.disabled = blocked; b.dataset.left = tabButtons[i - 1]?.dataset.focusId ?? 'nav-search'; b.dataset.right = tabButtons[i + 1]?.dataset.focusId ?? b.dataset.focusId; b.dataset.up = 'search-input'; b.dataset.down = buttons[0]?.dataset.focusId ?? 'search-input'; });
    const enabled = [previous, next, refresh].filter(b => !b.disabled && !b.hidden);
    buttons.forEach((b, i) => { b.dataset.left = buttons[i - 1]?.dataset.focusId ?? 'nav-search'; b.dataset.right = buttons[i + 1]?.dataset.focusId ?? b.dataset.focusId; b.dataset.up = typeId; b.dataset.down = enabled[0]?.dataset.focusId ?? typeId; });
    enabled.forEach((b, i) => { b.dataset.left = enabled[i - 1]?.dataset.focusId ?? 'nav-search'; b.dataset.right = enabled[i + 1]?.dataset.focusId ?? b.dataset.focusId; b.dataset.up = buttons[0]?.dataset.focusId ?? typeId; b.dataset.down = b.dataset.focusId; });
    feed?.wire();
    // The left edge of the result column belongs to the keyword pad. It is explicit: a
    // geometric search from 热搜 would find the nav rail at the same height first.
    if (pad) for (const b of [hot, ...tabButtons, ...enabled, recent.querySelector<HTMLButtonElement>('button')]) { if (b && (!b.dataset.left || b.dataset.left === 'nav-search')) b.dataset.left = 'keyword-key-f'; }
    if (pad) for (const b of buttons.filter((_, i) => i % 4 === 0)) b.dataset.left = 'keyword-key-f';
    if (pad) for (const b of tabButtons) b.dataset.up = 'search-hot';
  }
  function controls(): void {
    input.textContent = memory.keyword ? '关键词：' + memory.keyword : '输入关键词';
    previous.disabled = busy || blocked || committedPage <= 1;
    next.disabled = busy || blocked || noMore || committedPage >= 10;
    refresh.disabled = busy || blocked || !memory.keyword; refresh.hidden = !memory.keyword;
    input.disabled = hot.disabled = history.disabled = blocked;
    wire();
  }
  async function read(page: number, replace = false): Promise<void> {
    if (owner.signal.aborted || blocked)
      return;
    const ticket = ++epoch, keyword = memory.keyword, type = memory.type;
    busy = true;
    const sourceKey=JSON.stringify([keyword,type]);feed?.prepare(sourceKey,replace);const retained=!!feed&&grid.childElementCount>0;
    if (replace) {
      committedPage = memory.pages[type] ?? 1;
      if(!feed)art.close();
      art = new CoverArt();
      grid.replaceChildren();
      noMore = true;
    }
    controls();
    if (!keyword) {
      busy = false;
      status.textContent = '输入首字母选词，或从热搜、历史开始';
      controls();
      return;
    }
    const active = document.activeElement as HTMLElement | null, focusId = active?.dataset.focusId ?? shell.navigation.current.anchor.focusId;
    status.textContent = `正在搜索“${keyword}” · ${types.find(t => t[0] === type)![1]}`;
    try {
      const result = await reader.read(type, keyword, page);
      if (owner.signal.aborted || ticket !== epoch)
        return;
      if(!feed)art.close();
      art = new CoverArt();
      committedPage = page;
      memory.pages[type] = page;
      noMore = result.noMore;
      const rendered=result.items.map((entry, i) => {
        const title = entry.kind === 'up' ? entry.card.name : entry.card.title;
        const subtitle = entry.kind === 'video' ? `${entry.card.owner} · ${clockTime(entry.card.durationSec)}` : entry.kind === 'up' ? `${entry.card.videos} 投稿 · ${entry.card.fans} 粉丝` : `${entry.card.category || '番剧影视'} · ${entry.card.status || '更新未提供'}`;
        const cover = entry.kind === 'video' ? entry.card.cover : undefined;
        return libraryCard({ id: 'search-card-' + (feed?(page-1)*4+i:i), title, subtitle, badge: type === 'up' ? 'UP主' : type === 'pgc' ? '番剧影视' : '视频', ...(cover ? { cover } : {}) }, owner.signal, () => detail(entry), art);
      });
      if(feed){const currentArt=art;feed.commit(sourceKey,page,rendered,result.noMore,10,1,()=>currentArt.close());}else grid.replaceChildren(...rendered);
      status.textContent = `“${keyword}” · ${types.find(t => t[0] === type)![1]} · ${result.items.length ? feed?'向下浏览更多':'第 ' + page + ' 页' : '暂无结果'}${page === 10 && !noMore ? ' · 已到本次浏览上限' : ''}`;
      controls();
      const now = document.activeElement as HTMLElement | null;
      if (!retained && !document.querySelector('#overlays>section') && (now === active || now === document.body || node.contains(now))) {
        const restored = focusId ? node.querySelector<HTMLElement>(`[data-focus-id="${focusId}"]:not(:disabled)`) : null;
        (focusResults ? grid.querySelector<HTMLButtonElement>('button') ?? restored : restored ?? grid.querySelector<HTMLButtonElement>('button') ?? input)?.focus(); focusResults = false;
      }
    }
    catch (error) {
      feed?.failure();
      if (owner.signal.aborted || ticket !== epoch)
        return;
      blocked = error instanceof DomainError && error.code === 'unknown'; focusResults = false;
      const code = error instanceof ProductSearchError ? error.detail : error instanceof DomainError ? error.code : 'invalid';
      status.textContent = blocked ? '资源关闭未确认，请退出并重新打开应用' : `搜索暂时无法完成，可重试或更换关键词${grid.childElementCount ? '；下方保留上次同类结果' : ''}`; status.title = String(code);
    }
    finally {
      if (!owner.signal.aborted && ticket === epoch) {
        busy = false;
        controls();
      }
    }
  }
  if (pad) { const main = document.createElement('div'), split = document.createElement('div'); main.className = 'tv-search-main'; split.className = 'tv-search-split'; main.append(tools, tabs, status, recent, grid, paging); split.append(pad.node, main); node.append(lead, title, split); }
  else node.append(lead, title, tools, tabs, status, grid, paging);
  controls();
  void read(memory.pages[memory.type] ?? 1);
  return node;
}
