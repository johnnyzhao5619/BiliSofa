import type { TvShell } from './tv-shell.ts';
/** Full description as its own layer (ADR-095): the focused body scrolls with Up/Down and the
 * shell keeps Back, the same reading model as comment full text. No page-level key listener. */
export function openFullText(shell: TvShell, id: string, heading: string, text: string): void {
  shell.openModal(id, layer => {
    const full = document.createElement('section'), title = document.createElement('h2'), body = document.createElement('article');
    full.className = 'tv-detail-description'; title.textContent = heading; body.textContent = text; body.tabIndex = 0; body.dataset.focusId = 'detail-description-text'; body.setAttribute('aria-label', heading + '全文，方向上下滚动');
    shell.modalInput(layer, { back: () => false, key: event => { if (document.activeElement !== body) return false; const delta = ['ArrowDown', 'Down'].includes(event.key) || event.keyCode === 40 ? 100 : ['ArrowUp', 'Up'].includes(event.key) || event.keyCode === 38 ? -100 : 0; if (!delta) return false; const next = Math.max(0, Math.min(body.scrollHeight - body.clientHeight, body.scrollTop + delta)); if (next === body.scrollTop) return false; body.scrollTop = next; return true; } });
    full.append(title, body); return full;
  }, 'detail-description-text');
}
/** Long text is clamped in place; this decides whether a full-text entry is offered. */
export const needsFullText = (text: string, lines = 4) => text.length > lines * 30 || text.split('\n').length > lines;
