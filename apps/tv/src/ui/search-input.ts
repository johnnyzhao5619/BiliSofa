import { InitialsWorker } from '../platform/initials-worker.ts';
import { FocusRouter } from './focus.ts';
// F03 keyword selection only. No comment/danmaku editor, persistence or account write.
export class SearchInput {
  private readonly worker = new InitialsWorker();
  private letters = '';
  private keyword = '';
  private words: string[] = [];
  private page = 0;
  private generation = 0;
  private busy = false;
  private readonly preview: HTMLElement;
  private readonly buffer: HTMLElement;
  private readonly state: HTMLElement;
  private readonly candidates: HTMLButtonElement[] = [];
  constructor(private readonly modal: HTMLElement, private readonly root: HTMLElement, private readonly focus: FocusRouter, private readonly accepted: (keyword: string) => void) {
    this.preview = modal.querySelector('#search-preview')!; this.buffer = modal.querySelector('#search-buffer')!; this.state = modal.querySelector('#search-state')!;
    const keys = modal.querySelector('#search-keys')!;
    for (const letter of 'abcdefghijklmnopqrstuvwxyz0123456789') {
      const button = document.createElement('button'); button.textContent = letter.toUpperCase(); button.dataset.focusId = `search-key-${letter}`; button.dataset.letter = letter;
      button.addEventListener('click', () => this.append(letter)); keys.append(button);
    }
    const list = modal.querySelector('#search-candidates')!;
    for (let i = 0; i < 8; i++) {
      const button = document.createElement('button'); button.dataset.focusId = `search-candidate-${i}`;
      button.addEventListener('click', () => {
        const word = this.words[this.page * 8 + i];
        if (this.busy || !word || !this.letters || !this.appendKeyword(word)) return;
        this.letters = ''; this.refresh(); this.focus.initial('search-key-a');
      });
      this.candidates.push(button); list.append(button);
    }
    this.on('search-clear', () => { this.keyword = ''; this.letters = ''; this.refresh(); });
    this.on('search-delete', () => this.remove());
    this.on('search-literal', () => { if (this.letters && this.appendKeyword(this.letters)) { this.letters = ''; this.refresh(); } });
    this.on('search-prev', () => this.changePage(-1)); this.on('search-next', () => this.changePage(1));
    this.on('search-retry', () => this.refresh()); this.on('search-cancel', () => this.close());
    this.on('search-done', () => {
      if (this.letters) { this.state.textContent = '先选择中文候选，或使用字母/数字'; return; }
      if (!this.keyword) { this.state.textContent = '先选择关键词'; return; }
      const keyword = this.keyword; this.close(); this.accepted(keyword);
    });
  }
  private on(id: string, callback: () => void): void { this.modal.querySelector(`#${id}`)!.addEventListener('click', callback); }
  get open(): boolean { return !this.modal.hidden; }
  show(): void {
    if (this.open) return;
    this.keyword = ''; this.letters = ''; this.modal.hidden = false; this.root.inert = true;
    this.focus.enterModal(this.modal); this.refresh(); this.focus.initial('search-key-a');
  }
  close(): void {
    if (!this.open) return;
    this.generation++; this.worker.dispose(); this.letters = ''; this.keyword = ''; this.words = []; this.busy = false;
    this.preview.textContent = ''; this.buffer.textContent = ''; this.state.textContent = '';
    for (const button of this.candidates) { button.textContent = ''; button.disabled = true; }
    this.modal.hidden = true; this.root.inert = false; this.focus.leaveModal(this.root);
  }
  back(): boolean {
    if (!this.open) return false;
    if (this.letters) { this.letters = ''; this.refresh(); } else this.close();
    return true;
  }
  key(event: KeyboardEvent): boolean {
    if (!this.open) return false;
    if (/^[a-z0-9]$/i.test(event.key)) { if (!event.repeat) this.append(event.key.toLowerCase()); return true; }
    if (event.key === 'Backspace') { if (!event.repeat) this.remove(); return true; }
    return false;
  }
  private append(letter: string): void { if (this.letters.length < 24) { this.letters += letter; this.refresh(); } }
  private appendKeyword(word: string): boolean {
    if (Array.from(this.keyword + word).length > 32) { this.state.textContent = '关键词最多32字'; return false; }
    this.keyword += word; return true;
  }
  private remove(): void {
    if (this.letters) this.letters = this.letters.slice(0, -1);
    else this.keyword = Array.from(this.keyword).slice(0, -1).join('');
    this.refresh();
  }
  private refresh(): void {
    const generation = ++this.generation; this.page = 0; this.words = []; this.busy = false;
    this.preview.textContent = this.keyword || '尚未选择关键词'; this.buffer.textContent = this.letters.toUpperCase() || '输入词语首字母，例如 NH → 你好';
    this.render();
    if (!this.letters) { this.worker.dispose(); this.state.textContent = '候选来自本地词库；此探针不发起B站内容搜索'; return; }
    this.busy = true; this.state.textContent = '正在查找本地候选';
    void this.worker.query(this.letters).then(words => {
      if (!this.open || generation !== this.generation) return;
      this.words = words; this.busy = false; this.render();
      this.state.textContent = words.length ? `本地词语候选 · 第1/${Math.ceil(words.length / 8)}页` : '无词语候选；可使用字母/数字，或清空后重输';
    }).catch(() => {
      if (!this.open || generation !== this.generation) return;
      this.busy = false; this.state.textContent = '本地候选加载失败，可重试或返回'; this.render();
    });
  }
  private changePage(delta: number): void {
    const page = this.page + delta;
    if (this.busy || page < 0 || page * 8 >= this.words.length) return;
    this.page = page; this.render(false); this.state.textContent = `本地词语候选 · 第${page + 1}/${Math.ceil(this.words.length / 8)}页`;
    this.focus.initial('search-candidate-0');
  }
  // Logical grid neighbours take priority over the shell's geometric fallback.
  // Wide candidate cards must not lose Left/Right to narrower controls below them.
  private wireGrid(buttons: HTMLButtonElement[], columns: number, up?: string, down?: string): void {
    const enabled = (button: HTMLButtonElement) => !button.disabled;
    const nearest = (row: HTMLButtonElement[], column: number): HTMLButtonElement | undefined => row.filter(enabled).sort((a, b) =>
      Math.abs(buttons.indexOf(a) % columns - column) - Math.abs(buttons.indexOf(b) % columns - column))[0];
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i]!;
      if (!enabled(button)) continue;
      const start = Math.floor(i / columns) * columns, column = i % columns;
      const row = buttons.slice(start, start + columns).filter(enabled), at = row.indexOf(button);
      const self = button.dataset.focusId!;
      button.dataset.left = row[at - 1]?.dataset.focusId ?? self;
      button.dataset.right = row[at + 1]?.dataset.focusId ?? self;
      button.dataset.up = (start > 0 ? nearest(buttons.slice(start - columns, start), column)?.dataset.focusId : undefined) ?? up ?? self;
      button.dataset.down = nearest(buttons.slice(start + columns, start + columns * 2), column)?.dataset.focusId ?? down ?? self;
    }
  }
  private wireNavigation(): void {
    const button = (id: string) => this.modal.querySelector<HTMLButtonElement>(`#${id}`)!;
    this.wireGrid(this.candidates, 4, undefined, 'search-literal');
    const tools = ['search-prev', 'search-next', 'search-literal', 'search-delete', 'search-clear'].map(button);
    this.wireGrid(tools, 5, this.candidates.find(item => !item.disabled)?.dataset.focusId ?? 'search-key-a', 'search-key-a');
    this.wireGrid([...this.modal.querySelectorAll<HTMLButtonElement>('#search-keys button')], 10, 'search-literal', 'search-done');
    this.wireGrid(['search-done', 'search-retry', 'search-cancel'].map(button), 3, 'search-key-4');
  }
  private render(restoreDisabledFocus = true): void {
    for (let i = 0; i < this.candidates.length; i++) {
      const button = this.candidates[i]!, word = this.words[this.page * 8 + i];
      button.textContent = word ?? '—'; button.disabled = !word || this.busy;
    }
    (this.modal.querySelector('#search-prev') as HTMLButtonElement).disabled = this.page === 0 || this.busy;
    (this.modal.querySelector('#search-next') as HTMLButtonElement).disabled = (this.page + 1) * 8 >= this.words.length || this.busy;
    this.wireNavigation();
    const active = document.activeElement as HTMLButtonElement | null;
    if (restoreDisabledFocus && active && this.modal.contains(active) && active.disabled) this.focus.initial('search-key-a');
  }
}
