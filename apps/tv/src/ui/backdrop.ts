/** ADR-114: a blurred, darkened copy of an already-loaded cover behind a page. It never requests anything: `show`
 * takes the `src` of an image already in the page (a blob URL its CoverArt owns) and only fades it in or out.
 * Off since 0.61.1: on the TV, loading each cover into the layer (shown or not) made every other home key press
 * stall 0.6–1.5 s (ADR-114 device check). With it off, `backdrop` adds no element and `show` does nothing. */
export const BACKDROP_ENABLED = false;
export interface Backdrop { show(src: string | undefined, delayMs?: number): void; }
export function backdrop(host: HTMLElement, signal: AbortSignal): Backdrop {
  if (!BACKDROP_ENABLED) return { show() {} };
  const layer = document.createElement('div'), image = document.createElement('img');
  layer.className = 'tv-backdrop'; layer.setAttribute('aria-hidden', 'true'); image.alt = '';
  layer.append(image); host.prepend(layer);
  let timer: ReturnType<typeof setTimeout> | undefined;
  signal.addEventListener('abort', () => { clearTimeout(timer); image.removeAttribute('src'); layer.remove(); }, { once: true });
  return {
    show(src, delayMs = 0) {
      clearTimeout(timer);
      if (signal.aborted) return;
      if (!src) { layer.classList.remove('shown'); return; }
      timer = setTimeout(() => { if (signal.aborted) return; if (image.getAttribute('src') !== src) image.src = src; layer.classList.add('shown'); }, delayMs);
    },
  };
}
