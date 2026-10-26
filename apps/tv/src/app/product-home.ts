import { videoCard, type VideoCardServices } from './card-actions.ts';
import {ContinuousGrid} from '../ui/continuous-grid.ts';
import {productContinuing,continueDetails} from './product-continuing.ts';
import { DomainError, type PopularCard } from '../../../../packages/contracts/src/index.ts';
import { ContentApiError, PopularReadError, type ContentQuery } from '../../../../packages/contracts/src/content.ts';
import type { CategoryId } from '../../../../packages/contracts/src/categories.ts';
import { SearchReadError } from '../../../../packages/contracts/src/search.ts';
import type { ProfileStore } from '../../../../packages/contracts/src/local-profile.ts';
import type { QueueStore } from '../../../../packages/contracts/src/local-queue.ts';
import type { ResourceOwner } from './resource-owner.ts';
import type { TvShell } from './tv-shell.ts';
import { PublicContentRuntime } from '../platform/content-runtime.ts';
import { CoverArt } from '../platform/cover-art.ts';
import { contentCard } from '../ui/content-card.ts';
import { backdrop } from '../ui/backdrop.ts';
import { limitedFrom, limitedText } from '../platform/public-lists.ts';
import { productButton } from './product-frame.ts';
import { contentLoadFailureText } from './user-messages.ts';
import { categoryPicker } from './category-picker.ts';
import { homeShelves } from './product-shelves.ts';
import { frameBack } from './product-frame.ts';
export interface HomeSource {
    kind: 'popular' | 'ranking' | 'category' | 'recommend' | 'search';
    page: number;
    categoryId?: CategoryId;
    keyword?: string;
}
export interface HomeMemory {
    source: HomeSource;
    /** Shelves landing or the full grid opened by “查看更多” (ADR-091). */
    mode?: 'shelves' | 'grid';
}
/** Detail-page services (profile, queue, play, parts, openUp) come from VideoDetailServices. */
export interface HomeServices extends VideoCardServices {
    /** 0.51.2 (ADR-105): category rankings with the active account's own session. */
    signedCategory?(categoryId: CategoryId, signal: AbortSignal): Promise<PopularCard[]>;
    profile: ProfileStore;
    queue: QueueStore;
    feedback: HTMLElement;
    name?: string;
    /** ADR-116: the signed-in account, whose 为你推荐 snapshot is kept apart from the public rows. */
    account?: string;
    local?:{play(target:{bvid:string;part:number},position:number):void;openLibrary():void};
    recommend?(page: number, signal: AbortSignal, refresh: boolean): Promise<{
        items: PopularCard[];
        noMore: boolean;
        firstPage: number;
    }>;
}
/** Four real cards per page. Data, artwork and focus belong to this route owner. */
export function productHome(owner: ResourceOwner, shell: TvShell, services: HomeServices, memory: HomeMemory): HTMLElement {
    const node = document.createElement('section');
    node.className = 'tv-home';
    // ADR-114: one small identity line instead of a tagline and page title, so more rows fit.
    const title = document.createElement('h1');
    title.className = 'tv-home-identity'; title.textContent = `BiliSofa · ${services.name ?? '游客'}`;
    const tools = document.createElement('div');
    tools.className = 'tv-filters';
    const status = document.createElement('p');
    status.className = 'tv-status';
    status.setAttribute('role', 'status');
    const grid = document.createElement('div');
    grid.className = 'tv-grid';
    grid.setAttribute('aria-label', '视频');
    const continuing=services.local?productContinuing(owner,services.profile,services.queue,card=>continueDetails(owner,shell,card,services.profile,services.queue,services.local!.play),services.playPart?card=>videoCard(owner,shell,services,{bvid:card.point.bvid,title:card.title,owner:'',durationSec:0,views:0},{part:card.point.part}):undefined):undefined;
    if(continuing?.first())node.dataset.initialFocusId=continuing.first()!;
    if(continuing){const all=productButton('continuing-all','查看全部本机记录',()=>services.local!.openLibrary());all.className='tv-continuing-all';continuing.node.append(all);}
    const paging = document.createElement('div');
    paging.className = 'tv-paging';
    const runtime = new PublicContentRuntime(services.signedCategory);
    let readAbort:AbortController|undefined;
    let art = new CoverArt(), busy = false, epoch = 0, committed: HomeSource | undefined;
    const abort = () => {readAbort?.abort();art.close();};
    owner.signal.addEventListener('abort', abort, { once: true });
    owner.add('home-data', async () => { owner.signal.removeEventListener('abort', abort); art.close(); if (!(await runtime.close()).closed)
        throw new DomainError('unknown'); });
    const sourceButtons: HTMLButtonElement[] = [];
    const source = (kind: HomeSource['kind'], label: string) => { const b = productButton('source-' + kind, label, () => { if (owner.signal.aborted)
        return; memory.source = { kind, page: 1 }; void read(false,true); }); sourceButtons.push(b); return b; };
    if (services.recommend)
        tools.append(source('recommend', '为你推荐'));
    tools.append(source('popular', '热门'), source('ranking', '排行榜'));
    const category = productButton('source-category', '分区', () => { if (owner.signal.aborted)
        return; shell.openModal('home-category', child => categoryPicker(child, shell, undefined, id => { if (!owner.signal.aborted) {
        memory.source = { kind: 'category', page: 1, categoryId: id };
        void read(false,true);
    } }), 'category-back'); });
    sourceButtons.push(category);
    tools.append(category);
    // The grid scrolls continuously (ADR-077); refresh is a recovery action, shown only for a failed or empty source.
    const refresh = productButton('home-refresh', '刷新', () => { memory.source.page = 1; void read(true,true); });
    refresh.hidden = true;
    const feed=new ContinuousGrid(owner,grid,{load:page=>{memory.source.page=page;return read(false);},restored:page=>{memory.source.page=page;},top:()=>sourceButtons.find(b=>b.getAttribute('aria-pressed')==='true')?.dataset.focusId??'source-popular',left:()=>'nav-home',bottom:()=> 'home-refresh'});
    paging.append(refresh);
    /** ADR-113: a short press plays, a hold opens the card menu (whose 详情 is the full detail page). */
    function actions(card: PopularCard) { return videoCard(owner, shell, services, card, { thumbnails: node }); }
    async function read(fresh: boolean, replace=false): Promise<void> {
        if (busy && !replace || owner.signal.aborted)
            return;
        readAbort?.abort();const controller=new AbortController();readAbort=controller;
        busy = true;
        const ticket = ++epoch, query = { ...memory.source }; let failed = false;
        const active = document.activeElement as HTMLElement | null;
        const focusedId = !node.isConnected ? shell.navigation.current.anchor.focusId : active?.dataset.focusId;
        const mayFocus = (!active || !node.isConnected || node.contains(active) || focusedId === 'nav-home')&&!continuing?.node.contains(active);
        const sourceKey=JSON.stringify([query.kind,query.categoryId,query.keyword]);feed.prepare(sourceKey,fresh);
        const oldCards = !!grid.childElementCount;
        const selected = sourceButtons.find(b => b.dataset.focusId === 'source-' + query.kind);
        sourceButtons.forEach(b => b.setAttribute('aria-pressed', String(b === selected)));
        status.textContent = oldCards ? '正在更新视频，当前内容仍可浏览' : '正在加载视频';
        try {
            let result: {
                items: PopularCard[];
                noMore: boolean;
                firstPage?: number;
            };
            if (query.kind === 'recommend' && services.recommend) {
                result = await services.recommend(query.page, controller.signal, fresh);
            }
            else {
                const request: ContentQuery = query.kind === 'search' ? { route: 'search', keyword: query.keyword!, page: query.page } : query.kind === 'category' ? { route: 'category', categoryId: query.categoryId!, page: query.page } : { route: query.kind === 'ranking' ? 'ranking' : 'popular', page: query.page };
                if ((request.route === 'ranking' || request.route === 'category') && query.page > 1 && !committed)
                    await runtime.read({ ...request, page: 1 }, controller.signal);
                result = await runtime.read((fresh && query.page === 1 && request.route !== 'search') ? { ...request, refresh: true } : request, controller.signal);
            }
            committed = { ...query };
            if (owner.signal.aborted || ticket !== epoch)
                return;
            art = new CoverArt();
            const buttons = result.items.map(card => { const a = actions(card); return contentCard(card, 'home-card-' + card.bvid, art, owner.signal, () => a.choose(), a.hold); });
            buttons.forEach((b, i) => { const id = (at: number) => buttons[at]?.dataset.focusId ?? b.dataset.focusId!; b.dataset.left = i % 4 ? id(i - 1) : 'nav-home'; b.dataset.right = i % 4 < 3 ? id(i + 1) : id(i); b.dataset.up = selected?.dataset.focusId ?? 'source-popular'; b.dataset.down = 'home-refresh'; });
            {const currentArt=art;feed.commit(sourceKey,query.page,buttons,result.noMore,query.kind==='recommend'?1000000:25,result.firstPage??1,()=>currentArt.close());}
            refresh.textContent = '刷新'; refresh.hidden = buttons.length > 0 || grid.querySelector('button') !== null;
            status.textContent = buttons.length ? `${query.kind === 'ranking' ? '全站排行榜' : query.kind === 'category' ? '分区排行榜' : query.kind === 'recommend' ? '当前账号推荐' : query.kind === 'search' ? `“${query.keyword}” 的视频` : '热门视频'}${' · 向下浏览更多'}` : '暂时没有视频，可换一个栏目';
            // Async results may replace owned content, never a modal or a moved rail focus.
            const now = document.activeElement as HTMLElement | null;
            const stillOwns = now === active || node.contains(now) || now?.dataset.focusId === 'nav-home' || now === document.body;
            if (!oldCards && mayFocus && stillOwns && !continuing?.node.contains(now) && !document.querySelector('#overlays>section'))
                {const restored=node.querySelector<HTMLElement>(`[data-focus-id="${focusedId??''}"]`);(restored??(!oldCards&&continuing?.first()?node.querySelector<HTMLElement>(`[data-focus-id="${continuing.first()}"]`):undefined)??buttons[0]??refresh).focus();}
        }
        catch (error) {
            if (owner.signal.aborted||ticket!==epoch)
                return;
            feed.failure();
            if (committed)
                memory.source = { ...committed };
            const code = error instanceof PopularReadError || error instanceof SearchReadError ? error.detail : error instanceof ContentApiError ? 'API ' + error.apiCode : error instanceof DomainError ? error.code : 'invalid';
            const limited = limitedFrom(error);
            status.textContent = limited ? limitedText(limited) : contentLoadFailureText(!!oldCards); status.title = code; refresh.textContent = '重试'; refresh.hidden = false;
            failed = true;
        }
        finally {
            if (!owner.signal.aborted&&ticket===epoch) {
                busy = false;
                sourceButtons.forEach(b => b.disabled = false);
                refresh.disabled = false;
                wireTools();
                // ADR-104: a failed read never leaves the remote on nothing (BODY, a hidden shelf or a disabled control).
                const now = document.activeElement as HTMLElement | null;
                const lost = !now || now === document.body || !now.isConnected || (now as HTMLButtonElement).disabled || (node.contains(now) && !now.offsetParent);
                if (failed && node.isConnected && !document.querySelector('#overlays>section') && lost) refresh.focus();
                // ADR-105: after any read (a successful 重试 included) the remote lands on a card, 重试 or the selected source.
                else if (node.isConnected && !document.querySelector('#overlays>section') && lost)
                    (grid.querySelector<HTMLButtonElement>('button:not(:disabled)') ?? (!refresh.hidden ? refresh : sourceButtons.find(b => b.getAttribute('aria-pressed') === 'true') ?? sourceButtons[0]))?.focus();
            }
        }
    }
    function wireTools(): void { wireTools0(); if(shelves&&continuing&&!gridMode){const row=shelves.firstRowIds(),cards=[...continuing.node.querySelectorAll<HTMLButtonElement>('.tv-continuing-grid button,[data-focus-id=continuing-all]')];cards.forEach((b,j)=>{b.dataset.down=row[Math.min(j,row.length-1)]??b.dataset.focusId;});} }
    function wireTools0(): void { if(continuing){const cards=[...continuing.node.querySelectorAll<HTMLButtonElement>('.tv-continuing-grid button')],all=continuing.node.querySelector<HTMLButtonElement>('[data-focus-id=continuing-all]');if(all){if(cards.at(-1))cards.at(-1)!.dataset.right='continuing-all';all.dataset.left=cards.at(-1)?.dataset.focusId??'nav-home';all.dataset.right=sourceButtons.find(b=>!b.disabled)?.dataset.focusId??'source-popular';all.dataset.up=cards.at(-1)?.dataset.focusId??'nav-home';all.dataset.down=all.dataset.right;}} sourceButtons.forEach((b, i) => { b.dataset.left = i ? sourceButtons[i - 1]!.dataset.focusId : 'nav-home'; b.dataset.right = sourceButtons[i + 1]?.dataset.focusId ?? b.dataset.focusId; b.dataset.up = continuing?.first()??b.dataset.focusId; b.dataset.down = grid.querySelector<HTMLElement>('[data-focus-id]')?.dataset.focusId ?? 'home-refresh'; }); if (!refresh.disabled && !refresh.hidden) { refresh.dataset.left = 'nav-home'; refresh.dataset.right = refresh.dataset.down = refresh.dataset.focusId; refresh.dataset.up = grid.querySelector<HTMLElement>('[data-focus-id]')?.dataset.focusId ?? (sourceButtons.find(s => s.getAttribute('aria-pressed') === 'true') ?? sourceButtons[0])?.dataset.focusId ?? 'nav-home'; } feed.wire(); }
    // Shelves landing (ADR-091): the existing continuous grid becomes the “查看更多” page.
    let gridMode = memory.mode === 'grid', returnTo = '';
    const openGrid = (source: HomeSource, from: string) => { if (owner.signal.aborted) return; returnTo = from; memory.source = { ...source, page: 1 }; memory.mode = 'grid'; gridMode = true; showMode(); const tab = sourceButtons.find(b => b.dataset.focusId === 'source-' + source.kind); tab?.focus(); void read(false, true).then(() => { if (gridMode && document.activeElement === tab) grid.querySelector<HTMLElement>('[data-focus-id]')?.focus(); }); };
    const shelves = homeShelves(owner, services, () => wireTools(), actions, openGrid, () => continuing?.first());
    // ADR-116: with a snapshot on screen, the page opens on its first card instead of the rail.
    { const first = shelves.opening(); if (!node.dataset.initialFocusId && !gridMode && first) node.dataset.initialFocusId = first; }
    const shelfArea = document.createElement('div'); shelfArea.className = 'tv-shelf-area';
    shelfArea.append(...(continuing ? [continuing.node] : []), shelves.node);
    function showMode(): void { shelfArea.hidden = gridMode; for (const part of [tools, status, grid, paging]) part.hidden = !gridMode; }
    frameBack.set(node, () => { if (!gridMode) return false; gridMode = false; memory.mode = 'shelves'; readAbort?.abort(); showMode(); (node.querySelector<HTMLElement>(`[data-focus-id="${returnTo}"]`) ?? node.querySelector<HTMLElement>(`[data-focus-id="${shelves.first() ?? ''}"]`))?.focus(); return true; });
    node.append(title, shelfArea, tools, status, grid, paging);
    showMode();
    // ADR-114: a card focused for 0.3 s lends its loaded cover to the page backdrop; anything else fades it out.
    const ambience=backdrop(node,owner.signal),lend=(event:FocusEvent)=>{const card=(event.target as HTMLElement).closest?.('.tv-card');ambience.show(card?.querySelector('img')?.getAttribute('src')??undefined,300);};
    node.addEventListener('focusin',lend);owner.add('home-backdrop',()=>node.removeEventListener('focusin',lend));
    const returned=(event:FocusEvent)=>{if(!continuing||continuing.node.contains(event.target as Node))return;continuing.refresh();wireTools();};node.addEventListener('focusin',returned);owner.add('home-continuing-focus',()=>node.removeEventListener('focusin',returned));
    wireTools();
    if (gridMode) void read(false);
    return node;
}
