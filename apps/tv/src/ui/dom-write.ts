/** P1-2b (ADR-113 #5): DOM writes that skip unchanged values. A 200 ms player refresh or a focus move that rewrites the
 * same text or attribute still invalidates style/layout on the TV, so periodic code writes only what changed. */
export interface WritableElement {
  textContent: string | null;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
}
export function setText(element: WritableElement, value: string): void { if (element.textContent !== value) element.textContent = value; }
export function setAttr(element: WritableElement, name: string, value: string | undefined): void {
  if (value === undefined) { if (element.getAttribute(name) !== null) element.removeAttribute(name); }
  else if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}
/** `key` is the data-* name in kebab case without the prefix, e.g. 'left' or 'focus-id'. */
export function setData(element: WritableElement, key: string, value: string | undefined): void { setAttr(element, 'data-' + key, value); }
export function setDisabled(element: { disabled: boolean }, value: boolean): void { if (element.disabled !== value) element.disabled = value; }
export function setHidden(element: { hidden: boolean }, value: boolean): void { if (element.hidden !== value) element.hidden = value; }
