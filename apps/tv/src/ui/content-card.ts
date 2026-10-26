import { holdable, type HoldHandlers } from './hold.ts';
import type { PopularCard } from '../../../../packages/contracts/src/index.ts';
import type { CoverArt } from '../platform/cover-art.ts';
/** 12345 → 1.2万, 230000000 → 2.3亿; whole numbers below ten thousand. */
export function viewsText(views: number): string {
    if (!Number.isFinite(views) || views < 0) return '';
    const unit = (value: number, suffix: string) => `${value.toFixed(1).replace(/\.0$/, '')}${suffix}`;
    return views >= 1e8 ? unit(views / 1e8, '亿') : views >= 1e4 ? unit(views / 1e4, '万') : String(Math.floor(views));
}
/** 75 → 1:15; ADR-115: an hour or more is h:mm:ss (4530 → 1:15:30, 90000 → 25:00:00). */
export function clockTime(seconds: number): string {
    const total = Math.max(0, Math.floor(seconds)), hours = Math.floor(total / 3600), pad = (n: number) => String(n).padStart(2, '0');
    return hours ? `${hours}:${pad(Math.floor(total % 3600 / 60))}:${pad(total % 60)}` : `${Math.floor(total / 60)}:${pad(total % 60)}`;
}
/** The spoken form of a length: 4530 → 1小时15分30秒. */
export function spokenLength(seconds: number): string {
    const total = Math.max(0, Math.floor(seconds)), hours = Math.floor(total / 3600);
    return `${hours ? hours + '小时' : ''}${Math.floor(total % 3600 / 60)}分${total % 60}秒`;
}
/** ADR-111: 0 is an unknown duration (over 24 h or unreadable at the source); show nothing for it. */
export function durationText(seconds: number): string { return seconds > 0 ? clockTime(seconds) : ''; }
/** `hold` (ADR-113) makes OK held for 0.5 s open the card's menu; the short press stays `choose`. */
export function contentCard(card: PopularCard, id: string, art: CoverArt, signal: AbortSignal, choose: () => void, hold?: HoldHandlers): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'tv-card';
    button.dataset.focusId = id;
    const picture = document.createElement('span');
    picture.className = 'tv-card-picture';
    const fallback = document.createElement('span');
    fallback.className = 'tv-cover-fallback';
    fallback.textContent = 'BiliSofa';
    fallback.setAttribute('aria-hidden', 'true');
    const time = document.createElement('span');
    time.className = 'tv-card-time';
    time.textContent = durationText(card.durationSec); time.hidden = !time.textContent;
    picture.append(fallback, time);
    const title = document.createElement('span');
    title.className = 'tv-card-title';
    title.textContent = card.title;
    const author = document.createElement('span');
    author.className = 'tv-card-author';
    author.textContent = card.views > 0 ? `${card.owner} · ${viewsText(card.views)}播放` : card.owner;
    button.setAttribute('aria-label', `${card.title}，${card.owner}${card.durationSec > 0 ? `，${spokenLength(card.durationSec)}` : ''}`);
    button.append(picture, title, author);
    button.onclick = () => { if (!signal.aborted)
        choose(); };
    if (hold)
        holdable(button, hold);
    if (card.cover)
        art.attach(card.cover,button,signal,url => { if (signal.aborted)
            return; const image = document.createElement('img'); image.alt = ''; image.src = url; image.width = 800; image.height = 450; picture.prepend(image); fallback.hidden = true; });
    return button;
}
