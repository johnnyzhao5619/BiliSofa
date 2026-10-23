import { DomainError } from '../../../../packages/contracts/src/index.ts';
import { overlayDefaults, parseOverlayPreferences } from '../../../../packages/contracts/src/media-overlays.ts';
import type { OverlayAccess, OverlayDanmaku, OverlayPreferenceAccess, SubtitleTrack } from '../../../../packages/contracts/src/overlay-dto.ts';
import type { VodAccess, VodReadResult } from '../../../../packages/contracts/src/vod-runtime.ts';
import type { MediaSnapshot } from '../../../../packages/media/src/session.ts';
import { OverlayMotionClock } from '../../../../packages/media/src/overlay-clock.ts';
import { OverlaySession } from '../../../../packages/media/src/overlay-session.ts';
import { MediaOverlayView } from '../ui/media-overlays.ts';
import type { ResourceOwner } from './resource-owner.ts';
import type { TvShell } from './tv-shell.ts';
import { searchKeyword } from './search-keyword.ts';

/** Optional reads never control or close the decoder. The media page provides
 * actual snapshots; the shell remains the only keyboard/focus owner. */
export class VodOverlays {
  private readonly motion = new OverlayMotionClock();
  private readonly session = new OverlaySession(60000);
  private readonly layer = document.createElement('div');
  private readonly view: MediaOverlayView;
  private source: OverlayAccess | undefined;
  private controller = new AbortController();
  private ticket = 0;
  private catalogId = '';
  private preferences = overlayDefaults();
  private store: OverlayPreferenceAccess | undefined;
  private tracks: SubtitleTrack[] = [];
  private selected = '';
  private metadataStatus = '尚未读取字幕';
  private danmakuStatus = '尚未读取弹幕';
  private preferenceStatus = '';
  private readonly cache = new Map<number, OverlayDanmaku[]>();
  private readonly failed = new Set<number>();
  private reading = false;
  private windowSegment = 0;
  private frame = 0;
  private closure: Promise<void> = Promise.resolve();
  private unsafe = false;
  constructor(private readonly owner: ResourceOwner, private readonly shell: TvShell, controls: HTMLElement, private readonly current: () => { access?: VodAccess; catalog?: VodReadResult; media?: MediaSnapshot }) {
    this.layer.className = 'vod-overlay-plane'; Object.assign(this.layer.style, { position: 'fixed', inset: '0', zIndex: '0', pointerEvents: 'none' }); document.body.append(this.layer);
    this.view = new MediaOverlayView(document, this.layer);
    const placeSubtitles = () => this.view.reserveBottom(controls.classList.contains('vod-controls-hidden') || controls.inert ? 60 : 1080 - controls.getBoundingClientRect().top + 24);
    const visibility = new MutationObserver(placeSubtitles); visibility.observe(controls, { attributes: true, attributeFilter: ['class', 'inert'] });
    const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(placeSubtitles) : undefined;
    resize?.observe(controls); if (!resize) this.view.reserveBottom(480);
    const abort = () => { resize?.disconnect(); visibility.disconnect(); cancelAnimationFrame(this.frame); this.controller.abort(); this.session.close(); this.view.close(); this.layer.remove(); };
    owner.signal.addEventListener('abort', abort, { once: true });
    owner.add('vod-overlays', async () => { owner.signal.removeEventListener('abort', abort); abort(); await this.source?.close(); await this.closure; if (this.unsafe) throw new DomainError('unknown'); });
    const draw = () => {
      if (owner.signal.aborted) return;
      const value = this.current(), catalog = value.catalog;
      if (catalog && catalog.catalog.id !== this.catalogId) this.bind(value.access, catalog);
      const media = value.media, state = media?.seeking ? 'seeking' : media?.buffering ? 'loading' : media?.state === 'playing' || media?.state === 'paused' ? media.state : 'loading';
      const motionTime = this.motion.frame({ source: this.catalogId, timeMs: media?.timeMs ?? 0, durationMs: media?.durationMs ?? 0, playing: state === 'playing', seeking: !!media?.seeking, buffering: !!media?.buffering, rate: media?.acceptedRate ?? 1 }, performance.now());
      this.view.render(this.session.frame(media?.timeMs ?? 0, state, { width: 1920, height: 1080 }, motionTime));
      if (catalog && media && ['playing', 'paused'].includes(state)) this.ensureSegment(media.timeMs, catalog.catalog.item.durationMs);
      this.frame = requestAnimationFrame(draw);
    }; this.frame = requestAnimationFrame(draw);
  }
  private bind(access: VodAccess | undefined, catalog: VodReadResult): void {
    this.catalogId = catalog.catalog.id; const ticket = ++this.ticket;
    this.controller.abort(); this.controller = new AbortController(); const previous = this.source; this.source = undefined; this.cache.clear(); this.failed.clear(); this.reading = true; this.windowSegment = 0; this.tracks = []; this.selected = '';
    this.session.bind({ accountId: 'guest', generation: ticket, mediaSessionId: catalog.catalog.id, itemKey: `${catalog.catalog.item.bvid}:p${catalog.catalog.item.part}` });
    this.metadataStatus = '正在读取字幕轨道'; this.danmakuStatus = '正在读取弹幕';
    this.store = access?.overlayPreferences; const saved = this.store?.read();
    this.preferences = saved?.kind === 'ok' ? saved.value : overlayDefaults(); this.preferenceStatus = saved?.kind === 'ok' ? '' : `叠加偏好未读取（${saved?.kind ?? 'unavailable'}），本次使用默认设置`;
    this.session.configure(this.preferences);
    const closing = this.closure.then(() => previous?.close()); this.closure = closing.catch(() => { this.unsafe = true; });
    void closing.then(async () => {
      if (this.owner.signal.aborted || ticket !== this.ticket || this.unsafe) return;
      if (!access?.overlays) { this.metadataStatus = this.danmakuStatus = '当前播放入口尚不支持叠加读取'; return; }
      const source = access.overlays(catalog.catalog.id); this.source = source;
      this.session.bind({ accountId: source.identity, generation: ticket, mediaSessionId: catalog.catalog.id, itemKey: `${catalog.catalog.item.bvid}:p${catalog.catalog.item.part}` });
      const result = await source.read({ kind: 'metadata' }, this.controller.signal);
      if (this.owner.signal.aborted || ticket !== this.ticket) return;
      if (result.kind !== 'metadata') throw new DomainError('invalid'); this.tracks = result.tracks;
      this.metadataStatus = result.tracks.length ? `${result.tracks.length}条字幕轨道` : result.loginRequired ? '字幕需要登录后读取' : '当前内容/身份没有字幕';
      const selected = result.tracks.find(t => t.language === this.preferences.subtitles.language) ?? result.tracks[0];
      if (selected && this.preferences.subtitles.enabled) await this.selectSubtitle(selected);
    }).catch(error => { if (!this.owner.signal.aborted && ticket === this.ticket) this.metadataStatus = this.error('字幕', error); }).finally(() => { if (ticket === this.ticket) this.reading = false; });
  }
  private error(label: string, error: unknown): string { return `${label}读取失败（overlay.${error instanceof DomainError ? error.code : 'invalid'}），可手动重读，不影响播放`; }
  private ensureSegment(time: number, duration: number): void {
    if (!this.source || this.reading || this.owner.signal.aborted || !this.preferences.danmaku.enabled) return;
    const segment = Math.min(240, Math.floor(time / 360000) + 1), last = Math.min(240, Math.ceil(duration / 360000));
    if (this.windowSegment !== segment) { this.windowSegment = segment; this.applyDanmaku(segment); }
    const wanted = !this.cache.has(segment) ? segment : time % 360000 < 8000 && segment > 1 && !this.cache.has(segment - 1) ? segment - 1 : (segment * 360000 - time < 15000 && segment < last && !this.cache.has(segment + 1) ? segment + 1 : undefined);
    if (!wanted || this.failed.has(wanted)) return;
    const source = this.source, ticket = this.ticket; this.reading = true; this.danmakuStatus = '正在读取弹幕';
    void source.read({ kind: 'danmaku', segment: wanted }, this.controller.signal).then(value => {
      if (ticket !== this.ticket || this.owner.signal.aborted) return;
      if (value.kind !== 'danmaku') throw new DomainError('invalid'); this.cache.set(wanted, value.items);
      for (const key of this.cache.keys()) if (Math.abs(key - segment) > 1) this.cache.delete(key);
      this.applyDanmaku(segment); this.danmakuStatus = value.items.length ? '弹幕已就绪' : '本段没有普通弹幕';
    }).catch(error => { if (ticket === this.ticket && !this.owner.signal.aborted) { this.failed.add(wanted); this.danmakuStatus = this.error('弹幕', error); } }).finally(() => { if (ticket === this.ticket) this.reading = false; });
  }
  private applyDanmaku(segment: number): void {
    const unique = new Map<string, OverlayDanmaku>();
    for (const rows of this.cache.values()) for (const item of rows) if (item.timeMs >= (segment - 1) * 360000 - 8000 && item.timeMs < segment * 360000) unique.set(item.id, item);
    const items = [...unique.values()].sort((a, b) => a.timeMs - b.timeMs).slice(0, 20000);
    void this.session.loadDanmaku(async () => items).catch(() => {});
  }
  private async selectSubtitle(track: SubtitleTrack): Promise<void> {
    const source = this.source, ticket = this.ticket; if (!source) return;
    this.selected = track.key; this.metadataStatus = '正在读取所选字幕';
    await this.session.loadSubtitleCues(async (_binding, signal) => { const v = await source.read({ kind: 'subtitles', track }, signal); if (v.kind !== 'subtitles') throw new DomainError('invalid'); return v.cues; });
    if (this.owner.signal.aborted || ticket !== this.ticket) return;
    const result = this.session.status().subtitles;
    this.metadataStatus = result.state === 'ready' ? `字幕：${track.label}` : result.state === 'empty' ? '该轨道没有字幕正文' : `字幕读取失败（overlay.${result.code ?? 'invalid'}），可手动重读`;
  }
  private save(): void {
    this.preferences = parseOverlayPreferences(this.preferences); this.session.configure(this.preferences);
    const result = this.store?.save(this.preferences) ?? 'unavailable'; this.preferenceStatus = result === 'saved' ? '已保存当前身份的叠加设置' : `本次设置已生效，保存未确认（${result}）`;
  }
  settings(): void {
    this.shell.openModal('vod-overlay-settings', child => {
      const node = document.createElement('section'); node.className = 'vod-picker overlay-settings'; const heading = document.createElement('h2'), status = document.createElement('p'), grid = document.createElement('div'); heading.textContent = '弹幕 / 字幕 · 只读观看设置'; status.setAttribute('role', 'status'); grid.className = 'vod-grid';
      const button = (id: string, action: () => void) => { const b = document.createElement('button'); b.dataset.focusId = id; b.addEventListener('click', () => { if (!child.signal.aborted) { action(); render(); } }); return b; };
      const cycle = (current: number, choices: number[]) => choices[(choices.indexOf(current) + 1) % choices.length]!;
      const dm = button('overlay-dm', () => { this.preferences.danmaku.enabled = !this.preferences.danmaku.enabled; this.save(); });
      const size = button('overlay-size', () => { this.preferences.danmaku.fontSize = cycle(this.preferences.danmaku.fontSize, [24, 32, 40, 48, 64]); this.save(); });
      const opacity = button('overlay-opacity', () => { this.preferences.danmaku.opacity = cycle(this.preferences.danmaku.opacity, [1, .75, .5, .25]); this.save(); });
      const density = button('overlay-density', () => { this.preferences.danmaku.density = cycle(this.preferences.danmaku.density, [8, 16, 24, 48, 64]); this.save(); });
      const area = button('overlay-area', () => { this.preferences.danmaku.area = cycle(this.preferences.danmaku.area, [.25, .5, 1]); this.save(); });
      const filter = button('overlay-filter', () => this.filters());
      const subtitles = button('overlay-subtitles', () => { this.preferences.subtitles.enabled = !this.preferences.subtitles.enabled; this.save(); if (this.preferences.subtitles.enabled && this.tracks.length && this.session.status().subtitles.state !== 'ready') void this.selectSubtitle(this.tracks.find(t => t.key === this.selected) ?? this.tracks[0]!); });
      const language = button('overlay-language', () => this.languages());
      const subsize = button('overlay-subsize', () => { this.preferences.subtitles.fontSize = cycle(this.preferences.subtitles.fontSize, [28, 36, 40, 48, 60, 72]); this.save(); });
      const early = button('overlay-early', () => { this.preferences.subtitles.offsetMs = Math.max(-60000, this.preferences.subtitles.offsetMs - 500); this.save(); });
      const late = button('overlay-late', () => { this.preferences.subtitles.offsetMs = Math.min(60000, this.preferences.subtitles.offsetMs + 500); this.save(); });
      const zero = button('overlay-zero', () => { this.preferences.subtitles.offsetMs = 0; this.save(); });
      const reload = button('overlay-reload', () => { this.catalogId = ''; });
      const reset = button('overlay-reset', () => this.resetPreferences());
      const back = button('overlay-back', () => { void this.shell.back(); }); back.textContent = '返回播放';
      function renderText(b: HTMLElement, value: string) { if (b.textContent !== value) b.textContent = value; }
      const render = () => {
        if (child.signal.aborted) return; const d = this.preferences.danmaku, s = this.preferences.subtitles;
        renderText(dm, `弹幕：${d.enabled ? '开启' : '关闭'}`); dm.setAttribute('aria-pressed', String(d.enabled)); renderText(size, `弹幕字号：${d.fontSize}`); renderText(opacity, `弹幕透明度：${Math.round(d.opacity * 100)}%`); renderText(density, `同屏上限：${d.density}`); renderText(area, `弹幕区域：${d.area * 100}%`); renderText(filter, `关键词过滤：${d.filters.length}项`);
        renderText(subtitles, `字幕：${s.enabled ? '开启' : '关闭'}`); subtitles.setAttribute('aria-pressed', String(s.enabled)); renderText(language, `字幕语言：${this.tracks.find(t => t.key === this.selected)?.label ?? '无可用轨道'}`); language.disabled = !this.tracks.length; renderText(subsize, `字幕字号：${s.fontSize}`); renderText(early, '字幕提前0.5秒'); renderText(late, '字幕延后0.5秒'); renderText(zero, `字幕偏移：${s.offsetMs / 1000}秒 · 归零`); renderText(reload, '重新读取本项叠加数据'); renderText(reset, '重置当前身份叠加偏好'); renderText(status, [this.metadataStatus, this.danmakuStatus, this.preferenceStatus].filter(Boolean).join('；'));
      };
      grid.append(dm, size, opacity, density, area, filter, subtitles, language, subsize, early, late, zero, reload, reset); node.append(heading, status, back, grid); render(); const timer = setInterval(render, 300); child.add('overlay-settings-status', () => clearInterval(timer)); return node;
    }, 'overlay-back');
  }
  private languages(): void {
    this.shell.openModal('overlay-languages', child => {
      const node = document.createElement('section'); node.className = 'vod-picker'; const title = document.createElement('h2'), grid = document.createElement('div'); title.textContent = '选择字幕语言'; grid.className = 'vod-grid'; let page = 0;
      const back = document.createElement('button'), previous = document.createElement('button'), next = document.createElement('button'); back.textContent = '返回叠加设置'; back.dataset.focusId = 'overlay-language-back'; back.onclick = () => { void this.shell.back(); }; previous.textContent = '上一页'; next.textContent = '下一页'; previous.onclick = () => { page--; render(); }; next.onclick = () => { page++; render(); }; previous.dataset.focusId = 'overlay-language-prev'; next.dataset.focusId = 'overlay-language-next';
      const render = () => { if (child.signal.aborted) return; grid.replaceChildren(...this.tracks.slice(page * 4, page * 4 + 4).map(track => { const b = document.createElement('button'); b.textContent = track.label + (track.automatic ? ' · 自动生成' : ''); b.dataset.focusId = 'overlay-track-' + track.key; b.setAttribute('aria-pressed', String(track.key === this.selected)); b.onclick = () => { if (child.signal.aborted) return; this.preferences.subtitles.language = track.language; this.preferences.subtitles.enabled = true; this.save(); void this.shell.back().then(() => { if (!this.owner.signal.aborted) return this.selectSubtitle(track); }).catch(error => { if (!this.owner.signal.aborted) this.metadataStatus = this.error('字幕', error); }); }; return b; })); previous.disabled = page === 0; next.disabled = (page + 1) * 4 >= this.tracks.length; grid.querySelector<HTMLButtonElement>('button')?.focus(); }; node.append(title, grid, back, previous, next); render(); return node;
    }, 'overlay-language-back');
  }
  private filters(): void {
    this.shell.openModal('overlay-filters', child => {
      const node = document.createElement('section'); node.className = 'vod-picker'; const title = document.createElement('h2'), grid = document.createElement('div'), status = document.createElement('p'); title.textContent = '弹幕关键词过滤 · 点词删除'; grid.className = 'vod-grid'; let page = 0;
      const add = document.createElement('button'), back = document.createElement('button'), previous = document.createElement('button'), next = document.createElement('button'); add.textContent = '添加过滤词 · 首字母输入'; add.dataset.focusId = 'overlay-filter-add'; back.textContent = '返回叠加设置'; back.dataset.focusId = 'overlay-filter-back'; back.onclick = () => { void this.shell.back(); }; previous.textContent = '上一页'; next.textContent = '下一页'; previous.dataset.focusId = 'overlay-filter-prev'; next.dataset.focusId = 'overlay-filter-next'; previous.onclick = () => { page--; render(); }; next.onclick = () => { page++; render(); };
      const render = () => { if (child.signal.aborted) return; page = Math.min(page, Math.max(0, Math.ceil(this.preferences.danmaku.filters.length / 4) - 1)); grid.replaceChildren(...this.preferences.danmaku.filters.slice(page * 4, page * 4 + 4).map((word, i) => { const b = document.createElement('button'); b.textContent = word; b.dataset.focusId = 'overlay-filter-' + i; b.onclick = () => { if (child.signal.aborted) return; this.preferences.danmaku.filters = this.preferences.danmaku.filters.filter(w => w !== word); this.save(); render(); add.focus(); }; return b; })); status.textContent = `${this.preferences.danmaku.filters.length}/64项；仅过滤观看，不发送弹幕`; add.disabled = this.preferences.danmaku.filters.length >= 64; previous.disabled = page === 0; next.disabled = (page + 1) * 4 >= this.preferences.danmaku.filters.length; };
      add.onclick = () => { this.shell.openModal('overlay-filter-input', input => searchKeyword(input, this.shell, word => { if (child.signal.aborted) return; if (!this.preferences.danmaku.filters.includes(word)) this.preferences.danmaku.filters.push(word); this.save(); render(); }, '过滤词'), 'keyword-key-a'); }; node.append(title, status, grid, back, add, previous, next); render(); return node;
    }, 'overlay-filter-back');
  }
  private resetPreferences(): void {
    this.shell.openModal('overlay-reset', child => {
      const node = document.createElement('section'), title = document.createElement('h2'), yes = document.createElement('button'), no = document.createElement('button'); title.textContent = '只重置当前身份的弹幕/字幕偏好？'; yes.textContent = '确认重置叠加偏好'; no.textContent = '取消'; yes.dataset.focusId = 'overlay-reset-yes'; no.dataset.focusId = 'overlay-reset-no'; no.onclick = () => { void this.shell.back(); }; yes.onclick = () => { if (child.signal.aborted) return; const result = this.store?.clear() ?? 'unavailable'; this.preferenceStatus = result === 'deleted' ? '当前身份叠加偏好已重置' : `重置未确认（${result}）`; if (result === 'deleted') { this.preferences = overlayDefaults(); this.session.configure(this.preferences); } void this.shell.back(); }; node.append(title, no, yes); return node;
    }, 'overlay-reset-no');
  }
}
