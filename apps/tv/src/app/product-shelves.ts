import type { HoldHandlers } from '../ui/hold.ts';
import { DomainError, type PopularCard } from '../../../../packages/contracts/src/index.ts';
import type { ContentQuery } from '../../../../packages/contracts/src/content.ts';
import type { ResourceOwner } from './resource-owner.ts';
import { PublicContentRuntime } from '../platform/content-runtime.ts';
import { CoverArt } from '../platform/cover-art.ts';
import { contentCard } from '../ui/content-card.ts';
import { productButton } from './product-frame.ts';
import { contentLoadFailureText } from './user-messages.ts';
/** Structural subset of the home types; kept local so shelves never import the home page. */
interface HomeSource { kind: 'popular' | 'ranking' | 'category' | 'recommend' | 'search'; page: number; }
interface HomeServices { recommend?(page: number, signal: AbortSignal, refresh: boolean): Promise<{ items: PopularCard[] }>; }
interface Shelf { key: string; label: string; source: HomeSource; pages: number; node: HTMLElement; row: HTMLElement; status: HTMLElement; more: HTMLButtonElement; retry: HTMLButtonElement; state: 'idle' | 'loading' | 'ready' | 'failed'; }
/** Home shelves (ADR-091): rows load one at a time, the first at mount and each next
 * one when focus reaches the row above. A failed row keeps its own retry; no automatic
 * retries, so rate-limited sources (API -352/HTTP 412) are not hammered. */
export function homeShelves(owner: ResourceOwner, services: HomeServices, changed: () => void, actions: (card: PopularCard) => { choose(): void; hold: HoldHandlers }, openGrid: (source: HomeSource, from: string) => void, browseCategories: () => void, top: () => string | undefined): { node: HTMLElement; first(): string | undefined; firstRowIds(): string[] } {
  const node = document.createElement('div'); node.className = 'tv-shelves';
  const runtime = new PublicContentRuntime(), art = new CoverArt(), controller = new AbortController();
  owner.add('home-shelves', async () => { controller.abort(); art.close(); if (!(await runtime.close()).closed) throw new DomainError('unknown'); });
  const specs: { key: string; label: string; source: HomeSource; pages: number }[] = [
    ...(services.recommend ? [{ key: 'recommend', label: '为你推荐', source: { kind: 'recommend' as const, page: 1 }, pages: 1 }] : []),
    { key: 'popular', label: '热门视频', source: { kind: 'popular', page: 1 }, pages: 2 },
    { key: 'ranking', label: '排行榜', source: { kind: 'ranking', page: 1 }, pages: 3 },
  ];
  /** ADR-114: card-sized placeholders that hold a row's place until its cards arrive; they are never focusable. */
  const skeletons = () => Array.from({ length: 5 }, () => { const card = document.createElement('div'), picture = document.createElement('span'); card.className = 'tv-card-skeleton'; card.setAttribute('aria-hidden', 'true'); picture.className = 'tv-card-picture'; card.append(picture, document.createElement('i'), document.createElement('i')); return card; });
  const shelves: Shelf[] = specs.map(spec => {
    const section = document.createElement('section'), heading = document.createElement('h2'), row = document.createElement('div'), status = document.createElement('p');
    section.className = 'tv-shelf'; heading.textContent = spec.label; row.className = 'tv-shelf-row'; row.setAttribute('aria-label', spec.label); status.className = 'tv-shelf-status'; status.setAttribute('role', 'status');
    const more = productButton(`shelf-more-${spec.key}`, '查看更多', () => { if (!owner.signal.aborted) openGrid({ ...spec.source }, more.dataset.focusId!); });
    more.className = 'tv-shelf-more';
    const retry = productButton(`shelf-retry-${spec.key}`, '重试', () => { void load(shelf); }); retry.hidden = true;
    row.append(...skeletons()); section.append(heading, row, status);
    const shelf: Shelf = { ...spec, node: section, row, status, more, retry, state: 'idle' };
    return shelf;
  });
  const categories = productButton('shelf-categories', '浏览分区', () => { if (!owner.signal.aborted) browseCategories(); });
  const tail = document.createElement('div'); tail.className = 'tv-shelf-tail'; tail.append(categories);
  node.append(...shelves.map(s => s.node), tail);
  let queue = Promise.resolve();
  /** Row stops in order: cards, then retry (failed rows) and “查看更多”. */
  function cards(shelf: Shelf): HTMLButtonElement[] { return [...shelf.row.querySelectorAll<HTMLButtonElement>('button[data-focus-id]')].filter(b => !b.hidden); }
  function wire(): void {
    const rows = shelves.map(cards);
    const at = (r: number, j: number) => { const list = rows[r]; if (!list) return undefined; return (list.length ? list[Math.min(j, list.length - 1)] : undefined)?.dataset.focusId; };
    rows.forEach((list, r) => list.forEach((b, j) => {
      b.dataset.left = list[j - 1]?.dataset.focusId ?? 'nav-home';
      b.dataset.right = list[j + 1]?.dataset.focusId ?? b.dataset.focusId;
      b.dataset.up = (r ? at(r - 1, j) : top()) ?? b.dataset.focusId;
      b.dataset.down = at(r + 1, j) ?? (r + 1 < rows.length ? b.dataset.focusId : 'shelf-categories');
    }));
    categories.dataset.up = rows.at(-1)?.[0]?.dataset.focusId ?? categories.dataset.focusId; categories.dataset.left = 'nav-home';
    categories.dataset.right = categories.dataset.down = categories.dataset.focusId;
  }
  async function read(shelf: Shelf): Promise<PopularCard[]> {
    const signal = controller.signal;
    if (shelf.source.kind === 'recommend' && services.recommend) return (await services.recommend(1, signal, false)).items;
    const items: PopularCard[] = [];
    for (let page = 1; page <= shelf.pages; page++) {
      const request: ContentQuery = { route: shelf.source.kind === 'ranking' ? 'ranking' : 'popular', page };
      const result = await runtime.read(request, signal); items.push(...result.items);
      if (result.noMore) break;
    }
    return items;
  }
  function load(shelf: Shelf): Promise<void> {
    if (shelf.state === 'loading' || shelf.state === 'ready') return queue;
    shelf.state = 'loading'; shelf.status.textContent = '正在加载'; shelf.retry.hidden = true;
    // A retry keeps the one-line failed layout until cards arrive, so the row does not jump while it reloads.
    shelf.node.classList.toggle('tv-shelf-loading', !!shelf.row.querySelector('.tv-card-skeleton'));
    queue = queue.then(async () => {
      if (owner.signal.aborted) return;
      try {
        const items = await read(shelf); if (owner.signal.aborted) return;
        const seen = new Set<string>();
        const buttons = items.filter(card => !seen.has(card.bvid) && seen.add(card.bvid)).slice(0, 12).map(card => { const a = actions(card); return contentCard(card, `shelf-${shelf.key}-${card.bvid}`, art, owner.signal, () => a.choose(), a.hold); });
        shelf.row.replaceChildren(...buttons, shelf.more); shelf.state = 'ready'; shelf.node.classList.remove('tv-shelf-loading', 'tv-shelf-failed'); shelf.status.textContent = buttons.length ? '' : '暂时没有内容';
        wire(); changed();
        // The first loaded row takes focus only if the viewer has not moved anywhere yet.
        const active = document.activeElement as HTMLElement | null;
        if (shelf === shelves[0] && buttons[0] && !top() && (active === document.body || active?.dataset.focusId === 'nav-home') && !document.querySelector('#overlays>section')) buttons[0].focus();
      } catch (error) {
        if (owner.signal.aborted) return;
        // ADR-114: a failed row is one line: the reason, then 重试 and 查看更多 as ordinary buttons.
        shelf.state = 'failed'; shelf.node.classList.remove('tv-shelf-loading'); shelf.node.classList.add('tv-shelf-failed'); shelf.status.textContent = contentLoadFailureText(false); shelf.status.title = error instanceof DomainError ? error.code : 'invalid';
        shelf.row.replaceChildren(shelf.retry, shelf.more); shelf.retry.hidden = false; wire();
      }
    });
    return queue;
  }
  // Load the next row as soon as focus enters a row; never more than one row ahead.
  const ahead = (event: FocusEvent) => { const index = shelves.findIndex(s => s.node.contains(event.target as Node)); const next = shelves[index + 1]; if (index >= 0 && next?.state === 'idle') void load(next); };
  node.addEventListener('focusin', ahead); owner.add('home-shelves-focus', () => node.removeEventListener('focusin', ahead));
  if (shelves[0]) void load(shelves[0]);
  return { node, first: () => cards(shelves[0]!)[0]?.dataset.focusId, firstRowIds: () => cards(shelves[0]!).map(b => b.dataset.focusId!) };
}
