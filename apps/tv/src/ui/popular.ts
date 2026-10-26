import { SessionManager } from '../../../../packages/bili-client/src/session.ts';
import { DomainError, type PopularCard, type PopularResult } from '../../../../packages/contracts/src/index.ts';
import { GuestVideoWorker } from '../platform/guest-video-worker.ts';
import type { GuestVideoResult } from '../../../../packages/contracts/src/guest-video.ts';
import { PopularWorker } from '../platform/popular-worker.ts';
import type { FocusRouter } from './focus.ts';
export class PopularView {
  private readonly session = new SessionManager();
  private readonly worker = new PopularWorker();
  private readonly cards: HTMLButtonElement[] = [];
  private readonly video = new GuestVideoWorker();
  private readonly sourceButton: HTMLButtonElement;
  private readonly playButton: HTMLButtonElement;
  private selected = -1;
  private page = 1;
  private items: PopularCard[] = [];
  private noMore = true;
  private busy = false;
  private readonly state: HTMLElement;
  private readonly detail: HTMLElement;
  private readonly controls: HTMLButtonElement[];
  constructor(private readonly modal: HTMLElement, private readonly root: HTMLElement, private readonly focus: FocusRouter, private readonly observed: (result: PopularResult | { kind: 'unconfirmed'; code: string }) => void, private readonly onClose: () => void = () => {}, private readonly sourceObserved: (result: GuestVideoResult | { code: string }) => void = () => {}, private readonly onInteraction: () => void = () => {}, private readonly onPlay: (bvid: string) => void = () => {}) {
    this.state = modal.querySelector('#popular-state')!; this.detail = modal.querySelector('#popular-detail')!;
    this.sourceButton = document.createElement('button'); this.sourceButton.id = 'popular-source'; this.sourceButton.dataset.focusId = 'popular-source'; this.sourceButton.hidden = true; this.sourceButton.textContent = '检查游客播放源'; this.detail.after(this.sourceButton);
    this.playButton = document.createElement('button'); this.playButton.id = 'popular-play'; this.playButton.dataset.focusId = 'popular-play'; this.playButton.hidden = true; this.playButton.textContent = '播放游客360P · 首P'; this.sourceButton.after(this.playButton);
    this.playButton.addEventListener('click', () => { const item = this.items[this.selected]; if (!item || this.busy) return; this.onInteraction(); this.hideForPlayback(); this.onPlay(item.bvid); });
    this.sourceButton.addEventListener('click', () => { this.onInteraction(); void this.checkSource(); });
    this.controls = ['popular-prev', 'popular-next', 'popular-reload', 'popular-close'].map(id => modal.querySelector<HTMLButtonElement>(`#${id}`)!);
    this.controls[0]!.addEventListener('click', () => { this.onInteraction(); void this.load(this.page - 1); });
    this.controls[1]!.addEventListener('click', () => { this.onInteraction(); void this.load(this.page + 1); });
    this.controls[2]!.addEventListener('click', () => { this.onInteraction(); void this.load(this.page); });
    this.controls[3]!.addEventListener('click', () => this.close());
    for (let i = 0; i < 4; i++) {
      const card = document.createElement('button'); card.dataset.focusId = `popular-card-${i}`; card.hidden = true;
      card.addEventListener('click', () => { this.onInteraction(); this.select(i); }); this.cards.push(card); modal.querySelector('#popular-cards')!.append(card);
    }
  }
  async show(): Promise<void> {
    if (!this.modal.hidden) return;
    this.modal.hidden = false; this.root.inert = true; this.focus.enterModal(this.modal);
    await this.load(1);
  }
  back(): boolean { if (this.modal.hidden) return false; this.close(); return true; }
  close(): void {
    if (this.modal.hidden) return;
    this.session.invalidate(); void this.worker.dispose().catch(() => this.observed({ kind: 'unconfirmed', code: 'guest.cleanup_unknown_restart_required' }));
    void this.video.dispose().catch(() => this.sourceObserved({ code: 'ugc.cleanup_unknown_restart_required' }));
    this.busy = false; this.modal.hidden = true; this.root.inert = false; this.focus.leaveModal(this.root); this.onClose();
  }
  private async load(page: number): Promise<void> {
    if (this.busy || !Number.isInteger(page) || page < 1 || page > 10 || this.modal.hidden) return;
    this.session.invalidate(); const task = this.session.begin('guest-popular');
    this.busy = true; this.state.textContent = '正在从 Bilibili 读取游客热门'; this.detail.textContent = ''; this.selected = -1; this.sourceButton.hidden = true; this.playButton.hidden = true; this.items = []; this.render();
    try {
      const result = await this.worker.run({ version: 1, scope: task.scope, operation: 'guest-popular', page }, task.signal);
      if (!this.session.accepts(task.scope) || this.modal.hidden) return;
      this.observed(result);
      if (result.kind === 'ok') {
        this.page = page; this.items = result.items; this.noMore = result.noMore;
        this.state.textContent = `游客热门 · 第 ${this.page} 页 · ${this.items.length} 条 · HTTP ${result.status}`;
        if (!this.items.length) this.detail.textContent = '当前页没有内容，可重新读取或返回。';
      } else {
        this.noMore = true;
        this.state.textContent = `${result.kind === 'http_error' ? '服务响应失败' : result.kind === 'api_error' ? '接口返回错误' : result.kind === 'invalid_response' ? '响应格式不符合预期' : '读取未完成'} · HTTP ${result.status} · ${result.code}${result.apiCode === undefined ? '' : ` · API ${result.apiCode}`}`;
      }
    } catch (error) {
      if (!this.session.accepts(task.scope) || this.modal.hidden) return;
      const code = error instanceof DomainError ? `guest.worker_${error.code}_cleanup_unconfirmed` : 'guest.worker_unknown_cleanup_unconfirmed';
      this.state.textContent = `读取失败 · ${code} · 返回后可查看诊断`;
      this.observed({ kind: 'unconfirmed', code });
    } finally {
      if (this.session.accepts(task.scope) && !this.modal.hidden) { this.busy = false; this.render(); }
      task.finish();
    }
  }
  private select(index: number): void {
    const item = this.items[index]; if (!item || this.busy) return;
    this.selected = index; this.sourceButton.hidden = this.playButton.hidden = false; this.render();
    for (let i = 0; i < this.cards.length; i++) this.cards[i]!.setAttribute('aria-pressed', String(i === index));
    this.detail.textContent = `${item.title}\nUP主：${item.owner}${item.durationSec > 0 ? ` · 时长 ${Math.floor(item.durationSec / 60)}分${item.durationSec % 60}秒` : ''} · 播放 ${item.views.toLocaleString()}\n${item.bvid} · 可检查首 P 的游客播放数据与两轨范围请求；可选择播放首P。`;
  }
  private hideForPlayback(): void {
    this.session.invalidate(); this.modal.hidden = true; this.root.inert = false; this.focus.leaveModal(this.root);
  }
  resumeAfterPlayback(outcome?: string): void {
    if (!this.modal.hidden) return;
    this.modal.hidden = false; this.root.inert = true; this.focus.enterModal(this.modal); if (outcome) this.state.textContent = `播放已停止 · ${outcome}`; this.render(); this.focus.initial(this.selected >= 0 ? `popular-card-${this.selected}` : 'popular-reload');
  }
  async checkFirstSource(): Promise<void> {
    if (!this.items[0] || this.busy || this.modal.hidden) return;
    this.select(0); await this.checkSource();
  }
  private async checkSource(): Promise<void> {
    const item = this.items[this.selected]; if (!item || this.busy || this.modal.hidden) return;
    this.session.invalidate(); const task = this.session.begin('guest-video-source');
    this.busy = true; this.state.textContent = '正在读取详情、播放数据并检查两轨范围请求'; this.render();
    try {
      const result = await this.video.run({ version: 1, scope: task.scope, operation: 'guest-video-source', bvid: item.bvid }, task.signal);
      if (!this.session.accepts(task.scope) || this.modal.hidden) return;
      this.sourceObserved(result);
      this.state.textContent = result.code === 'ugc.source_ranges_ok' ? '播放源检查通过 · 仅验证读取与范围请求，声画待验收' : `播放源检查未通过 · ${result.code}`;
      if (result.summary) {
        const s = result.summary;
        this.detail.textContent = `${s.title}\nUP主：${s.owner} · 共 ${s.pages} P · 首 P ${s.durationSec} 秒\n${s.width}×${s.height} · ${s.videoCodec} / ${s.audioCodec} · 两轨各 512 字节校验通过`;
      }
    } catch (error) {
      if (!this.session.accepts(task.scope) || this.modal.hidden) return;
      const code = error instanceof DomainError ? `ugc.worker_${error.code}_cleanup_unconfirmed` : 'ugc.worker_unknown_cleanup_unconfirmed';
      this.state.textContent = `播放源检查未完成 · ${code}`; this.sourceObserved({ code });
    } finally { if (this.session.accepts(task.scope) && !this.modal.hidden) { this.busy = false; this.render(); } task.finish(); }
  }
  private render(): void {
    this.sourceButton.disabled = this.playButton.disabled = this.busy;
    this.playButton.dataset.up = `popular-card-${Math.max(0, this.selected)}`; this.playButton.dataset.down = 'popular-play'; this.playButton.dataset.left = 'popular-source'; this.playButton.dataset.right = 'popular-play';
    this.sourceButton.dataset.up = `popular-card-${Math.max(0, this.selected)}`; this.sourceButton.dataset.down = 'popular-source'; this.sourceButton.dataset.left = 'popular-source'; this.sourceButton.dataset.right = 'popular-play';
    this.controls[0]!.disabled = this.busy || this.page <= 1;
    this.controls[1]!.disabled = this.busy || this.noMore || this.page >= 10;
    this.controls[2]!.disabled = this.busy;
    for (let i = 0; i < this.cards.length; i++) {
      const card = this.cards[i]!, item = this.items[i]; card.hidden = !item; card.disabled = this.busy;
      card.textContent = item ? `${item.title}\n${item.owner}${item.durationSec > 0 ? ` · ${Math.floor(item.durationSec / 60)}:${String(item.durationSec % 60).padStart(2, '0')}` : ''}` : '';
      card.setAttribute('aria-pressed', String(i === this.selected));
      const self = card.dataset.focusId!;
      card.dataset.left = i % 2 ? this.cards[i - 1]!.dataset.focusId! : self;
      card.dataset.right = i % 2 === 0 && this.items[i + 1] ? this.cards[i + 1]!.dataset.focusId! : self;
      card.dataset.up = i >= 2 ? this.cards[i - 2]!.dataset.focusId! : 'popular-reload';
      card.dataset.down = this.items[i + 2] ? this.cards[i + 2]!.dataset.focusId! : this.sourceButton.hidden ? self : 'popular-source';
    }
    const enabled = this.controls.filter(button => !button.disabled);
    for (let i = 0; i < enabled.length; i++) {
      const button = enabled[i]!, self = button.dataset.focusId!;
      button.dataset.left = enabled[i - 1]?.dataset.focusId ?? self; button.dataset.right = enabled[i + 1]?.dataset.focusId ?? self;
      button.dataset.up = self; button.dataset.down = this.items.length ? 'popular-card-0' : self;
    }
    const active = document.activeElement as HTMLElement | null;
    if (active?.closest('[hidden]') || active?.matches(':disabled')) this.focus.initial(this.busy ? 'popular-close' : 'popular-reload');
  }
}
