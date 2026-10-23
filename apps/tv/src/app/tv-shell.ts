import {continuousGridKey} from '../ui/continuous-grid.ts';
import {productPanel} from '../ui/product-panel.ts';
import { DomainError } from '../../../../packages/contracts/src/index.ts';
import type { PageRoute, ReturnAnchor } from '../../../../packages/contracts/src/navigation.ts';
import { FocusRouter } from '../ui/focus.ts';
import { InputRouter } from '../ui/input.ts';
import { NavigationStack } from './navigation.ts';
import { ResourceOwner, type CloseSummary } from './resource-owner.ts';
export type PageFactory = (route: PageRoute, owner: ResourceOwner) => HTMLElement;
interface ModalFrame { id: string; node: HTMLElement; owner: ResourceOwner; }
export interface ModalInput { back(): boolean; key(event: KeyboardEvent): boolean; }
const closed = (): CloseSummary => ({ closed: true, failed: [] });
/** One input/focus owner. Async data work belongs to the mounted view's owner. */
export class TvShell {
  readonly navigation = new NavigationStack();
  private readonly focus: FocusRouter;
  private readonly input: InputRouter;
  private pageOwner: ResourceOwner | undefined;
  private modals: ModalFrame[] = [];
  private readonly modalInputs = new WeakMap<ResourceOwner, ModalInput>();
  private readonly pageInputs = new WeakMap<ResourceOwner, ModalInput>();
  private barrier: Promise<CloseSummary> = Promise.resolve(closed());
  private closingModal: Promise<void> | undefined;
  private epoch = 0;
  private hidden = false;
  private disposed = false;
  private poisoned = false;
  private switchingAccount = false;
  private suspension: Promise<void> = Promise.resolve();
  private revalidation: AbortController | undefined;
  constructor(private readonly document: Document, private readonly root: HTMLElement, private readonly overlays: HTMLElement,
    private readonly factory: PageFactory, mapBack: (e: KeyboardEvent) => boolean, private readonly rootBack: () => void,
    private readonly closeBudgetMs = 6000, private readonly pendingBack?: () => void) {
    if (root === overlays || root.contains(overlays) || overlays.contains(root)) throw new DomainError('invalid');
    this.focus = new FocusRouter(document, root);
    this.input = new InputRouter(document, this.focus, () => { void this.back(); }, mapBack, event => {
      const frame=this.modals.at(-1);
      if(this.hidden||this.disposed||this.closingModal)return false;
      if(frame)return !frame.owner.signal.aborted&&((this.modalInputs.get(frame.owner)?.key(event)??false)||continuousGridKey(event));
      return !!this.pageOwner&&!this.pageOwner.signal.aborted&&((this.pageInputs.get(this.pageOwner)?.key(event)??false)||continuousGridKey(event));
    });
  }
  /** Page location only: modal/player actions and their payloads are never resumed. */
  recoveryDestination():{route:PageRoute;anchor:ReturnAnchor}{
    const current=this.navigation.current;
    return {route:current.route,anchor:this.modals.length?current.anchor:this.anchor()};
  }
  get restartRequired(): boolean { return this.poisoned; }
  /** Commands go through the shell's sole InputRouter; ownership ends with modal. */
  modalInput(owner: ResourceOwner, input: ModalInput): void {
    owner.assertOpen();
    if(this.modalInputs.has(owner))throw new DomainError('invalid');
    this.modalInputs.set(owner,input);owner.add('modal-input',()=>{this.modalInputs.delete(owner);});
  }
  pageInput(owner:ResourceOwner,input:ModalInput):void {
    owner.assertOpen();if(this.pageInputs.has(owner))throw new DomainError('invalid');
    this.pageInputs.set(owner,input);owner.add('page-input',()=>{this.pageInputs.delete(owner);});
  }
  private anchor(): ReturnAnchor {
    const active = this.document.activeElement as HTMLElement | null;
    return { focusId: active && this.root.contains(active) ? active.dataset.focusId ?? '' : this.navigation.current.anchor.focusId, scrollTop: this.root.scrollTop };
  }
  private assertUsable(): void { if (this.disposed || this.hidden || this.poisoned || this.switchingAccount) throw new DomainError('unknown'); }
  private drainPage(): Promise<CloseSummary> {
    const owner = this.pageOwner; this.pageOwner = undefined;
    this.barrier = Promise.all([this.barrier, owner?.close() ?? Promise.resolve(closed())]).then(results => ({ closed: results.every(r => r.closed), failed: results.every(r => r.closed) ? [] : ['page-owner'] }));
    return this.barrier;
  }
  private message(text: string, back = false): void {
    const p = this.document.createElement('p'); p.setAttribute('role', 'status'); p.textContent = text;
    this.root.replaceChildren(p);
    if (back) {
      const button = this.document.createElement('button'); button.textContent = '返回'; button.dataset.focusId = 'loading-back';
      button.addEventListener('click', () => { void this.back(); }, { once: true }); this.root.append(button);
      if (!this.modals.length) this.focus.initial('loading-back');
    }
  }
  private block(): void {
    this.poisoned = true; void this.pageOwner?.close(); this.message('请重新打开应用');
  }
  async start(): Promise<void> { this.assertUsable(); await this.render(); }
  async navigate(route: PageRoute, replace = false): Promise<void> {
    this.assertUsable();
    if (replace) this.navigation.replace(route); else this.navigation.push(route, this.anchor());
    await this.render();
  }
  async navigateTop(route:PageRoute,focusId?:string):Promise<void>{
    this.assertUsable();const anchor=this.anchor();if(focusId)anchor.focusId=focusId;this.navigation.selectTop(route,anchor);await this.render();
  }
  private async render(): Promise<void> {
    const epoch = ++this.epoch;
    const closing = this.drainPage(); this.message('正在打开…', true);
    const result = await closing;
    if (!result.closed) { this.poisoned = true; if (epoch === this.epoch && !this.hidden && !this.disposed) this.block(); return; }
    if (epoch !== this.epoch || this.hidden || this.disposed) return;
    const owner = new ResourceOwner(this.closeBudgetMs); this.pageOwner = owner;
    try {
      const entry = this.navigation.current, node = this.factory(entry.route, owner);
      if (node.ownerDocument !== this.document || node.contains(this.root) || node.contains(this.overlays)) throw new DomainError('invalid');
      owner.assertOpen(); this.root.replaceChildren(node);
      if (!this.modals.length) {
        const anchor = entry.anchor.focusId;
        // Async content may not have mounted its remembered card yet. Use the
        // page's declared entry until it can restore that card, not another rail.
        this.focus.initial(this.focus.targets().some(target => target.dataset.focusId === anchor) ? anchor : node.dataset.initialFocusId);
      }
      this.root.scrollTop = entry.anchor.scrollTop;
    } catch {
      const cleanup = await owner.close();
      if (epoch !== this.epoch || this.hidden || this.disposed) return;
      if (!cleanup.closed) this.block(); else this.message('页面暂时无法打开', true);
    }
  }
  openModal(id: string, factory: (owner: ResourceOwner) => HTMLElement, initialFocusId?: string): void {
    this.assertUsable(); if (this.closingModal) throw new DomainError('invalid');
    const previous = this.modals[this.modals.length - 1]?.node ?? this.root;
    const active = this.document.activeElement as HTMLElement | null;
    const anchor = { focusId: active?.dataset.focusId ?? '', scrollTop: previous.scrollTop };
    const owner = new ResourceOwner(this.closeBudgetMs);
    try {
      const node = factory(owner);
      if (node.ownerDocument !== this.document || node.contains(this.root) || node.contains(this.overlays)) throw new DomainError('invalid');
      if (!this.modals.length) this.navigation.remember(this.anchor());
      this.navigation.openModal(id, anchor);
      if(this.document.body.classList.contains('product-player'))productPanel(owner,node);
      node.setAttribute('role', 'dialog'); node.setAttribute('aria-modal', 'true'); previous.inert = true;
      this.overlays.append(node); this.modals.push({ id, node, owner }); this.focus.enterModal(node); if(initialFocusId||node.dataset.initialFocusId)this.focus.initial(node.dataset.initialFocusId??initialFocusId);
    } catch (error) { void owner.close().then(value => { if (!value.closed) this.block(); }); throw error; }
  }
  private closeModal(): Promise<void> {
    if (this.closingModal) return this.closingModal;
    const frame = this.modals[this.modals.length - 1]; if (!frame) return Promise.resolve();
    this.closingModal = (async () => {
      frame.node.inert = true;
      const result = await frame.owner.close();
      if (this.modals[this.modals.length - 1] !== frame) return;
      this.modals.pop(); const action = this.navigation.back();
      if (action.kind !== 'modal' || action.id !== frame.id) { this.block(); return; }
      frame.node.remove();
      const previous = this.modals[this.modals.length - 1]?.node ?? this.root;
      previous.inert = false; this.focus.leaveModal(previous); previous.scrollTop = action.anchor.scrollTop;
      if (!result.closed) this.block();
    })().finally(() => { this.closingModal = undefined; });
    return this.closingModal;
  }
  /** Explicit "return to card" closes its own top modal; remote Back still
   * follows IME/dialog/control-layer priority. Stale/background buttons cannot pop it. */
  closeOwnedModal(owner: ResourceOwner): Promise<void> {
    return this.modals.at(-1)?.owner === owner && !owner.signal.aborted ? this.closeModal() : Promise.resolve();
  }
  /** An optional source-bound reader may dismiss its own descendant dialogs. */
  async closeOwnedBranch(owner: ResourceOwner): Promise<void> {
    while (this.modals.some(frame => frame.owner === owner)) await this.closeModal();
  }
  async back(): Promise<void> {
    if (this.disposed || this.switchingAccount) return;
    if (this.hidden) { this.pendingBack?.(); return; }
    if (this.modals.length || this.closingModal) {
      const frame=this.modals.at(-1);
      if(!this.closingModal && frame && !frame.owner.signal.aborted && this.modalInputs.get(frame.owner)?.back())return;
      await this.closeModal(); return;
    }
    if (this.poisoned) { this.rootBack(); return; }
    if(this.pageOwner&&!this.pageOwner.signal.aborted&&this.pageInputs.get(this.pageOwner)?.back())return;
    const action = this.navigation.back();
    if (action.kind === 'page') await this.render(); else if (action.kind === 'root') this.rootBack();
  }
  private async drainModals(): Promise<boolean> {
    // Home/account/dispose abort every owner immediately; a child native read
    // must never delay the underlying player stop while we drain top-down.
    for (const frame of this.modals) void frame.owner.close();
    let okay = true;
    while (this.modals.length) { await this.closeModal(); if (this.poisoned) okay = false; }
    return okay;
  }
  async accountChanged(): Promise<void> {
    this.assertUsable(); const epoch = ++this.epoch; this.switchingAccount = true;
    const closing = this.drainPage(); this.root.inert = true; this.root.replaceChildren();
    try {
      await this.drainModals(); this.navigation.resetForAccountChange();
      if (!(await closing).closed) this.poisoned = true;
    } finally { this.switchingAccount = false; }
    if (epoch === this.epoch && !this.poisoned && !this.hidden && !this.disposed) { this.root.inert = false; await this.render(); }
  }
  suspend(): Promise<void> {
    if (this.disposed) return Promise.resolve();
    // A second Home invalidates an in-flight foreground revalidation too.
    this.epoch++; this.revalidation?.abort(); this.revalidation = undefined;
    if (this.hidden) return this.suspension;
    this.hidden = true; this.navigation.remember(this.anchor());
    const closing = this.drainPage(); this.root.inert = true; this.root.replaceChildren();
    this.suspension = (async () => {
      const modalOkay = await this.drainModals(); const result = await closing;
      this.root.inert = true; if (!modalOkay || !result.closed) this.poisoned = true;
    })();
    return this.suspension;
  }
  async suspendConfirmed(): Promise<CloseSummary> {
    await this.suspend(); const result = await this.barrier;
    const okay = this.hidden && !this.disposed && !this.poisoned && result.closed;
    return { closed: okay, failed: okay ? [] : ['shell-owner'] };
  }
  async resume(revalidate: (signal: AbortSignal) => Promise<void>): Promise<void> {
    if (this.disposed || !this.hidden) return;
    const epoch = ++this.epoch;
    this.revalidation?.abort(); const controller = new AbortController(); this.revalidation = controller;
    const current = () => epoch === this.epoch && !this.disposed && !controller.signal.aborted;
    const blocked = () => { if (current()) { this.hidden = false; this.root.inert = false; this.block(); } };
    try {
      await this.suspension;
      if (!current()) return;
      if (this.poisoned || !(await this.barrier).closed) { blocked(); return; }
      if (!current()) return;
      try { await revalidate(controller.signal); } catch { blocked(); return; }
      if (!current() || this.poisoned) return;
      this.hidden = false; this.root.inert = false; await this.render();
    } finally { if (this.revalidation === controller) this.revalidation = undefined; }
  }
  async dispose(): Promise<CloseSummary> {
    this.revalidation?.abort(); this.revalidation = undefined;
    if (!this.disposed) { this.disposed = true; this.epoch++; this.input.dispose(); }
    const page = this.drainPage(); const modalOkay = await this.drainModals(); const result = await page;
    this.root.replaceChildren(); this.overlays.replaceChildren();
    return { closed: result.closed && modalOkay && !this.poisoned, failed: result.closed && modalOkay && !this.poisoned ? [] : ['shell-owner'] };
  }
}
