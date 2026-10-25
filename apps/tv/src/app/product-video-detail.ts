import type { PopularCard } from '../../../../packages/contracts/src/index.ts';
import type { ProfileStore } from '../../../../packages/contracts/src/local-profile.ts';
import type { QueueStore } from '../../../../packages/contracts/src/local-queue.ts';
import type { VodAbout } from '../../../../packages/contracts/src/vod-catalog.ts';
import { type UpArchiveCard } from '../../../../packages/contracts/src/up-archives.ts';
import type { ResourceOwner } from './resource-owner.ts';
import type { TvShell } from './tv-shell.ts';
import { CoverArt } from '../platform/cover-art.ts';
import { clockTime, viewsText } from '../ui/content-card.ts';
import { productButton } from './product-frame.ts';
import { openFullText, needsFullText } from './full-text.ts';
/** Local calendar date of a Unix-seconds timestamp, e.g. 2026-10-23. */
const dateText = (seconds: number) => { const d = new Date(seconds * 1000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export interface VideoDetailServices {
    profile: ProfileStore;
    queue: QueueStore;
    play(card: PopularCard, position: number): void;
    playPart?(target: { bvid: string; part: number }, position: number): void;
    parts?(bvid: string, signal: AbortSignal): Promise<{ items: { part: number; title: string; durationMs: number }[]; about?: VodAbout; owner?: string }>;
    /** 0.51.0 (ADR-103): opens the UP page; absent inside an UP page. */
    openUp?(up: { mid: string; name: string }): void;
    /** 0.51.2 (ADR-105): an UP's uploads with the active account's own session. */
    signedUp?(mid: string, page: number, signal: AbortSignal): Promise<{ archives: UpArchiveCard[]; total: number }>;
}
/** Where the page was opened from: a card to borrow a thumbnail from, its own layer id, and (0.51.1) the part to resume. */
/** 0.51.2 (ADR-105): an entry's own actions on the full page (queue order, local removal, play the queue). */
export interface VideoDetailContext {
    primary?: { label: string; run(): void };
    enqueue?: boolean;
    extra?(child: ResourceOwner, closeThen: (action: () => void) => void): HTMLButtonElement[];
}
export interface VideoDetailOptions extends VideoDetailContext { thumbnails?: ParentNode; modal?: string; part?: number; }
/** The video detail page (ADR-091/095), shared by home and search (ADR-103). Behaviour is unchanged from the
 * home page; 0.51.0 adds the UP主页 action and loads the cover when no visible card can lend its thumbnail. */
export function openVideoDetail(owner: ResourceOwner, shell: TvShell, services: VideoDetailServices, card: PopularCard, options: VideoDetailOptions = {}): void {
    const { thumbnails, modal = 'product-detail' } = options;
    // ADR-104: entries from 我的/关注/继续观看 resume their own part; part 1 looks exactly like the home page.
    const part = options.part && options.part > 1 && services.playPart ? options.part : 1;
    // A layer id is open at most once; the UP page opens its videos as their own layer above a home detail.
    shell.openModal(modal, child => {
        const panel = document.createElement('section');
        panel.className = 'tv-detail';
        const heading = document.createElement('h2');
        heading.id = 'product-detail-title';
        heading.textContent = card.title;
        panel.setAttribute('aria-labelledby', heading.id);
        const by = document.createElement('p');
        by.textContent = [card.owner, card.durationSec > 0 ? clockTime(card.durationSec) : '', card.views > 0 ? `${viewsText(card.views)}播放` : ''].filter(Boolean).join(' · ');
        panel.classList.add('tv-detail-page');
        const saved = services.profile.readPart(card.bvid, part);
        const at = saved.kind === 'ok' && saved.value && (saved.value.timeMs < card.durationSec * 1000 || (!card.durationSec)) ? saved.value.timeMs : 0;
        let opening = false;
        const play = (position: number) => { if (opening || child.signal.aborted)
            return; opening = true; void shell.closeOwnedModal(child).then(() => { if (!owner.signal.aborted && !shell.restartRequired)
            { if (part > 1) services.playPart!({ bvid: card.bvid, part }, position); else services.play(card, position); } }); };
        // ADR-105: close this page, then run an entry action (queue play, reorder, removal).
        const closeThen = (action: () => void) => { if (opening || child.signal.aborted)
            return; opening = true; void shell.closeOwnedModal(child).then(() => { if (!owner.signal.aborted && !shell.restartRequired)
            action(); }); };
        const label = part > 1 ? `P${part} ` : '', resumeLabel = at ? `继续观看 · ${label}${clockTime(at / 1000)}` : part > 1 ? `播放 · P${part}` : '播放';
        const custom = options.primary;
        const primary = custom ? productButton('detail-play', custom.label, () => closeThen(() => custom.run())) : productButton('detail-play', resumeLabel, () => play(at));
        primary.className = 'tv-primary';
        const actions = document.createElement('div');
        actions.className = 'tv-detail-actions';
        actions.append(primary);
        if (custom)
            actions.append(productButton('detail-play-single', at ? `只播放此项 · ${label}${clockTime(at / 1000)}` : '只播放此项', () => play(at)));
        if (at)
            actions.append(productButton('detail-from-start', part > 1 ? '从头播放此分P' : '从头播放', () => play(0)));
        const result = document.createElement('p');
        result.setAttribute('role', 'status');
        if (options.enqueue !== false)
            actions.append(productButton('detail-enqueue', part > 1 ? `加入本机队列 · P${part}` : '加入本机队列 · 首P', () => { if (child.signal.aborted)
                return; const outcome = services.queue.add(part > 1 ? { bvid: card.bvid, part, title: card.title } : { bvid: card.bvid, title: card.title }); result.textContent = outcome === 'saved' ? '已加入本机队列' : outcome === 'full' ? '本机队列已满' : `本机队列保存未确认（${outcome}）`; }));
        if (options.extra) actions.append(...options.extra(child, closeThen));
        const id = document.createElement('p');
        id.className = 'tv-secondary';
        id.textContent = card.bvid;
        const header = document.createElement('div');
        header.className = 'tv-detail-header';
        const summary = document.createElement('div');
        summary.append(heading, by);
        const picture = document.createElement('div');
        picture.className = 'tv-detail-picture';
        const thumbnail = thumbnails?.querySelector<HTMLImageElement>(`[data-focus-id="home-card-${card.bvid}"] img, [data-focus-id$="-${card.bvid}"] img`);
        if (thumbnail) {
            const image = thumbnail.cloneNode() as HTMLImageElement;
            image.alt = '';
            picture.append(image);
        }
        else {
            picture.textContent = 'BiliSofa';
            if (card.cover) { const covers = new CoverArt(); child.add('detail-cover', () => covers.close()); void covers.load(card.cover).then(url => { if (!url || child.signal.aborted) return; const image = document.createElement('img'); image.alt = ''; image.src = url; picture.replaceChildren(image); }); }
        }
        header.append(picture, summary);
        // The BV id is a support detail, not viewing information.
        id.hidden = true;
        panel.append(header, actions, result, id);
        if (services.parts && services.playPart) detailParts(owner, shell, services, child, panel, actions, card, summary, by);
        return panel;
    }, 'detail-play');
}
/** Multi-part list on the detail page; reading is cancelled and awaited before the detail closes. */
/** Detail facts from the same read as the part list (ADR-095); absent facts leave no gap. */
function detailAbout(shell: TvShell, services: VideoDetailServices, card: PopularCard, child: ResourceOwner, summary: HTMLElement, by: HTMLElement, actions: HTMLElement, about: VodAbout): void {
    const count = (n: number) => viewsText(n);
    const facts = [about.publishedAt ? `发布于 ${dateText(about.publishedAt)}` : '', about.likes !== undefined ? `${count(about.likes)}点赞` : '', about.danmaku !== undefined ? `${count(about.danmaku)}弹幕` : ''].filter(Boolean);
    if (facts.length) { const meta = document.createElement('p'); meta.className = 'tv-detail-meta'; meta.textContent = facts.join(' · '); summary.append(meta); }
    if (about.face) { const faces = new CoverArt(); child.add('detail-face', () => faces.close()); void faces.load(about.face).then(url => { if (!url || child.signal.aborted) return; const image = document.createElement('img'); image.className = 'tv-detail-face'; image.alt = ''; image.src = url; by.prepend(image); }); }
    // ADR-103: the UP's own page. A detail opened from an UP page has no openUp, so pages never nest in a loop.
    if (about.ownerMid && services.openUp) { const up = { mid: about.ownerMid, name: card.owner }; actions.append(productButton('detail-up', 'UP主页', () => { if (!child.signal.aborted) services.openUp!(up); })); }
    if (!about.description) return;
    const text = about.description, description = document.createElement('p'); description.className = 'tv-detail-desc'; description.textContent = text; summary.append(description);
    // Long text is clamped to four lines; the full text opens as its own layer and Back returns here.
    if (needsFullText(text)) actions.append(productButton('detail-description', '简介全文', () => openFullText(shell, 'detail-description', '简介', text)));
}
function detailParts(owner: ResourceOwner, shell: TvShell, services: VideoDetailServices, child: ResourceOwner, panel: HTMLElement, actions: HTMLElement, card: PopularCard, summary: HTMLElement, by: HTMLElement): void {
    const row = document.createElement('div'), note = document.createElement('p'), controller = new AbortController();
    row.className = 'tv-detail-parts'; note.className = 'tv-secondary'; note.setAttribute('role', 'status'); note.textContent = '正在读取分P';
    const pending = services.parts!(card.bvid, controller.signal).then(({ items: list, about, owner: readOwner }) => {
        if (child.signal.aborted) return;
        // ADR-104: an entry from 我的/关注/继续观看 may not know the UP name; the detail read supplies it.
        const named = !card.owner && readOwner ? { ...card, owner: readOwner } : card;
        if (named !== card) by.textContent = [named.owner, by.textContent].filter(Boolean).join(' · ');
        if (about) detailAbout(shell, services, named, child, summary, by, actions, about);
        if (list.length < 2) { note.textContent = ''; return; }
        note.textContent = `共 ${list.length}P`;
        const buttons = list.slice(0, 48).map(item => {
            const saved = services.profile.readPart(card.bvid, item.part), at = saved.kind === 'ok' && saved.value && saved.value.timeMs < item.durationMs ? saved.value.timeMs : 0;
            return productButton(`detail-part-${item.part}`, `P${item.part} · ${item.title} · ${clockTime(item.durationMs / 1000)}${at ? ' · 看到 ' + clockTime(at / 1000) : ''}`, () => { void shell.closeOwnedModal(child).then(() => { if (!owner.signal.aborted && !shell.restartRequired) services.playPart!({ bvid: card.bvid, part: item.part }, at); }); });
        });
        const top = [...actions.querySelectorAll<HTMLButtonElement>('button[data-focus-id]')];
        buttons.forEach((b, i) => { b.dataset.left = buttons[i - 1]?.dataset.focusId ?? b.dataset.focusId; b.dataset.right = buttons[i + 1]?.dataset.focusId ?? b.dataset.focusId; b.dataset.up = top[0]?.dataset.focusId ?? b.dataset.focusId; b.dataset.down = b.dataset.focusId; });
        top.forEach(b => { b.dataset.down = buttons[0]?.dataset.focusId ?? b.dataset.focusId; });
        row.replaceChildren(...buttons);
    }).catch(() => { if (!child.signal.aborted) note.textContent = '分P列表暂时无法读取，可直接播放'; });
    child.add('detail-parts', async () => { controller.abort(); await pending; });
    panel.append(note, row);
}
