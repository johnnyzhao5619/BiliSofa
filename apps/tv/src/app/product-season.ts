import { DomainError, type MediaSource } from '../../../../packages/contracts/src/index.ts';
import type { PgcSeason, PgcEpisode } from '../../../../packages/contracts/src/pgc-season.ts';
import type { PgcAccess } from '../../../../packages/contracts/src/vod-runtime.ts';
import type { VodCapabilities } from '../../../../packages/contracts/src/vod-catalog.ts';
import type { ProfileStore } from '../../../../packages/contracts/src/local-profile.ts';
import type { OwnedPlayerBackend } from '../../../../packages/media/src/session.ts';
import type { ResourceOwner } from './resource-owner.ts';
import type { TvShell } from './tv-shell.ts';
import type { AppDiagnostics } from './app-diagnostics.ts';
import type { FollowIssue, PgcFollows } from './pgc-follows.ts';
import { vodWorkspace } from './vod-workspace.ts';
import { productButton } from './product-frame.ts';
import { openFullText, needsFullText } from './full-text.ts';
import { CoverArt } from '../platform/cover-art.ts';
import { SEASON_STATUS_READ } from './season-policy.ts';

const RESTRICTION = { none: '', member: '会员', purchase: '付费', region: '地区限制', unavailable: '暂不可播放', drm: 'DRM暂不支持', unknown: '' } as const;
/** Viewer-facing reason for a follow state that could not be confirmed (ADR-096). */
export function followIssueText(issue: FollowIssue | undefined): string {
  switch (issue) {
    case 'login': return '登录已失效，请在“我的 → 账号”重新扫码';
    case 'network': return '网络异常，追番状态未确认，可稍后再查';
    case 'journal': return '本机写操作记录无法更新，已暂停追番提交；可在设置的帮助与诊断中查看';
    case 'unauthenticated': return 'B站没有返回本人追番状态，可能需要重新登录';
    case 'rejected': return 'B站拒绝了这次操作，未重复提交';
    case 'unresolved': return '上次提交的结果仍未确认，请重新打开应用后再查';
    case 'cancelled': return '';
    default: return '追番状态读取失败，可稍后再查';
  }
}

/** Product season page (ADR-096): artwork, status and a clamped description; one primary play
 * action; a one-press 追番 toggle with the F11 contract (single submit, read-back, unknown only
 * queries); group tabs and one horizontal episode row. Rights are re-checked at playback. */
export function productSeason(owner: ResourceOwner, shell: TvShell, profile: ProfileStore, diagnostics: AppDiagnostics, feedback: HTMLElement,
  caps: VodCapabilities, open: () => Promise<PgcAccess>, backend: (source: MediaSource) => OwnedPlayerBackend | undefined, follows?: PgcFollows): HTMLElement {
  const panel = document.createElement('section'); panel.className = 'tv-detail tv-detail-page tv-season-page';
  const header = document.createElement('div'), picture = document.createElement('div'), summary = document.createElement('div');
  header.className = 'tv-detail-header'; picture.className = 'tv-detail-picture'; picture.textContent = 'BiliSofa';
  const title = document.createElement('h2'), meta = document.createElement('p'), description = document.createElement('p'), status = document.createElement('p');
  title.textContent = '番剧详情'; meta.className = 'tv-detail-meta'; description.className = 'tv-detail-desc'; status.className = 'tv-secondary'; status.setAttribute('role', 'status');
  summary.append(title, meta, description); header.append(picture, summary);
  const actions = document.createElement('div'), groups = document.createElement('div'), row = document.createElement('div');
  actions.className = 'tv-detail-actions'; groups.className = 'tv-filters tv-season-groups'; groups.setAttribute('role', 'group'); groups.setAttribute('aria-label', '分组');
  row.className = 'tv-detail-parts tv-season-episodes'; row.setAttribute('aria-label', '剧集');
  const art = new CoverArt(); owner.add('season-art', () => art.close());
  let season: PgcSeason | undefined, active: PgcAccess | undefined, pending: Promise<void> | undefined, groupIndex = 0, following = false, busyText = '正在提交…';
  const play = productButton('season-play', '播放', () => { const first = firstPlayable(); if (first) watch(first); });
  play.className = 'tv-primary';
  const follow = productButton('season-follow', '追番', () => { void toggle(); }); follow.hidden = !follows;
  const full = productButton('season-description', '简介全文', () => { if (season) openFullText(shell, 'season-description', '简介', season.description); }); full.hidden = true;
  const retry = productButton('season-retry', '重新读取', () => { void read(); }); retry.hidden = true;
  actions.append(play, follow, full, retry);
  function watch(e: PgcEpisode): void {
    if (!e.item || owner.signal.aborted) return;
    shell.openModal('pgc-playback', child => vodWorkspace(child, shell, feedback, { bvid: e.item!.bvid, part: 1 }, profile, diagnostics, caps, open, backend, undefined, true), 'vod-back');
  }
  function episodes(): PgcEpisode[] { if (!season) return []; const byKey = new Map(season.episodes.map(e => [e.key, e])); return (season.groups[groupIndex]?.episodes ?? []).map(k => byKey.get(k)!).filter(Boolean); }
  const firstPlayable = () => episodes().find(e => e.item);
  function followLabel(): void {
    if (!season || !follows) return;
    follow.textContent = following ? busyText : season.followed === 'yes' ? '已追番 ✓' : season.followed === 'no' ? '追番' : '查询追番状态';
    follow.setAttribute('aria-pressed', String(season.followed === 'yes')); follow.disabled = following;
  }
  async function refreshFollow(): Promise<void> {
    const current = season; if (!current || !follows || following) return;
    following = true; busyText = '正在读取追番状态…'; followLabel(); let result: 'yes' | 'no' | 'unknown' = 'unknown';
    try { result = await follows.state(current.seasonId); } catch { result = 'unknown'; }
    if (owner.signal.aborted || season !== current) return;
    current.followed = result; following = false; followLabel(); if (result === 'unknown') status.textContent = followIssueText(follows.issue());
  }
  async function toggle(): Promise<void> {
    if (!season || !follows || following || owner.signal.aborted) return;
    const current = season, wanted = current.followed === 'no' ? true : current.followed === 'yes' ? false : undefined;
    following = true; busyText = wanted === undefined ? '正在读取追番状态…' : '正在提交…'; followLabel(); status.textContent = '';
    let result: 'yes' | 'no' | 'unknown' = 'unknown';
    // One press is one explicit request: unknown never resubmits, it only reads the actual state.
    try { result = wanted === undefined ? await follows.state(current.seasonId) : await follows.set(current.seasonId, wanted, true); } catch { result = 'unknown'; }
    if (owner.signal.aborted || season !== current) return;
    const issue = result === 'unknown' ? follows.issue() : undefined, write = wanted === undefined ? undefined : follows.lastWrite();
    const desired = wanted === undefined ? undefined : wanted ? 'yes' : 'no', verb = wanted ? '追番' : '取消追番';
    // The read-back decides. A mismatch after an accepted write is not a result: the next press only queries.
    const mismatch = desired !== undefined && result !== 'unknown' && result !== desired;
    current.followed = mismatch && write?.ack === 'accepted' ? 'unknown' : result; following = false; followLabel();
    status.textContent = result === 'unknown' ? followIssueText(issue)
      : mismatch ? write?.ack === 'rejected' ? `B站拒绝了这次${verb}${write.apiCode === undefined ? '' : `（代码 ${write.apiCode}）`}，未重复提交` : `B站已受理${verb}，但回读的状态仍为${result === 'yes' ? '已追番' : '未追番'}；稍后按一次查询`
      : desired === undefined ? '' : desired === 'yes' ? '已追番' : '已取消追番';
    diagnostics.add('pgc', result === 'unknown' ? issue === 'journal' ? 'follow_journal_unwritable' : issue === 'unauthenticated' ? 'follow_unauthenticated' : wanted === undefined ? 'follow_read_failed' : 'follow_write_failed' : mismatch ? write?.ack === 'rejected' ? 'follow_write_rejected' : 'follow_readback_mismatch' : 'follow_confirmed');
  }
  function render(): void {
    if (!season || owner.signal.aborted) return;
    title.textContent = season.title; meta.textContent = season.status; meta.hidden = !season.status;
    description.textContent = season.description; description.hidden = !season.description; full.hidden = !needsFullText(season.description);
    groupIndex = Math.max(0, Math.min(groupIndex, season.groups.length - 1));
    const tabs = season.groups.length > 1 ? season.groups.map((g, i) => { const b = productButton(`season-group-${i}`, g.title, () => { groupIndex = i; render(); row.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus(); }); b.setAttribute('aria-pressed', String(i === groupIndex)); return b; }) : [];
    groups.replaceChildren(...tabs); groups.hidden = !tabs.length;
    const list = episodes().slice(0, 500), buttons = list.map((e, i) => { const tag = RESTRICTION[e.restriction]; const b = productButton(`season-episode-${i}`, `${e.title}${e.badge ? ' · ' + e.badge : ''}${tag ? ' · ' + tag : ''}`, () => watch(e)); b.disabled = !e.item; return b; });
    row.replaceChildren(...buttons);
    const first = firstPlayable(); play.disabled = !first; play.textContent = first ? `播放 · ${first.title}` : '当前分组暂无可播放剧集';
    followLabel();
    // Rows: actions → group tabs → episodes. Each row moves left/right within itself.
    const top = [...actions.querySelectorAll<HTMLButtonElement>('button')].filter(b => !b.hidden), enabled = buttons.filter(b => !b.disabled);
    const below = (tabs[groupIndex] ?? enabled[0])?.dataset.focusId;
    top.forEach((b, i) => { b.dataset.left = top[i - 1]?.dataset.focusId ?? b.dataset.focusId; b.dataset.right = top[i + 1]?.dataset.focusId ?? b.dataset.focusId; b.dataset.up = b.dataset.focusId; b.dataset.down = below ?? b.dataset.focusId; });
    tabs.forEach((b, i) => { b.dataset.left = tabs[i - 1]?.dataset.focusId ?? b.dataset.focusId; b.dataset.right = tabs[i + 1]?.dataset.focusId ?? b.dataset.focusId; b.dataset.up = play.dataset.focusId; b.dataset.down = enabled[0]?.dataset.focusId ?? b.dataset.focusId; });
    buttons.forEach((b, i) => { b.dataset.left = buttons[i - 1]?.dataset.focusId ?? b.dataset.focusId; b.dataset.right = buttons[i + 1]?.dataset.focusId ?? b.dataset.focusId; b.dataset.up = tabs[groupIndex]?.dataset.focusId ?? play.dataset.focusId; b.dataset.down = b.dataset.focusId; });
  }
  async function read(): Promise<void> {
    if (pending || owner.signal.aborted) return;
    retry.hidden = true; status.textContent = '正在读取';
    const work = (async () => { active = await open(); if (owner.signal.aborted) return; const result = await active.season(owner.signal); if (owner.signal.aborted) return; await active.close(); active = undefined; season = result; })();
    pending = work;
    try {
      await work; if (owner.signal.aborted || !season) return; status.textContent = ''; render();
      // The season view may carry a cached follow flag; ask the per-user status once (0.49.1).
      if (follows && SEASON_STATUS_READ) void refreshFollow();
      if (season.cover) void art.load(season.cover).then(url => { if (!url || owner.signal.aborted) return; const image = document.createElement('img'); image.alt = ''; image.src = url; picture.replaceChildren(image); });
      const focused = document.activeElement as HTMLElement | null; if (!focused || focused === document.body || panel.contains(focused)) (play.disabled ? row.querySelector<HTMLButtonElement>('button:not(:disabled)') ?? follow : play).focus();
    } catch (error) {
      if (owner.signal.aborted) return;
      status.textContent = error instanceof DomainError && error.code === 'login' ? '登录已失效，请在“我的 → 账号”重新扫码' : '番剧详情暂时无法读取'; status.title = error instanceof DomainError ? error.code : 'invalid';
      retry.hidden = false; retry.focus();
    } finally { pending = undefined; }
  }
  owner.add('season-source', async () => { try { await pending; } catch { /* shown above */ } await active?.close(); });
  panel.dataset.initialFocusId = 'season-play';
  panel.append(header, actions, status, groups, row);
  void read(); return panel;
}
