export class FocusRouter {
  private restore: string[] = [];
  private root: HTMLElement;
  constructor(private readonly document: Document, root: HTMLElement) { this.root = root; }
  targets(): HTMLElement[] {
    return [...this.root.querySelectorAll<HTMLElement>('[data-focus-id]')].filter(el => this.usable(el));
  }
  private usable(el: HTMLElement): boolean { return !el.closest('[hidden], [inert]') && !el.matches(':disabled') && el.getClientRects().length > 0; }
  initial(id?: string): void {
    const targets = this.targets();
    (targets.find(el => el.dataset.focusId === id) ?? targets[0])?.focus();
  }
  move(direction: 'left' | 'right' | 'up' | 'down'): void {
    const active = this.document.activeElement as HTMLElement | null;
    // P1-2b (ADR-113 #5): an explicit neighbour is looked up by id; only geometric moves scan and measure the whole layer.
    const named = active && this.root.contains(active) && active.dataset.focusId && this.usable(active) ? active.dataset[direction] : undefined;
    if (named) { [...this.root.querySelectorAll<HTMLElement>(`[data-focus-id="${CSS.escape(named)}"]`)].find(el => this.usable(el))?.focus(); return; }
    const targets = this.targets();
    if (!active || !targets.includes(active)) { this.initial(); return; }
    const explicit = active.dataset[direction];
    if (explicit) { targets.find(el => el.dataset.focusId === explicit)?.focus(); return; }
    const rect = active.getBoundingClientRect();
    const cx = rect.x + rect.width / 2, cy = rect.y + rect.height / 2;
    let best: HTMLElement | undefined, score = Infinity;
    for (const target of targets) {
      if (target === active) continue;
      const r = target.getBoundingClientRect();
      const dx = r.x + r.width / 2 - cx, dy = r.y + r.height / 2 - cy;
      const primary = direction === 'left' ? -dx : direction === 'right' ? dx : direction === 'up' ? -dy : dy;
      const secondary = direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx);
      const distance = primary + secondary * 3;
      if (primary > 1 && distance < score) { best = target; score = distance; }
    }
    best?.focus();
  }
  enterModal(modal: HTMLElement): void {
    this.restore.push((this.document.activeElement as HTMLElement | null)?.dataset.focusId ?? '');
    this.root = modal; this.initial();
  }
  leaveModal(root: HTMLElement): void { this.root = root; this.initial(this.restore.pop()); }
}
