import { parseSearchKeyword } from '../../../../packages/contracts/src/search.ts';
import { InitialsWorker } from '../platform/initials-worker.ts';
import type { ResourceOwner } from './resource-owner.ts';
/** In-page keyword entry for the one-page search (ADR-092). Choosing a local candidate
 * (or the typed letters) searches immediately; nothing is sent while letters are typed.
 * The page keeps the single focus owner; this pad has no key listener of its own. */
export function keywordPad(owner: ResourceOwner, search: (keyword: string) => void, cleared: () => void, initial = ''): { node: HTMLElement; back(): boolean; edgeIds(): string[]; firstId: string; keyword(): string; set(value: string): void } {
  const node = document.createElement('div'); node.className = 'tv-keyword-pad';
  const preview = document.createElement('p'), buffer = document.createElement('p'), state = document.createElement('p');
  preview.className = 'tv-keyword-preview'; buffer.className = 'tv-keyword-buffer'; state.className = 'tv-keyword-state'; state.setAttribute('role', 'status');
  const candidates = document.createElement('div'), tools = document.createElement('div'), keys = document.createElement('div');
  candidates.className = 'tv-keyword-candidates'; candidates.setAttribute('aria-label', '中文词语候选'); tools.className = 'tv-keyword-tools'; keys.className = 'tv-keyword-keys'; keys.setAttribute('aria-label', '字母与数字');
  const worker = new InitialsWorker(); owner.add('keyword-pad-worker', () => worker.dispose());
  let letters = '', keyword = initial, words: string[] = [], page = 0, busy = false, generation = 0;
  const button = (id: string, label: string, action: () => void) => { const b = document.createElement('button'); b.dataset.focusId = id; b.textContent = label; b.addEventListener('click', () => { if (!owner.signal.aborted) action(); }); return b; };
  const submit = () => { let value: string; try { value = parseSearchKeyword(keyword); } catch { state.textContent = '先选择关键词'; return; } search(value); };
  const choose = (word: string) => { if (Array.from(keyword + word).length > 32) { state.textContent = '关键词最多32字'; return false; } keyword += word; return true; };
  const candidateButtons = Array.from({ length: 8 }, (_, i) => button('keyword-candidate-' + i, '—', () => { const word = words[page * 8 + i]; if (!busy && letters && word && choose(word)) { letters = ''; refresh(); submit(); } }));
  candidates.append(...candidateButtons);
  const more = button('keyword-next', '更多候选', () => { if (busy || !words.length) return; page = (page + 1) * 8 < words.length ? page + 1 : 0; render(); });
  // An explicit search: typed letters are used as they are, otherwise the chosen keyword.
  const literal = button('keyword-search', '搜索', () => { if (letters) { if (!choose(letters)) return; letters = ''; refresh(); } submit(); }); literal.className = 'tv-keyword-search';
  const erase = button('keyword-delete', '退格', () => { if (letters) letters = letters.slice(0, -1); else { keyword = Array.from(keyword).slice(0, -1).join(''); if (!keyword) cleared(); } refresh(); });
  const clear = button('keyword-clear', '清空', () => { const had = !!keyword; keyword = letters = ''; refresh(); if (had) cleared(); });
  tools.append(literal, more, erase, clear);
  const keyButtons = [...'abcdefghijklmnopqrstuvwxyz0123456789'].map(letter => button('keyword-key-' + letter, letter.toUpperCase(), () => { if (letters.length < 24) { letters += letter; refresh(); } }));
  keys.append(...keyButtons);
  function wire(buttons: HTMLButtonElement[], columns: number, up: string, down: string): void {
    const nearest = (row: HTMLButtonElement[], col: number) => row.filter(b => !b.disabled).sort((a, b) => Math.abs(buttons.indexOf(a) % columns - col) - Math.abs(buttons.indexOf(b) % columns - col))[0];
    buttons.forEach((b, i) => {
      if (b.disabled) return; const start = Math.floor(i / columns) * columns, col = i % columns, row = buttons.slice(start, start + columns).filter(v => !v.disabled), at = row.indexOf(b);
      b.dataset.left = row[at - 1]?.dataset.focusId ?? 'nav-search';
      // The right edge is left to the page so it can point at the result column.
      if (row[at + 1]) b.dataset.right = row[at + 1]!.dataset.focusId; else delete b.dataset.right;
      b.dataset.up = (start > 0 ? nearest(buttons.slice(start - columns, start), col)?.dataset.focusId : undefined) ?? up;
      b.dataset.down = nearest(buttons.slice(start + columns, start + 2 * columns), col)?.dataset.focusId ?? down;
    });
  }
  function render(): void {
    preview.textContent = keyword ? '关键词：' + keyword : '输入首字母，选候选词或按“搜索”';
    buffer.textContent = letters.toUpperCase() || ' ';
    candidateButtons.forEach((b, i) => { b.textContent = words[page * 8 + i] ?? '—'; b.disabled = busy || !words[page * 8 + i]; });
    more.disabled = busy || words.length <= 8; literal.disabled = !letters && !keyword; erase.disabled = !letters && !keyword; clear.disabled = !letters && !keyword;
    const firstCandidate = candidateButtons.find(b => !b.disabled)?.dataset.focusId;
    wire(candidateButtons, 4, 'keyword-candidate-0', [literal, more, erase, clear].find(b => !b.disabled)?.dataset.focusId ?? 'keyword-key-a');
    wire([literal, more, erase, clear], 4, firstCandidate ?? 'keyword-key-a', 'keyword-key-a');
    wire(keyButtons, 6, [literal, more, erase, clear].find(b => !b.disabled)?.dataset.focusId ?? firstCandidate ?? 'keyword-key-a', 'keyword-key-a');
    // A chosen candidate disables its own button; keep focus next to it on “搜索” (the retry
    // point while results load or if they fail) rather than sending it back to A.
    const active = document.activeElement as HTMLButtonElement | null; if (active && node.contains(active) && active.disabled) (literal.disabled ? node.querySelector<HTMLElement>('[data-focus-id=keyword-key-a]') : literal)?.focus();
  }
  function refresh(): void {
    const epoch = ++generation; page = 0; words = []; busy = !!letters; render();
    if (!letters) { worker.dispose(); state.textContent = ''; return; }
    state.textContent = '正在查找候选';
    void worker.query(letters).then(value => { if (owner.signal.aborted || epoch !== generation) return; words = value; busy = false; render(); state.textContent = words.length ? '选中候选词即搜索，也可按“搜索”' : '没有候选，可按“搜索”直接用字母搜索'; })
      .catch(() => { if (owner.signal.aborted || epoch !== generation) return; busy = false; render(); state.textContent = '候选暂时无法读取，可按“搜索”直接用字母搜索'; });
  }
  node.append(preview, buffer, candidates, tools, keys, state); refresh();
  owner.add('keyword-pad-buffer', () => { worker.dispose(); words = []; letters = ''; });
  return {
    node, firstId: 'keyword-key-a', keyword: () => keyword,
    set(value: string) { keyword = value; letters = ''; refresh(); },
    // Back clears typed letters first, then the keyword; only then may the page leave.
    back() { if (letters) { letters = ''; refresh(); return true; } if (keyword) { keyword = ''; refresh(); cleared(); return true; } return false; },
    edgeIds: () => [...candidateButtons.filter((_, i) => i % 4 === 3), clear, ...keyButtons.filter((_, i) => i % 6 === 5)].filter(b => !b.disabled).map(b => b.dataset.focusId!),
  };
}
