import { DomainError, type MediaSource } from '../../../../packages/contracts/src/index.ts';
import type { PgcSeason, PgcEpisode } from '../../../../packages/contracts/src/pgc-season.ts';
import type { PgcAccess } from '../../../../packages/contracts/src/vod-runtime.ts';
import type { VodCapabilities } from '../../../../packages/contracts/src/vod-catalog.ts';
import type { ProfileStore } from '../../../../packages/contracts/src/local-profile.ts';
import type { OwnedPlayerBackend } from '../../../../packages/media/src/session.ts';
import type { ResourceOwner } from './resource-owner.ts';
import type { TvShell } from './tv-shell.ts';
import type { AppDiagnostics } from './app-diagnostics.ts';
import { vodWorkspace } from './vod-workspace.ts';
import type {PgcFollows} from './pgc-follows.ts';
import {pgcFollowAction} from './pgc-follow-action.ts';
/** Native season/episode browsing; real rights are checked again in the private
 * source Worker at playback, rather than trusting a search or old detail card. */
export function pgcSeasonWorkspace(owner: ResourceOwner, shell: TvShell, profile: ProfileStore, diagnostics: AppDiagnostics,
  feedback: HTMLElement, caps: VodCapabilities, open: () => Promise<PgcAccess>, backend: (source: MediaSource) => OwnedPlayerBackend | undefined, followAccess?:(owner:ResourceOwner)=>PgcFollows, returnLabel='返回番剧搜索结果'): HTMLElement {
  const panel = document.createElement('section'); panel.className = 'pgc-season-panel';
  const title = document.createElement('h2'), description = document.createElement('p'), status = document.createElement('p'), followed = document.createElement('p'), group = document.createElement('p'), grid = document.createElement('div');
  title.textContent = '番剧 / 影视详情'; grid.className = 'pgc-episode-grid'; status.setAttribute('role', 'status');
  let season: PgcSeason | undefined, active: PgcAccess | undefined, pending: Promise<void> | undefined, busy = false, groupIndex = 0, page = 0;
  const button = (id: string, text: string, action: () => void) => { const b = document.createElement('button'); b.dataset.focusId = id; b.textContent = text; b.addEventListener('click', () => { if (!owner.signal.aborted) action(); }); return b; };
  const back = button('pgc-season-back', returnLabel, () => { void shell.back(); });
  const refresh = button('pgc-season-refresh', '刷新详情 · 只读', () => { void read(); });
  const follow=button('pgc-season-follow','管理追番状态',()=>{if(!season||busy||!followAccess)return;const current=season;shell.openModal('pgc-follow-confirm',child=>pgcFollowAction(child,shell,current,followAccess(child),value=>{if(owner.signal.aborted)return;current.followed=value;followed.textContent=value==='yes'?'当前账号：已追番':value==='no'?'当前账号：未追番':'追番状态：未确认';}),'pgc-follow-back');});follow.hidden=!followAccess;follow.disabled=true;
  const previousGroup = button('pgc-group-prev', '上一分组', () => { groupIndex--; page = 0; render(); });
  const nextGroup = button('pgc-group-next', '下一分组', () => { groupIndex++; page = 0; render(); });
  const previous = button('pgc-episodes-prev', '上一页', () => { page--; render(); });
  const next = button('pgc-episodes-next', '下一页', () => { page++; render(); });
  function episodeLabel(e: PgcEpisode): string {
    const restriction = { none: '', member: '会员内容', purchase: '付费内容', region: '地区限制', unavailable: '暂不可播放', drm: 'DRM暂不支持', unknown: '权益以播放源为准' }[e.restriction];
    return `${e.title}${e.badge ? ` · ${e.badge}` : ''}${restriction ? ` · ${restriction}` : ''}`;
  }
  function render(): void {
    if (owner.signal.aborted) return;
    grid.replaceChildren(); refresh.disabled = busy; follow.disabled=busy||!season; previous.disabled = next.disabled = previousGroup.disabled = nextGroup.disabled = true;
    if (!season || busy) return;
    title.textContent = season.title; description.textContent = season.description.slice(0, 500);
    followed.textContent = season.followed === 'yes' ? '当前账号：已追番' : season.followed === 'no' ? '当前账号：未追番' : '追番状态：未读取到本人状态';
    groupIndex = Math.max(0, Math.min(groupIndex, season.groups.length - 1)); const section = season.groups[groupIndex]!;
    page = Math.max(0, Math.min(page, Math.max(0, Math.ceil(section.episodes.length / 4) - 1)));
    group.textContent = `${section.title} · ${groupIndex + 1}/${season.groups.length} 组 · ${section.episodes.length} 项 · 第${page + 1}页`;
    status.textContent = season.status || (section.episodes.length ? '选择允许观看的剧集；播放前会重新核对权益' : '当前分组暂无内容');
    const byKey = new Map(season.episodes.map(e => [e.key, e]));
    section.episodes.slice(page * 4, page * 4 + 4).forEach((key, i) => {
      const e = byKey.get(key)!;
      const b = button(`pgc-episode-${i}`, episodeLabel(e), () => {
        if (busy || !e.item) return;
        shell.openModal('pgc-playback', child => vodWorkspace(child, shell, feedback, { bvid: e.item!.bvid, part: 1 }, profile, diagnostics, caps, open, backend, undefined, true), 'vod-back');
      });
      b.disabled = !e.item; b.dataset.left = `pgc-episode-${i % 2 ? i - 1 : i}`; b.dataset.right = `pgc-episode-${i % 2 === 0 && i + 1 < Math.min(4, section.episodes.length - page * 4) ? i + 1 : i}`;
      b.dataset.up = i < 2 ? 'pgc-season-refresh' : `pgc-episode-${i - 2}`; b.dataset.down = i < 2 && i + 2 < Math.min(4, section.episodes.length - page * 4) ? `pgc-episode-${i + 2}` : (page + 1) * 4 < section.episodes.length ? 'pgc-episodes-next' : 'pgc-season-back';
      grid.append(b);
    });
    previous.disabled = page === 0; next.disabled = (page + 1) * 4 >= section.episodes.length;
    previousGroup.disabled = groupIndex === 0; nextGroup.disabled = groupIndex + 1 >= season.groups.length;
    if (panel.isConnected) (grid.querySelector<HTMLButtonElement>('button:not(:disabled)') ?? back).focus();
  }
  async function read(): Promise<void> {
    if (busy || owner.signal.aborted) return;
    busy = true; season = undefined; status.textContent = '正在读取季详情、分组和剧集'; render();
    const work = (async () => {
      active = await open(); if (owner.signal.aborted) return;
      const result = await active.season(owner.signal); if (owner.signal.aborted) return;
      await active.close(); season = result;
    })(); pending = work;
    try { await work; }
    catch (error) { if (!owner.signal.aborted) status.textContent = error instanceof DomainError && error.code === 'login' ? '账号失效，请返回管理账号' : `番剧详情读取失败（pgc.${error instanceof DomainError ? error.code : 'unknown'}），可返回或手动刷新`; }
    finally { busy = false; if (!owner.signal.aborted) render(); }
  }
  owner.add('pgc-season-source', async () => {
    try { await pending; } catch { /* The read's terminal failure is displayed separately. */ }
    await active?.close();
  });
  panel.append(title, description, followed, back, refresh, follow, group, previousGroup, nextGroup, status, grid, previous, next);
  void read(); return panel;
}
