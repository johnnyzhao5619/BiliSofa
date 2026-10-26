import type { HoldHandlers } from '../ui/hold.ts';
import type { ProfileStore } from '../../../../packages/contracts/src/local-profile.ts';
import type { QueueStore } from '../../../../packages/contracts/src/local-queue.ts';
import type { ResourceOwner } from './resource-owner.ts';
import { localCards, type LocalCard } from './product-local.ts';
import { libraryCard } from '../ui/library-card.ts';
/** `actions` (ADR-113): a record's short press and hold; without it, `select` keeps the old local panel. */
export function productContinuing(owner: ResourceOwner, profile: ProfileStore, queue: QueueStore, select: (card: LocalCard) => void, actions?: (card: LocalCard) => { choose(): void; hold: HoldHandlers }): {
  node: HTMLElement;
  refresh(): void;
  first(): string | undefined;
} {
  const node = document.createElement('section');
  node.className = 'tv-continuing';
  node.setAttribute('aria-label', '继续观看 · 本机');
  const title = document.createElement('h2');
  title.textContent = '继续观看';
  const note = document.createElement('span');
  note.textContent = '本机';
  title.append(note);
  const grid = document.createElement('div');
  grid.className = 'tv-continuing-grid';
  const status = document.createElement('p');
  status.className = 'tv-local-status';
  node.append(title, grid, status);
  let signature = '';
  function refresh(): void {
    if (owner.signal.aborted || grid.contains(document.activeElement))
      return;
    const data = localCards(profile, queue), next = JSON.stringify(data);
    if (next === signature)
      return;
    signature = next;
    grid.replaceChildren();
    if (data.kind !== 'ok') {
      node.hidden = false;
      status.textContent = '本机续播暂不可读，可在“我的”重新读取；其他栏目仍可浏览';
      return;
    }
    node.hidden = !data.items.length;
    status.textContent = data.namesUnavailable ? '部分名称暂不可读，续播位置仍保留' : '';
    const buttons = data.items.map(card => { const a = actions?.(card); return libraryCard({ id: 'home-' + card.id, title: card.title, subtitle: card.subtitle, badge: `P${card.point.part}`, progress: card.point }, owner.signal, a ? () => a.choose() : () => select(card), undefined, a?.hold); });
    buttons.forEach((button, i) => { button.dataset.left = buttons[i - 1]?.dataset.focusId ?? 'nav-home'; button.dataset.right = buttons[i + 1]?.dataset.focusId ?? button.dataset.focusId; button.dataset.up = button.dataset.focusId; button.dataset.down = 'source-popular'; });
    grid.append(...buttons);
  }
  refresh();
  return { node, refresh, first: () => grid.querySelector<HTMLElement>('[data-focus-id]')?.dataset.focusId };
}
import type { TvShell } from './tv-shell.ts';
import { productButton } from './product-frame.ts';
export function continueDetails(owner: ResourceOwner, shell: TvShell, card: LocalCard, profile: ProfileStore, queue: QueueStore, play: (target: {
  bvid: string;
  part: number;
}, position: number) => void): void {
  shell.openModal('continue-detail', child => {
    const panel = document.createElement('section');
    panel.className = 'tv-library-detail';
    const title = document.createElement('h2');
    title.id = 'continue-detail-title';
    title.textContent = card.title;
    panel.setAttribute('aria-labelledby', title.id);
    const text = document.createElement('p');
    text.textContent = card.subtitle + '；本机续播，不写入云端';
    const actions = document.createElement('div');
    actions.className = 'tv-detail-actions';
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    let opening = false;
    const begin = (resume: boolean) => { if (opening || child.signal.aborted)
      return; const current = profile.readPart(card.point.bvid, card.point.part); if (current.kind !== 'ok' || !current.value) {
      status.textContent = '本机位置已变化，请返回重新读取';
      return;
    } opening = true; const position = resume ? current.value.timeMs : 0; void shell.closeOwnedModal(child).then(() => { if (!owner.signal.aborted && !shell.restartRequired)
      play({ bvid: card.point.bvid, part: card.point.part }, position); }); };
    const resume = productButton('continue-play', `继续观看 · P${card.point.part}`, () => begin(true));
    resume.className = 'tv-primary';
    actions.append(resume, productButton('continue-start', '从头播放此分P', () => begin(false)), productButton('continue-queue', `加入本机队列 · P${card.point.part}`, () => { if (child.signal.aborted)
      return; status.textContent = queue.add({ bvid: card.point.bvid, part: card.point.part, title: card.title }) === 'saved' ? '已加入本机队列' : '本机保存未确认，请重新读取'; }), productButton('continue-back', '返回原卡', () => { void shell.closeOwnedModal(child); }));
    panel.append(title, text, actions, status);
    return panel;
  }, 'continue-play');
}
