import type { FocusRouter } from './focus.ts';
/** Remote media keys after the platform adapter maps them; never raw key codes. */
export type MediaCommand = 'play-pause' | 'play' | 'pause' | 'stop' | 'forward' | 'rewind';
export function shouldConfirm(event: { isComposing: boolean; keyCode: number; repeat: boolean }, composing: boolean, cooling: boolean): boolean {
  return !event.isComposing && event.keyCode !== 229 && !event.repeat && !composing && !cooling;
}
export class InputRouter {
  private composing = false;
  private cooling = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly start = () => { this.composing = true; };
  private readonly end = () => {
    this.composing = false; this.cooling = true;
    clearTimeout(this.timer); this.timer = setTimeout(() => { this.cooling = false; }, 120);
  };
  private readonly key = (event: KeyboardEvent) => {
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
      if (!editing) { event.preventDefault(); target?.click(); }
      return;
    }
    if (editing || this.composing || event.isComposing || event.keyCode === 229) return;
    const direction = { ArrowLeft: 'left', Left: 'left', ArrowRight: 'right', Right: 'right', ArrowUp: 'up', Up: 'up', ArrowDown: 'down', Down: 'down' }[event.key]
      ?? ({ 37: 'left', 38: 'up', 39: 'right', 40: 'down' } as Record<number, string>)[event.keyCode];
    if (direction) { event.preventDefault(); this.focus.move(direction as 'left' | 'right' | 'up' | 'down'); }
  };
  constructor(private readonly document: Document, private readonly focus: FocusRouter, private readonly back: () => void, private readonly mapBack: (event: KeyboardEvent) => boolean, private readonly command?: (event: KeyboardEvent) => boolean) {
    document.addEventListener('keydown', this.key);
    document.addEventListener('compositionstart', this.start);
    document.addEventListener('compositionend', this.end);
  }
  dispose(): void {
    clearTimeout(this.timer);
    this.document.removeEventListener('keydown', this.key);
    this.document.removeEventListener('compositionstart', this.start);
    this.document.removeEventListener('compositionend', this.end);
  }
}
