import { holdable, type HoldHandlers } from './hold.ts';
import type { CoverReference } from '../../../../packages/contracts/src/index.ts';
import type { CoverArt } from '../platform/cover-art.ts';
export interface LibraryCardView {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  cover?: CoverReference;
  progress?: {
    timeMs: number;
    durationMs: number;
  };
}
/** Readable text/part identity remain useful when a source has no safe artwork. */
/** `hold` (ADR-113): OK held for 0.5 s opens the card's menu; the short press stays `select`. */
export function libraryCard(card: LibraryCardView, signal: AbortSignal, select: () => void, art?: CoverArt, hold?: HoldHandlers): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = 'tv-library-card';
  button.dataset.focusId = card.id;
  const picture = document.createElement('span');
  picture.className = 'tv-library-picture';
  const badge = document.createElement('span');
  badge.className = 'tv-library-badge';
  badge.textContent = card.badge;
  picture.append(badge);
  const title = document.createElement('span');
  title.className = 'tv-library-title';
  title.textContent = card.title;
  const subtitle = document.createElement('span');
  subtitle.className = 'tv-library-subtitle';
  subtitle.textContent = card.subtitle;
  button.append(picture, title, subtitle);
  button.setAttribute('aria-label', `${card.title}，${card.subtitle}`);
  if (card.progress) {
    const progress = document.createElement('progress');
    progress.max = card.progress.durationMs;
    progress.value = card.progress.timeMs;
    progress.setAttribute('aria-hidden', 'true');
    button.append(progress);
  }
  if (card.cover && art)
    art.attach(card.cover,button,signal,url => { if (signal.aborted)
      return; const image = document.createElement('img'); image.alt = ''; image.src = url; picture.prepend(image); });
  button.onclick = () => { if (!signal.aborted)
    select(); };
  if (hold)
    holdable(button, hold);
  return button;
}
