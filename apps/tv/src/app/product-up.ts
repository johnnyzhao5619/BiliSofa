import type { TvShell } from './tv-shell.ts';
import { CoverArt } from '../platform/cover-art.ts';
import { contentCard, viewsText } from '../ui/content-card.ts';
import { productButton } from './product-frame.ts';
import { openVideoDetail, type VideoDetailServices } from './product-video-detail.ts';
import { UpArchiveError, UpArchiveRead } from './up-archive-read.ts';
import { PublicLimitedError, limitedText } from '../platform/public-lists.ts';

export interface UpTarget { mid: string; name: string; fans?: number; videos?: number; }
const FAILURE = { limited: 'B站暂时限制了访问，请稍后再试', network: '投稿暂时无法读取，可重新读取', invalid: '投稿内容无法识别，可重新读取' } as const;
/** UP主页·投稿 (ADR-103): newest uploads first, 30 per page, read only when the viewer turns a page.
 * A video opens the shared detail page without its UP action, so UP pages never stack in a loop.
 * Rate limiting is shown as such and never retried automatically. */
export function openUpPage(shell: TvShell, services: VideoDetailServices, up: UpTarget): void {
  shell.openModal('up-page', child => {
    const reader = new UpArchiveRead(child, services.signedUp), { openUp: _nested, ...detailServices } = services;
    let art = new CoverArt(), page = 1, busy = false, ticket = 0;
    child.add('up-art', () => art.close());
    const panel = document.createElement('section'), eyebrow = document.createElement('p'), heading = document.createElement('h2'), meta = document.createElement('p'), status = document.createElement('p');
    panel.className = 'tv-detail tv-detail-page tv-up-page'; eyebrow.className = 'tv-eyebrow'; eyebrow.textContent = 'UP主页 · 投稿';
    heading.id = 'up-page-title'; heading.textContent = up.name; panel.setAttribute('aria-labelledby', heading.id);
    meta.className = 'tv-detail-meta'; status.className = 'tv-status'; status.setAttribute('role', 'status');
    const facts = (total?: number) => [up.fans !== undefined ? `${viewsText(up.fans)}粉丝` : '', total !== undefined ? `${total} 个投稿` : up.videos !== undefined ? `${up.videos} 个投稿` : ''].filter(Boolean).join(' · ');
    meta.textContent = facts(); meta.hidden = !meta.textContent;
    const grid = document.createElement('div'), paging = document.createElement('div');
    grid.className = 'tv-grid tv-up-grid'; grid.setAttribute('aria-label', '投稿'); paging.className = 'tv-paging';
    const previous = productButton('up-previous', '上一页', () => { void read(page - 1); }), next = productButton('up-next', '下一页', () => { void read(page + 1); });
    const retry = productButton('up-retry', '重新读取', () => { void read(page); });
    previous.disabled = next.disabled = true; retry.hidden = true; paging.append(previous, next, retry);
    const topmost = () => panel.isConnected && panel.parentElement?.lastElementChild === panel;
    function wire(cards: HTMLButtonElement[]): void {
      const controls = [previous, next, retry].filter(b => !b.disabled && !b.hidden);
      cards.forEach((b, i) => {
        const id = (at: number) => cards[at]?.dataset.focusId ?? b.dataset.focusId!;
        b.dataset.left = i % 4 ? id(i - 1) : b.dataset.focusId; b.dataset.right = i % 4 < 3 ? id(i + 1) : b.dataset.focusId;
        b.dataset.up = i >= 4 ? id(i - 4) : b.dataset.focusId; b.dataset.down = cards[i + 4] ? id(i + 4) : controls[0]?.dataset.focusId ?? b.dataset.focusId;
      });
      controls.forEach((b, i) => { b.dataset.left = controls[i - 1]?.dataset.focusId ?? b.dataset.focusId; b.dataset.right = controls[i + 1]?.dataset.focusId ?? b.dataset.focusId; b.dataset.up = cards.at(-1)?.dataset.focusId ?? b.dataset.focusId; b.dataset.down = b.dataset.focusId; });
    }
    async function read(target: number): Promise<void> {
      if (busy || child.signal.aborted || target < 1) return;
      busy = true; const mine = ++ticket; status.textContent = '正在读取投稿'; previous.disabled = next.disabled = true; retry.hidden = true;
      try {
        const result = await reader.read(up.mid, up.name, target);
        if (child.signal.aborted || mine !== ticket) return;
        art.close(); art = new CoverArt(); page = target;
        const cards = result.items.map(card => contentCard(card, 'up-card-' + card.bvid, art, child.signal, () => openVideoDetail(child, shell, detailServices, card, { thumbnails: grid, modal: 'up-detail' })));
        grid.replaceChildren(...cards); meta.textContent = facts(result.total); meta.hidden = !meta.textContent;
        status.textContent = cards.length ? `第 ${page} 页 · 共 ${result.total} 个投稿` : page > 1 ? '没有更多投稿' : '这位UP主还没有公开投稿';
        previous.disabled = page <= 1; next.disabled = result.noMore; wire(cards);
        // A video detail opened over this page keeps its focus; otherwise the page lands on its first upload.
        if (topmost()) (cards[0] ?? [previous, next].find(b => !b.disabled))?.focus();
      } catch (error) {
        if (child.signal.aborted || mine !== ticket) return;
        const reason = error instanceof PublicLimitedError ? 'limited' : error instanceof UpArchiveError ? error.reason : 'network';
        if (reason === 'cancelled') return;
        status.textContent = error instanceof PublicLimitedError ? limitedText(error) : FAILURE[reason]; retry.hidden = false; previous.disabled = page <= 1 || !grid.childElementCount;
        wire([...grid.querySelectorAll<HTMLButtonElement>('button')]);
        if (topmost()) retry.focus();
      } finally { if (mine === ticket) busy = false; }
    }
    panel.append(eyebrow, heading, meta, status, grid, paging);
    void read(1);
    return panel;
  });
}
