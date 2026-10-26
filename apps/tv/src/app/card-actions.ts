import type { PopularCard } from '../../../../packages/contracts/src/index.ts';
import type { ResourceOwner } from './resource-owner.ts';
import type { TvShell } from './tv-shell.ts';
import { productButton } from './product-frame.ts';
import { openVideoDetail, type VideoDetailOptions, type VideoDetailServices } from './product-video-detail.ts';
import type { VodPrefetch } from './vod-prefetch.ts';
import type { HoldHandlers } from '../ui/hold.ts';

/** ADR-113 services: the detail page's, plus (signed in) the watch-later action shared with the player's panel. */
export interface VideoCardServices extends VideoDetailServices { watchLater?(bvid: string): void; }

/** One video card's two actions (ADR-113):
 * - short press plays at once (from local progress, if any), handing over the read started on OK down (ADR-110);
 *   an entry with its own primary action (the local queue's "从本项开始播放队列") runs that instead;
 * - a hold opens the card menu: 详情, 从头播放, 稍后再看, 加入本机队列, UP主页 and the entry's own actions. */
export function videoCard(owner: ResourceOwner, shell: TvShell, services: VideoCardServices, card: PopularCard, options: VideoDetailOptions = {}): { choose(): void; hold: HoldHandlers } {
  const part = options.part && options.part > 1 && services.playPart ? options.part : 1, query = { bvid: card.bvid, part };
  let prefetch: VodPrefetch | undefined;
  const pending = pendingReads(owner);
  const drop = () => { const p = prefetch; prefetch = undefined; if (p) { pending.delete(p); void p.close(); } };
  // 自动续播 (the stored resumePrompt preference, ADR-113): on continues from local progress, off starts from 0.
  const saved = () => { const p = services.profile.read(); if (p.kind === 'ok' && !p.value.preferences.resumePrompt) return 0; const s = services.profile.readPart(card.bvid, part); return s.kind === 'ok' && s.value && (!card.durationSec || s.value.timeMs < card.durationSec * 1000) ? s.value.timeMs : 0; };
  const start = (position: number, open?: () => Promise<import('../../../../packages/contracts/src/vod-runtime.ts').VodAccess>) => {
    if (owner.signal.aborted || shell.restartRequired) return;
    if (part > 1) services.playPart!(query, position, open); else services.play(card, position, open);
  };
  const choose = () => {
    if (owner.signal.aborted) return;
    if (options.primary) { drop(); options.primary.run(); return; }
    const p = prefetch, handed = p?.adopt(query); prefetch = undefined;
    // An adopted read belongs to the player now; one that could not be used is closed.
    if (p) { pending.delete(p); if (!handed) void p.close(); }
    start(saved(), handed);
  };
  const hold: HoldHandlers = {
    // The playback read starts on OK down; the release (or a hold) decides whether it is used.
    press: () => { if (!options.primary && !prefetch && services.prefetch && !owner.signal.aborted) { prefetch = services.prefetch(query); pending.add(prefetch); } },
    cancel: drop,
    hold: () => { drop(); openCardMenu(owner, shell, services, card, options, part, saved()); },
  };
  return { choose, hold };
}

/** A page's unfinished card reads (OK pressed, not yet released): one owner resource closes them all on teardown. */
const reads = new WeakMap<ResourceOwner, Set<VodPrefetch>>();
function pendingReads(owner: ResourceOwner): Set<VodPrefetch> {
  let set = reads.get(owner);
  if (!set) { const created = new Set<VodPrefetch>(); set = created; reads.set(owner, created); owner.add('card-prefetch', () => { for (const p of created) void p.close(); created.clear(); }); }
  return set;
}
function openCardMenu(owner: ResourceOwner, shell: TvShell, services: VideoCardServices, card: PopularCard, options: VideoDetailOptions, part: number, at: number): void {
  if (owner.signal.aborted) return;
  const anchor = document.activeElement instanceof HTMLElement ? document.activeElement.getBoundingClientRect() : undefined;
  shell.openModal('card-menu', child => {
    const node = document.createElement('section'), heading = document.createElement('h2'), list = document.createElement('div'), status = document.createElement('p');
    node.className = 'tv-card-menu'; heading.textContent = card.title; list.className = 'tv-card-menu-items'; status.setAttribute('role', 'status');
    if (anchor) Object.assign(node.style, { left: `${Math.round(Math.max(48, Math.min(anchor.left, innerWidth - 560)))}px`, top: `${Math.round(Math.min(anchor.bottom + 12, innerHeight - 480))}px` });
    let leaving = false;
    // Every item closes the menu first, then acts, so focus returns to the card before anything opens on top.
    const closeThen = (action: () => void) => { if (leaving || child.signal.aborted) return; leaving = true; void shell.closeOwnedModal(child).then(() => { if (!owner.signal.aborted && !shell.restartRequired) action(); }); };
    const item = (id: string, label: string, run: () => void) => productButton('card-menu-' + id, label, () => closeThen(run));
    const items: HTMLButtonElement[] = [item('detail', '详情', () => openVideoDetail(owner, shell, services, card, options))];
    if (at && !options.primary) items.push(item('start', part > 1 ? '从头播放此分P' : '从头播放', () => { if (part > 1) services.playPart!({ bvid: card.bvid, part }, 0); else services.play(card, 0); }));
    if (services.watchLater) items.push(item('later', '稍后再看', () => services.watchLater!(card.bvid)));
    if (options.enqueue !== false) items.push(productButton('card-menu-queue', '加入本机队列', () => {
      if (child.signal.aborted) return;
      const outcome = services.queue.add(part > 1 ? { bvid: card.bvid, part, title: card.title } : { bvid: card.bvid, title: card.title });
      status.textContent = outcome === 'saved' ? '已加入本机队列' : outcome === 'full' ? '本机队列已满' : '没有保存成功，可稍后再试';
    }));
    if (services.openUp && services.parts) items.push(productButton('card-menu-up', 'UP主页', () => {
      if (child.signal.aborted || leaving) return;
      // The card names the UP but not its id: one public view read (cached) gives it.
      status.textContent = '正在打开UP主页';
      void services.parts!(card.bvid, child.signal).then(facts => {
        const mid = facts.about?.ownerMid;
        if (!mid) { status.textContent = '这个视频没有提供UP主页'; return; }
        closeThen(() => services.openUp!({ mid, name: card.owner || facts.owner || '' }));
      }, () => { if (!child.signal.aborted) status.textContent = '暂时打不开UP主页，可稍后再试'; });
    }));
    if (options.extra) items.push(...options.extra(child, closeThen));
    items.forEach((b, i) => { b.dataset.up = items[i - 1]?.dataset.focusId ?? b.dataset.focusId; b.dataset.down = items[i + 1]?.dataset.focusId ?? b.dataset.focusId; b.dataset.left = b.dataset.right = b.dataset.focusId; });
    list.append(...items); node.append(heading, list, status); return node;
  }, 'card-menu-detail');
}
