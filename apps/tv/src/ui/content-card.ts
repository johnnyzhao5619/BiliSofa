import type { PopularCard } from '../../../../packages/contracts/src/index.ts';
import type { CoverArt } from '../platform/cover-art.ts';
/** 12345 → 1.2万, 230000000 → 2.3亿; whole numbers below ten thousand. */
export function viewsText(views: number): string {
    if (!Number.isFinite(views) || views < 0) return '';
    const unit = (value: number, suffix: string) => `${value.toFixed(1).replace(/\.0$/, '')}${suffix}`;
    return views >= 1e8 ? unit(views / 1e8, '亿') : views >= 1e4 ? unit(views / 1e4, '万') : String(Math.floor(views));
}
export function clockTime(seconds: number): string { return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`; }
/** ADR-111: 0 is an unknown duration (over 24 h or unreadable at the source); show nothing for it. */
export function durationText(seconds: number): string { return seconds > 0 ? clockTime(seconds) : ''; }
export function contentCard(card: PopularCard, id: string, art: CoverArt, signal: AbortSignal, choose: () => void): HTMLButtonElement {
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
    button.setAttribute('aria-label', `${card.title}，${card.owner}${card.durationSec > 0 ? `，${Math.floor(card.durationSec / 60)}分${card.durationSec % 60}秒` : ''}`);
    button.append(picture, title, author);
    button.onclick = () => { if (!signal.aborted)
        choose(); };
    if (card.cover)
        art.attach(card.cover,button,signal,url => { if (signal.aborted)
            return; const image = document.createElement('img'); image.alt = ''; image.src = url; image.width = 800; image.height = 450; picture.prepend(image); fallback.hidden = true; });
    return button;
}
