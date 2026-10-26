/** What a holdable control does (ADR-113): `press` on OK down, `cancel` when the press turns into a hold or moves away,
 * `hold` after 0.5 s (or a pointer context menu). The short press itself stays the control's ordinary click. */
export interface HoldHandlers { press?(): void; cancel?(): void; hold(): void; }
/** Marks a control as holdable; the single InputRouter decides short versus long and dispatches these events. */
export function holdable(control: HTMLElement, handlers: HoldHandlers): void {
  control.dataset.hold = 'menu';
  control.addEventListener('tv-press', () => handlers.press?.());
  control.addEventListener('tv-press-cancel', () => handlers.cancel?.());
  control.addEventListener('tv-hold', () => handlers.hold());
}
