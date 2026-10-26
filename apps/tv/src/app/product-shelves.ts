import type { HoldHandlers } from '../ui/hold.ts';
import { DomainError, type PopularCard } from '../../../../packages/contracts/src/index.ts';
import type { ContentQuery } from '../../../../packages/contracts/src/content.ts';
import { PUBLIC_CATEGORIES } from '../../../../packages/contracts/src/category-data.ts';
import type { CategoryId } from '../../../../packages/contracts/src/categories.ts';
import type { SnapshotShelf } from '../../../../packages/contracts/src/home-snapshot.ts';
import type { ResourceOwner } from './resource-owner.ts';
import { PublicContentRuntime } from '../platform/content-runtime.ts';
import { CoverArt } from '../platform/cover-art.ts';
import { homeSnapshots, type HomeSnapshots } from '../platform/home-snapshot-store.ts';
import { contentCard } from '../ui/content-card.ts';
import { productButton } from './product-frame.ts';
import { contentLoadFailureText } from './user-messages.ts';
/** Structural subset of the home types; kept local so shelves never import the home page. */
interface HomeSource { kind: 'popular' | 'ranking' | 'category' | 'recommend' | 'search'; page: number; categoryId?: CategoryId; }
interface HomeServices { account?: string; recommend?(page: number, signal: AbortSignal, refresh: boolean): Promise<{ items: PopularCard[] }>; }
interface Shelf { key: SnapshotShelf; label: string; source: HomeSource; pages: number; node: HTMLElement; row: HTMLElement; status: HTMLElement; more: HTMLButtonElement; retry: HTMLButtonElement;
  state: 'idle' | 'loading' | 'ready' | 'failed'; items: PopularCard[]; shown: number; nextPage: number; extending: boolean; }
const ROW = 12, REUSE_MS = 300000, POPULAR_PAGES = 3;
/** ADR-116: what this run last read per row, so returning home within five minutes reads nothing. */
const recent = new Map<string, { at: number; items: PopularCard[] }>();
/** Home shelves (ADR-091): rows load one at a time, the first at mount and each next
 * one when focus reaches the row above. A failed row keeps its own retry; no automatic
 * retries, so rate-limited sources (API -352/HTTP 412) are not hammered.
 * ADR-116: a row first shows the last snapshot (no older than a day) and is replaced in place when its read
 * lands, keeping the focused card; a failed refresh keeps the snapshot and says so. */
export function homeShelves(owner: ResourceOwner, services: HomeServices, changed: () => void, actions: (card: PopularCard) => { choose(): void; hold: HoldHandlers }, openGrid: (source: HomeSource, from: string) => void, top: () => string | undefined, snapshots: HomeSnapshots = homeSnapshots()): { node: HTMLElement; first(): string | undefined; firstRowIds(): string[]; opening(): string | undefined } {
  const node = document.createElement('div'); node.className = 'tv-shelves';
  const runtime = new PublicContentRuntime(), art = new CoverArt(), controller = new AbortController();
  owner.add('home-shelves', async () => { controller.abort(); art.close(); if (!(await runtime.close()).closed) throw new DomainError('unknown'); });
  const specs: { key: SnapshotShelf; label: string; source: HomeSource; pages: number }[] = [
    ...(services.recommend && services.account ? [{ key: 'recommend' as const, label: '为你推荐', source: { kind: 'recommend' as const, page: 1 }, pages: 1 }] : []),
    { key: 'popular', label: '热门视频', source: { kind: 'popular', page: 1 }, pages: 2 },
    { key: 'ranking', label: '排行榜', source: { kind: 'ranking', page: 1 }, pages: 3 },
  ];
  const account = (shelf: Shelf) => shelf.key === 'recommend' ? services.account : undefined;
  const memoKey = (shelf: Shelf) => `${shelf.key}|${account(shelf) ?? ''}`;
  /** ADR-114: card-sized placeholders that hold a row's place until its cards arrive; they are never focusable. */
  const skeletons = () => Array.from({ length: 5 }, () => { const card = document.createElement('div'), picture = document.createElement('span'); card.className = 'tv-card-skeleton'; card.setAttribute('aria-hidden', 'true'); picture.className = 'tv-card-picture'; card.append(picture, document.createElement('i'), document.createElement('i')); return card; });
  const shelves: Shelf[] = specs.map(spec => {
    const section = document.createElement('section'), heading = document.createElement('h2'), row = document.createElement('div'), status = document.createElement('p');
    section.className = 'tv-shelf'; heading.textContent = spec.label; row.className = 'tv-shelf-row'; row.setAttribute('aria-label', spec.label); status.className = 'tv-shelf-status'; status.setAttribute('role', 'status');
    const more = productButton(`shelf-more-${spec.key}`, '查看更多', () => { if (!owner.signal.aborted) openGrid({ ...spec.source }, more.dataset.focusId!); });
    more.className = 'tv-shelf-more';
    const retry = productButton(`shelf-retry-${spec.key}`, '重试', () => { void load(shelf); }); retry.hidden = true;
    row.append(...skeletons()); section.append(heading, row, status);
    const shelf: Shelf = { ...spec, node: section, row, status, more, retry, state: 'idle', items: [], shown: 0, nextPage: spec.pages + 1, extending: false };
    return shelf;
  });
  // ADR-116: the categories are one row of direct entries under the rankings (no picker in between).
  const categoryRow = document.createElement('section'), categoryHeading = document.createElement('h2'), categoryButtons = document.createElement('div');
  categoryRow.className = 'tv-shelf tv-category-shelf'; categoryHeading.textContent = '分区'; categoryButtons.className = 'tv-shelf-row tv-category-row'; categoryButtons.setAttribute('aria-label', '分区');
  categoryButtons.append(...PUBLIC_CATEGORIES.map(item => { const b = productButton(`shelf-category-${item.id}`, item.label, () => { if (!owner.signal.aborted) openGrid({ kind: 'category', page: 1, categoryId: item.id as CategoryId }, b.dataset.focusId!); }); return b; }));
  categoryRow.append(categoryHeading, categoryButtons);
  node.append(...shelves.map(s => s.node), categoryRow);
  let queue = Promise.resolve(), mounted = false;
  // The page wires itself once this returns; snapshot rows drawn while mounting must not call back into it first.
  const notify = () => { if (mounted) changed(); };
  /** Row stops in order: cards, then retry (failed rows) and “查看更多”. */
  function cards(shelf: Shelf): HTMLButtonElement[] { return [...shelf.row.querySelectorAll<HTMLButtonElement>('button[data-focus-id]')].filter(b => !b.hidden); }
  function wire(): void {
    const rows = [...shelves.map(cards), [...categoryButtons.querySelectorAll<HTMLButtonElement>('button')]];
    const at = (r: number, j: number) => { const list = rows[r]; if (!list) return undefined; return (list.length ? list[Math.min(j, list.length - 1)] : undefined)?.dataset.focusId; };
    // A row still loading has no stops (only skeletons); Up and Down pass over it to the nearest row that has some.
    const near = (r: number, step: -1 | 1) => { for (let k = r + step; k >= 0 && k < rows.length; k += step) if (rows[k]!.length) return k; return -1; };
    rows.forEach((list, r) => list.forEach((b, j) => {
      const above = near(r, -1), below = near(r, 1);
      b.dataset.left = list[j - 1]?.dataset.focusId ?? 'nav-home';
      b.dataset.right = list[j + 1]?.dataset.focusId ?? b.dataset.focusId;
      b.dataset.up = (above >= 0 ? at(above, j) : top()) ?? b.dataset.focusId;
      b.dataset.down = (below >= 0 ? at(below, j) : undefined) ?? b.dataset.focusId;
    }));
  }
  const unique = (items: readonly PopularCard[]) => { const seen = new Set<string>(); return items.filter(card => !seen.has(card.bvid) && seen.add(card.bvid)); };
  const button = (shelf: Shelf, card: PopularCard) => { const a = actions(card); return contentCard(card, `shelf-${shelf.key}-${card.bvid}`, art, owner.signal, () => a.choose(), a.hold); };
  /** Shows the first `count` items. Replacing a row the viewer is in keeps the same card focused (or the same place). */
  function show(shelf: Shelf, items: PopularCard[], count: number): void {
    const before = cards(shelf).filter(b => b !== shelf.more && b !== shelf.retry).map(b => b.dataset.focusId);
    const wanted = items.slice(0, count).map(card => `shelf-${shelf.key}-${card.bvid}`);
    shelf.items = items; shelf.shown = Math.min(count, items.length);
    shelf.node.classList.remove('tv-shelf-loading', 'tv-shelf-failed');
    if (before.length === wanted.length && before.every((id, i) => id === wanted[i]) && shelf.row.contains(shelf.more)) return; // same cards: no repaint
    const active = document.activeElement as HTMLElement | null, inRow = !!active && shelf.row.contains(active);
    const was = inRow ? active!.dataset.focusId : undefined, index = inRow ? cards(shelf).indexOf(active as HTMLButtonElement) : -1, scroll = shelf.row.scrollLeft;
    const buttons = items.slice(0, shelf.shown).map(card => button(shelf, card));
    shelf.row.replaceChildren(...buttons, shelf.more);
    wire(); notify();
    if (inRow) { const list = cards(shelf); (list.find(b => b.dataset.focusId === was) ?? list[Math.min(index, list.length - 1)])?.focus({ preventScroll: true }); shelf.row.scrollLeft = scroll; }
  }
  async function read(shelf: Shelf): Promise<PopularCard[]> {
    const signal = controller.signal;
    if (shelf.source.kind === 'recommend' && services.recommend) return (await services.recommend(1, signal, false)).items;
    const items: PopularCard[] = [];
    for (let page = 1; page <= shelf.pages; page++) {
      const request: ContentQuery = { route: shelf.source.kind === 'ranking' ? 'ranking' : 'popular', page };
      const result = await runtime.read(request, signal); items.push(...result.items);
      if (result.noMore) { shelf.nextPage = Number.MAX_SAFE_INTEGER; break; }
    }
    return items;
  }
  function load(shelf: Shelf): Promise<void> {
    if (shelf.state === 'loading' || shelf.state === 'ready') return queue;
    const memo = recent.get(memoKey(shelf));
    if (memo && Date.now() - memo.at < REUSE_MS) { show(shelf, memo.items, ROW); shelf.state = 'ready'; shelf.status.textContent = memo.items.length ? '' : '暂时没有内容'; focusFirst(shelf); return queue; }
    shelf.state = 'loading'; shelf.retry.hidden = true;
    const stale = shelf.items.length > 0;
    if (!stale) shelf.status.textContent = '正在加载';
    // A retry keeps the one-line failed layout until cards arrive, so the row does not jump while it reloads.
    shelf.node.classList.toggle('tv-shelf-loading', !!shelf.row.querySelector('.tv-card-skeleton'));
    queue = queue.then(async () => {
      if (owner.signal.aborted) return;
      try {
        const items = unique(await read(shelf)); if (owner.signal.aborted) return;
        show(shelf, items, ROW); shelf.state = 'ready'; shelf.status.textContent = items.length ? '' : '暂时没有内容';
        recent.set(memoKey(shelf), { at: Date.now(), items });
        if (items.length) snapshots.write(shelf.key, items, account(shelf));
        focusFirst(shelf);
      } catch (error) {
        if (owner.signal.aborted) return;
        shelf.status.title = error instanceof DomainError ? error.code : 'invalid';
        // ADR-116: a failed refresh keeps the last snapshot on screen and says it is the last one.
        if (stale && shelf.row.querySelector('.tv-card')) { shelf.state = 'ready'; shelf.status.textContent = '显示的是上次的内容'; return; }
        // ADR-114: a failed row is one line: the reason, then 重试 and 查看更多 as ordinary buttons.
        shelf.state = 'failed'; shelf.node.classList.remove('tv-shelf-loading'); shelf.node.classList.add('tv-shelf-failed'); shelf.status.textContent = contentLoadFailureText(false);
        shelf.row.replaceChildren(shelf.retry, shelf.more); shelf.retry.hidden = false; wire();
      }
    });
    return queue;
  }
  /** The first row takes focus only if the viewer has not moved anywhere yet. */
  function focusFirst(shelf: Shelf): void {
    const active = document.activeElement as HTMLElement | null, first = cards(shelves[0]!)[0];
    if (shelf === shelves[0] && first && first !== shelf.more && !top() && (active === document.body || active?.dataset.focusId === 'nav-home') && !document.querySelector('#overlays>section')) first.focus();
  }
  /** ADR-116: reaching a row's last card shows the next twelve already read, or (热门 only) reads one more page. */
  async function extend(shelf: Shelf): Promise<void> {
    if (shelf.extending || shelf.state !== 'ready' || shelf.key === 'recommend') return;
    if (shelf.shown < shelf.items.length) { appendTo(shelf, shelf.items.slice(shelf.shown, shelf.shown + ROW)); return; }
    if (shelf.key !== 'popular' || shelf.nextPage > POPULAR_PAGES) return;
    shelf.extending = true;
    try {
      const page = shelf.nextPage++, result = await runtime.read({ route: 'popular', page }, controller.signal);
      if (owner.signal.aborted) return;
      if (result.noMore) shelf.nextPage = Number.MAX_SAFE_INTEGER;
      const known = new Set(shelf.items.map(card => card.bvid)), added = unique(result.items).filter(card => !known.has(card.bvid));
      shelf.items = [...shelf.items, ...added]; appendTo(shelf, added.slice(0, ROW));
    } catch { /* the row stays as it is; reaching its end again tries the next page */ shelf.nextPage--; }
    finally { shelf.extending = false; }
  }
  function appendTo(shelf: Shelf, items: readonly PopularCard[]): void {
    if (!items.length) return;
    shelf.more.before(...items.map(card => button(shelf, card))); shelf.shown += items.length; wire(); notify();
  }
  // Load the next row as soon as focus enters a row; never more than one row ahead. The last card asks for more.
  const ahead = (event: FocusEvent) => {
    const target = event.target as HTMLElement, index = shelves.findIndex(s => s.node.contains(target)), shelf = shelves[index], next = shelves[index + 1];
    if (index >= 0 && next?.state === 'idle') void load(next);
    if (shelf && target.classList.contains('tv-card') && target.nextElementSibling === shelf.more) void extend(shelf);
  };
  node.addEventListener('focusin', ahead); owner.add('home-shelves-focus', () => node.removeEventListener('focusin', ahead));
  // ADR-116: every row with a snapshot shows it at once; the reads keep their one-row-ahead order.
  for (const shelf of shelves) { const snap = snapshots.read(shelf.key, account(shelf)); if (snap) show(shelf, snap.cards, ROW); }
  wire();
  if (shelves[0]) { void load(shelves[0]); focusFirst(shelves[0]); }
  mounted = true;
  // The first row that has stops (a loading row has none), so the row above can always move down.
  const firstRow = () => [...shelves.map(cards), [...categoryButtons.querySelectorAll<HTMLButtonElement>('button')]].find(list => list.length) ?? [];
  // `opening` is the first row's first card only: the page opens there when a snapshot already drew it.
  return { node, first: () => firstRow()[0]?.dataset.focusId, firstRowIds: () => firstRow().map(b => b.dataset.focusId!), opening: () => cards(shelves[0]!).find(b => b.classList.contains('tv-card'))?.dataset.focusId };
}
