import type { FocusRouter } from './focus.ts';
/** Remote media keys after the platform adapter maps them; never raw key codes. */
export type MediaCommand = 'play-pause' | 'play' | 'pause' | 'stop' | 'forward' | 'rewind';
export function shouldConfirm(event: { isComposing: boolean; keyCode: number; repeat: boolean }, composing: boolean, cooling: boolean): boolean {
  return !event.isComposing && event.keyCode !== 229 && !event.repeat && !composing && !cooling;
}
/** ADR-113: OK held this long on a holdable control opens its menu instead of activating it. On this TV a held OK
 * sends no keydown repeats and always a keyup, so the hold is timed from keydown (design/evidence/2026-10-26-ok-key). */
export const HOLD_MS = 500;
export class InputRouter {
  private composing = false;
  /** The holdable control under a pressed OK, until keyup or the hold fires. */
  private pressed: { target: HTMLElement; timer: ReturnType<typeof setTimeout>; held: boolean } | undefined;
  private cooling = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly start = () => { this.composing = true; };
  private readonly end = () => {
    this.composing = false; this.cooling = true;
    clearTimeout(this.timer); this.timer = setTimeout(() => { this.cooling = false; }, 120);
  };
  private readonly key = (event: KeyboardEvent) => {
    // Any other key during an OK press ends it without activating anything (ADR-113).
    if (this.pressed && event.key !== 'Enter' && event.keyCode !== 13) this.release(false);
    const target = event.target as HTMLElement | null;
    const editing = target?.matches('input, textarea');
    // Native IME owns input edits. Done/Cancel only finish editing, never activate a page.
    if (editing && [65376, 65385].includes(event.keyCode)) { target?.blur(); this.focus.initial(target?.dataset.returnFocusId ?? 'ime'); return; }
    const back = this.mapBack(event);
    if (back) {
      if (this.composing || event.isComposing || event.keyCode === 229 || this.cooling) return;
      if (editing) { target?.blur(); this.focus.initial(target?.dataset.returnFocusId ?? 'ime'); return; }
      event.preventDefault();
      if (!event.repeat) this.back();
      return;
    }
    if (editing) return;
    if (!this.composing && !event.isComposing && event.keyCode !== 229 && this.command?.(event)) { event.preventDefault(); return; }
    if (event.key === 'Enter') {
      if (!shouldConfirm(event, this.composing, this.cooling)) { event.preventDefault(); return; }
      event.preventDefault();
      // A holdable control decides on release: short press clicks, a 0.5 s hold opens its menu (ADR-113).
      if (target?.dataset.hold) { if (!this.pressed) this.press(target); return; }
      target?.click();
      return;
    }

    if (editing || this.composing || event.isComposing || event.keyCode === 229) return;
    const direction = { ArrowLeft: 'left', Left: 'left', ArrowRight: 'right', Right: 'right', ArrowUp: 'up', Up: 'up', ArrowDown: 'down', Down: 'down' }[event.key]
      ?? ({ 37: 'left', 38: 'up', 39: 'right', 40: 'down' } as Record<number, string>)[event.keyCode];
    if (direction) { event.preventDefault(); this.focus.move(direction as 'left' | 'right' | 'up' | 'down'); }
  };
  private press(target: HTMLElement): void {
    const timer = setTimeout(() => {
      const pressed = this.pressed; if (!pressed || pressed.target !== target) return;
      pressed.held = true; target.dispatchEvent(new CustomEvent('tv-press-cancel')); target.dispatchEvent(new CustomEvent('tv-hold'));
    }, HOLD_MS);
    this.pressed = { target, timer, held: false };
    target.dispatchEvent(new CustomEvent('tv-press'));
  }
  /** `activate` is true for the OK release itself: before the hold fired it is the short press. */
  private release(activate: boolean): void {
    const pressed = this.pressed; if (!pressed) return;
    this.pressed = undefined; clearTimeout(pressed.timer);
    if (pressed.held) return;
    if (activate && pressed.target.isConnected && this.document.activeElement === pressed.target) pressed.target.click();
    else pressed.target.dispatchEvent(new CustomEvent('tv-press-cancel'));
  }
  private readonly up = (event: KeyboardEvent) => { if (event.key === 'Enter' || event.keyCode === 13) { if (this.pressed) event.preventDefault(); this.release(true); } };
  private readonly blur = () => { this.release(false); };
  /** Pointer mode (smart remote): a context menu on a holdable control is its hold. */
  private readonly context = (event: MouseEvent) => {
    const control = (event.target as Element | null)?.closest?.('[data-hold]') as HTMLElement | null;
    if (!control) return; event.preventDefault(); control.dispatchEvent(new CustomEvent('tv-hold'));
  };
  constructor(private readonly document: Document, private readonly focus: FocusRouter, private readonly back: () => void, private readonly mapBack: (event: KeyboardEvent) => boolean, private readonly command?: (event: KeyboardEvent) => boolean) {
    document.addEventListener('keydown', this.key);
    document.addEventListener('keyup', this.up);
    document.addEventListener('focusout', this.blur);
    document.addEventListener('contextmenu', this.context);
    document.addEventListener('compositionstart', this.start);
    document.addEventListener('compositionend', this.end);
  }
  dispose(): void {
    clearTimeout(this.timer); this.release(false);
    this.document.removeEventListener('keydown', this.key);
    this.document.removeEventListener('keyup', this.up);
    this.document.removeEventListener('focusout', this.blur);
    this.document.removeEventListener('contextmenu', this.context);
    this.document.removeEventListener('compositionstart', this.start);
    this.document.removeEventListener('compositionend', this.end);
  }
}
