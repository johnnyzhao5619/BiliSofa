import type { ResourceOwner } from './resource-owner.ts';

/** Local playback may act directly from the hidden layer (ADR-088); official cast
 * omits it so waking never takes control from the phone. */
export interface DirectControls { toggle(): boolean; seek(direction: -1 | 1): boolean; }
/** A control layer within the existing modal, never a second key listener.
 * The invisible full-screen wake button owns real DOM focus while watching. */
export class VodControls {
  private hidden = false;
  private focusId = 'vod-toggle';
  private lastActivity = performance.now();
  constructor(private readonly owner: ResourceOwner, private readonly panel: HTMLElement, private readonly content: HTMLElement,
    private readonly wake: HTMLButtonElement, private readonly canHide: () => boolean, private readonly direct?: DirectControls) {
    const activity = () => { this.lastActivity = performance.now(); };
    const reveal = () => this.show();
    panel.addEventListener('focusin', activity); panel.addEventListener('click', activity); wake.addEventListener('click', reveal);
    owner.add('vod-controls', () => { panel.removeEventListener('focusin', activity); panel.removeEventListener('click', activity); wake.removeEventListener('click', reveal); });
  }
  hide(): boolean {
    if (this.owner.signal.aborted || this.panel.inert || this.hidden || !this.canHide()) return false;
    const active = this.panel.ownerDocument.activeElement as HTMLElement | null;
    if (active && this.content.contains(active)) this.focusId = active.dataset.focusId ?? 'vod-toggle';
    this.hidden = true; this.content.hidden = true; this.wake.hidden = false; this.panel.classList.add('vod-controls-hidden'); this.wake.focus(); return true;
  }
  /** Reveal after a direct action; focusId (e.g. the timeline) wins over the remembered control. */
  reveal(focusId?: string): void { this.show(focusId); }
  private show(focusId?: string): void {
    if (this.owner.signal.aborted || this.panel.inert) return;
    this.lastActivity = performance.now();
    const wanted = () => focusId ? [...this.content.querySelectorAll<HTMLElement>('[data-focus-id]')].find(n => n.dataset.focusId === focusId && !n.closest('[hidden]')) : undefined;
    if (!this.hidden) { wanted()?.focus(); return; }
    this.hidden = false; this.content.hidden = false; this.wake.hidden = true; this.panel.classList.remove('vod-controls-hidden');
    const candidates = [...this.content.querySelectorAll<HTMLButtonElement>('button[data-focus-id]:not(:disabled)')].filter(n => !n.closest('[hidden]'));
    (wanted() ?? candidates.find(n => n.dataset.focusId === this.focusId) ?? candidates[0])?.focus();
  }
  back(): boolean { return this.hide(); }
  key(event: KeyboardEvent): boolean {
    if (!['Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Left', 'Right', 'Up', 'Down'].includes(event.key) && ![13, 37, 38, 39, 40].includes(event.keyCode)) return false;
    this.lastActivity = performance.now();
    if (!this.hidden) return false;
    const enter = event.key === 'Enter' || event.keyCode === 13;
    const direction = ['ArrowLeft', 'Left'].includes(event.key) || event.keyCode === 37 ? -1 : ['ArrowRight', 'Right'].includes(event.key) || event.keyCode === 39 ? 1 : 0;
    // Enter toggles once (never on repeat); Left/Right start a timeline preview; Up/Down only wake.
    if (enter && this.direct) { if (!event.repeat) { this.direct.toggle(); this.show(); } return true; }
    if (direction && this.direct?.seek(direction)) { this.show('player-timeline'); return true; }
    if (!event.repeat) this.show();
    return true; // Without direct controls, waking never also clicks/seeks/moves the restored control.
  }
  update(playing: boolean, blocked: boolean): void {
    if (this.owner.signal.aborted) return;
    if (this.panel.inert) { this.lastActivity = performance.now(); return; }
    if (blocked) { this.show(); return; }
    if (!playing) { this.lastActivity = performance.now(); return; }
    if (!this.hidden && performance.now() - this.lastActivity >= 5000) this.hide();
  }
}
