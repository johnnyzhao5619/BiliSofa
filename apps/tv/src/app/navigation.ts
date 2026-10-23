import { DomainError } from '../../../../packages/contracts/src/index.ts';
import { parsePageRoute, parseReturnAnchor, type PageRoute, type ReturnAnchor } from '../../../../packages/contracts/src/navigation.ts';
interface PageEntry { route: PageRoute; anchor: ReturnAnchor; }
export type BackAction = { kind: 'modal'; id: string; anchor: ReturnAnchor }
  | { kind: 'page'; entry: PageEntry } | { kind: 'root' };
const emptyAnchor = (): ReturnAnchor => ({ focusId: '', scrollTop: 0 });
/** Deepest product path: library folder → player → comments → detail → replies → reply. */
export const MODAL_LIMIT = 6;
const copy = (entry: PageEntry): PageEntry => ({ route: { ...entry.route }, anchor: { ...entry.anchor } });
export class NavigationStack {
  private pages: PageEntry[];
  private modals: { id: string; anchor: ReturnAnchor }[] = [];
  private epoch = 0;
  private readonly topAnchors = new Map<string,ReturnAnchor>();
  constructor(route: PageRoute = { page: 'home' }) { this.pages = [{ route: parsePageRoute(route), anchor: emptyAnchor() }]; }
  get generation(): number { return this.epoch; }
  get depth(): number { return this.pages.length; }
  get modalDepth(): number { return this.modals.length; }
  get current(): PageEntry { return copy(this.pages[this.pages.length - 1]!); }
  accepts(generation: number): boolean { return generation === this.epoch; }
  remember(anchor: ReturnAnchor): void { this.pages[this.pages.length - 1]!.anchor = parseReturnAnchor(anchor); }
  push(route: PageRoute, anchor: ReturnAnchor): void {
    const parsed = parsePageRoute(route), saved = parseReturnAnchor(anchor);
    if (this.modals.length || this.pages.length >= 32) throw new DomainError('invalid');
    this.pages[this.pages.length - 1]!.anchor = saved;
    this.pages.push({ route: parsed, anchor: emptyAnchor() }); this.epoch++;
  }
  replace(route: PageRoute): void {
    const parsed = parsePageRoute(route);
    if (this.modals.length) throw new DomainError('invalid');
    this.pages[this.pages.length - 1] = { route: parsed, anchor: emptyAnchor() }; this.epoch++;
  }
  selectTop(route:PageRoute,anchor:ReturnAnchor):void {
    const parsed=parsePageRoute(route),saved=parseReturnAnchor(anchor);
    if(this.modals.length||'id'in parsed)throw new DomainError('invalid');
    if(this.pages.length===1&&!('id'in this.current.route))this.topAnchors.set(this.current.route.page,saved);
    this.pages=[{route:parsed,anchor:{...(this.topAnchors.get(parsed.page)??emptyAnchor())}}];this.epoch++;
  }
  openModal(id: string, anchor: ReturnAnchor): void {
    const saved = parseReturnAnchor(anchor);
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(id) || this.modals.length >= MODAL_LIMIT || this.modals.some(m => m.id === id)) throw new DomainError('invalid');
    this.modals.push({ id, anchor: saved });
  }
  back(): BackAction {
    const modal = this.modals.pop();
    if (modal) return { kind: 'modal', id: modal.id, anchor: { ...modal.anchor } };
    if (this.pages.length === 1) return { kind: 'root' };
    this.pages.pop(); this.epoch++; return { kind: 'page', entry: this.current };
  }
  restoreDestination(route:PageRoute,anchor:ReturnAnchor):void {
    const parsed=parsePageRoute(route),saved=parseReturnAnchor(anchor);
    this.resetForAccountChange();this.pages=[{route:parsed,anchor:saved}];
  }
  resetForAccountChange(): void {
    this.topAnchors.clear();
    this.epoch++; this.modals = []; this.pages = [{ route: { page: 'home' }, anchor: emptyAnchor() }];
  }
}
