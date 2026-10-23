import type { OverlayFrame } from '../../../../packages/media/src/overlay-session.ts';

/** Passive visual layer: no focus, keyboard handlers, markup evaluation or
 * live-region announcements on media ticks. Its owner calls close on teardown. */
export class MediaOverlayView {
  readonly element: HTMLDivElement;
  private readonly danmaku: HTMLDivElement;
  private readonly subtitles: HTMLDivElement;
  private readonly nodes = new Map<string, HTMLSpanElement>();
  private readonly styles = new WeakMap<HTMLSpanElement, string>();
  private subtitleKey = '';
  private closed = false;
  constructor(private readonly document: Document, parent: HTMLElement) {
    this.element = document.createElement('div'); this.element.className = 'media-overlay-view'; this.element.setAttribute('aria-hidden', 'true');
    Object.assign(this.element.style, { position: 'absolute', inset: '0', pointerEvents: 'none', overflow: 'hidden', zIndex: '1' });
    this.danmaku = document.createElement('div'); this.subtitles = document.createElement('div'); this.subtitles.className = 'subtitle-lines';
    Object.assign(this.subtitles.style, { position: 'absolute', bottom: '25%', left: '10%', width: '80%', textAlign: 'center', whiteSpace: 'pre-wrap', color: '#fff', textShadow: '0 2px 3px #000' });
    this.element.append(this.danmaku, this.subtitles); parent.append(this.element);
  }
  render(frame: OverlayFrame): void {
    if (this.closed) return;
    const keep = new Set(frame.danmaku.map(item => item.id)), settings = frame.preferences;
    for (const [id, node] of this.nodes) if (!keep.has(id)) { node.remove(); this.nodes.delete(id); }
    for (const item of frame.danmaku) {
      let node = this.nodes.get(item.id);
      if (!node) { node = this.document.createElement('span'); node.className = 'danmaku-line'; this.nodes.set(item.id, node); this.danmaku.append(node); Object.assign(node.style, { position: 'absolute', left: '0', top: '0', whiteSpace: 'pre', overflow: 'hidden', textShadow: '0 2px 3px #000' }); }
      if (node.textContent !== item.content) node.textContent = item.content;
      const style = [item.x, item.y, item.width, item.color, settings.danmaku.fontSize, settings.danmaku.opacity].join('|');
      if (this.styles.get(node) !== style) { Object.assign(node.style, { transform: `translate(${item.x}px,${item.y}px)`, width: `${item.width}px`, color: `#${item.color.toString(16).padStart(6, '0')}`, fontSize: `${settings.danmaku.fontSize}px`, opacity: String(settings.danmaku.opacity) }); this.styles.set(node, style); }
    }
    const key = JSON.stringify(frame.subtitles.map(cue => [cue.id, cue.content]));
    if (key !== this.subtitleKey) { this.subtitles.replaceChildren(...frame.subtitles.map(cue => { const line = this.document.createElement('p'); line.textContent = cue.content; line.style.margin = '4px'; return line; })); this.subtitleKey = key; }
    if (this.subtitles.style.fontSize !== `${settings.subtitles.fontSize}px`) this.subtitles.style.fontSize = `${settings.subtitles.fontSize}px`;
  }
  reserveBottom(pixels: number): void { if (!this.closed && Number.isFinite(pixels)) this.subtitles.style.bottom = `${Math.max(60, Math.min(960, pixels))}px`; }
  close(): void { if (!this.closed) { this.closed = true; this.nodes.clear(); this.element.remove(); } }
}
