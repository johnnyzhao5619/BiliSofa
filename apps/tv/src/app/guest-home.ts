import {LIVE_IN_CURRENT_DELIVERY} from '../../../../packages/contracts/src/product-scope.ts';
import {pgcSeasonWorkspace} from './pgc-season.ts';
import type {PgcFollows} from './pgc-follows.ts';
import type {QueueStore} from '../../../../packages/contracts/src/local-queue.ts';
import {queueWriteMessage} from './local-queue.ts';
import { categoryLabel, type CategoryId } from '../../../../packages/contracts/src/categories.ts';
import { categoryPicker } from './category-picker.ts';
import { DomainError, type PopularCard } from '../../../../packages/contracts/src/index.ts';
import { MediaSession } from '../../../../packages/media/src/session.ts';
import { PublicContentRuntime } from '../platform/content-runtime.ts';
import { GuestPlayback } from '../platform/guest-playback.ts';
import { createGuestProbePlayer } from '../platform/samsung.ts';
import type { ProfileStore } from '../../../../packages/contracts/src/local-profile.ts';
import type { AppDiagnostics } from './app-diagnostics.ts';
import { LocalPlayback } from './local-playback.ts';
import type { ResourceOwner } from './resource-owner.ts';
import type { TvShell } from './tv-shell.ts';
import { mediaFailureFeedback } from './media-failure-feedback.ts';
import { historyPanel } from './search-history.ts';
import { hotSearch } from './hot-search.ts';
import { userSearch } from './user-search.ts';
import { pgcSearch } from './pgc-search.ts';
import { liveSearch } from './live-search.ts';
import type {LiveSearchCard} from '../../../../packages/contracts/src/live-search.ts';
import type { SearchHistoryStore } from '../../../../packages/contracts/src/search-history.ts';
import { searchKeyword } from './search-keyword.ts';
import { SearchReadError } from '../../../../packages/contracts/src/search.ts';
import { ContentApiError, PopularReadError, type ContentQuery } from '../../../../packages/contracts/src/content.ts';
import type { VodCapabilities } from '../../../../packages/contracts/src/vod-catalog.ts';
import type { VodAccess, PgcAccess } from '../../../../packages/contracts/src/vod-runtime.ts';
import { vodWorkspace } from './vod-workspace.ts';
function button(id: string, label: string, action: () => void): HTMLButtonElement {
  const node = document.createElement('button'); node.dataset.focusId = id; node.textContent = label; node.addEventListener('click', action); return node;
}
/** Anonymous public content stays anonymous even when an account is selected. */
export function guestHome(owner: ResourceOwner, shell: TvShell, feedback: HTMLElement, profile: ProfileStore, diagnostics: AppDiagnostics, history:SearchHistoryStore,queue?:QueueStore,vod?:{caps:VodCapabilities;open():Promise<VodAccess>;openPgc?(seasonId:string):Promise<PgcAccess>;follows?:(owner:ResourceOwner)=>PgcFollows;playLive?:(card:LiveSearchCard)=>void},mediaUnavailable:boolean|string=false): HTMLElement {
  const section = document.createElement('section'), heading = document.createElement('h2'); heading.textContent = '游客热门';
  const status = document.createElement('p'); status.setAttribute('role', 'status'); status.tabIndex = -1;
  const list = document.createElement('div'); list.className = 'popular-grid';
  const content = new PublicContentRuntime();
  owner.add('content-runtime', async () => { if (!(await content.close()).closed) throw new DomainError('unknown'); });
  let page = 1, busy = false, route: ContentQuery['route'] = 'popular', keyword='',failedSearchPage:number|undefined;
  let categoryId:CategoryId|undefined;
  const isRanking=()=>route==='ranking'||route==='category';
  const routeButton=()=>route==='category'?categories:route==='ranking'?ranking:route==='search'?search:load;
  const categories=button('category-open','选择排行分区',()=>{shell.openModal('category-picker',modalOwner=>categoryPicker(modalOwner,shell,categoryId,value=>{if(owner.signal.aborted)return;categoryId=value;void request(1,'category',true);}),categoryId?`category-${categoryId}`:'category-1005');});
  const refreshRanking=button('ranking-refresh','刷新当前排行',()=>{if(isRanking())void request(1,route,true);});refreshRanking.hidden=true;
  const load = button('popular-load', '读取游客热门', () => { void request(1,'popular'); });
  const ranking = button('ranking-load', '读取全站排行榜', () => { void request(1,'ranking',true); });
  const search = button('video-search', '搜索视频 · 首字母输入', () => {
    shell.openModal('search-keyword', modalOwner=>searchKeyword(modalOwner,shell,value=>{if(owner.signal.aborted)return;keyword=value;void request(1,'search');}),'keyword-key-a');
  });
  const historyButton=button('search-history','搜索历史',()=>{shell.openModal('search-history',modalOwner=>historyPanel(modalOwner,shell,history,value=>{if(owner.signal.aborted)return;keyword=value;void request(1,'search');}));});
  const hotButton=button('search-hot','热搜',()=>{shell.openModal('search-hot',modalOwner=>hotSearch(modalOwner,shell,value=>{if(owner.signal.aborted)return;keyword=value;void request(1,'search');}));});
  const userButton=button('user-search','搜索UP主',()=>{shell.openModal('user-keyword',inputOwner=>searchKeyword(inputOwner,shell,value=>{if(owner.signal.aborted)return;shell.openModal('user-search',resultsOwner=>userSearch(resultsOwner,shell,value,history,diagnostics,feedback,play));},'UP主'),'keyword-key-a');});
  const pgcButton=button('pgc-search','搜索番剧',()=>{shell.openModal('pgc-keyword',inputOwner=>searchKeyword(inputOwner,shell,value=>{if(owner.signal.aborted)return;shell.openModal('pgc-search',resultsOwner=>pgcSearch(resultsOwner,shell,value,history,diagnostics,feedback,vod?.openPgc?card=>shell.openModal('pgc-season',seasonOwner=>pgcSeasonWorkspace(seasonOwner,shell,profile,diagnostics,feedback,vod.caps,()=>vod.openPgc!(card.seasonId),source=>createGuestProbePlayer(source.url),vod.follows),'pgc-season-back'):undefined));},'番剧'),'keyword-key-a');});
  const liveButton=button('live-search','搜索直播',()=>{if(!LIVE_IN_CURRENT_DELIVERY||owner.signal.aborted)return;shell.openModal('live-keyword',inputOwner=>searchKeyword(inputOwner,shell,value=>{if(owner.signal.aborted)return;shell.openModal('live-search',resultsOwner=>liveSearch(resultsOwner,shell,value,history,diagnostics,feedback,vod?.playLive));},'直播'),'keyword-key-a');});
  const retrySearch=button('search-retry-current','重试当前搜索',()=>{if(failedSearchPage!==undefined)void request(failedSearchPage,'search');});retrySearch.hidden=true;
  const previous = button('popular-previous', '上一页', () => { void request(page - 1,route); }); previous.disabled = true;
  const next = button('popular-next', '下一页', () => { void request(page + 1,route); }); next.disabled = true;
  async function request(target: number, selected: ContentQuery['route'], refresh = false): Promise<void> {
    if (busy || owner.signal.aborted) return;
    busy = true; route=selected;failedSearchPage=undefined;retrySearch.hidden=true;retrySearch.disabled=true; heading.textContent=route==='search'?`视频搜索：${keyword}`:route==='category'?`${categoryLabel(categoryId!)} · 分区排行榜`:route==='ranking'?'全站排行榜':'游客热门';
    refreshRanking.hidden=!isRanking();
    categories.disabled = refreshRanking.disabled = load.disabled = ranking.disabled = search.disabled = historyButton.disabled = hotButton.disabled = userButton.disabled = pgcButton.disabled = liveButton.disabled = previous.disabled = next.disabled = true; status.textContent = '正在读取'; status.focus();
    // Invalidate the previous page before touching the Worker; no old card stays
    // actionable while the next page owns focus and response authority.
    list.replaceChildren();
    try {
      if(route==='search'&&history.remember(keyword)!=='saved'){feedback.textContent='搜索历史保存未确认，可在设置中核查';diagnostics.add('local','save_unconfirmed');}
      const result = await content.read(route==='search'?{route,page:target,keyword}:route==='category'?{route,page:target,categoryId:categoryId!,...(refresh?{refresh:true}:{})}:{ route, page: target, ...(refresh?{refresh:true}:{}) }, owner.signal);
      if (owner.signal.aborted) return;
      page = target; status.textContent = result.items.length ? `${isRanking()?'排行榜快照 · ':''}第 ${page} 页` : '暂无内容';
      result.items.forEach((card, index) => {
        const node = button('popular-' + card.bvid, `${isRanking()?`第 ${(page-1)*4+index+1} 名 · `:''}${card.title} · ${card.owner}${card.durationSec > 0 ? ` · ${card.durationSec} 秒` : ''}`, () => play(card));
        // Fixed two-column grid: boundaries stay put, vertical movement keeps column.
        const id = (i: number) => 'popular-' + result.items[i]!.bvid;
        node.dataset.left = id(index % 2 ? index - 1 : index);
        node.dataset.right = id(index % 2 === 0 && index + 1 < result.items.length ? index + 1 : index);
        node.dataset.up = index < 2 ? routeButton().dataset.focusId! : id(index - 2);
        node.dataset.down = index + 2 < result.items.length ? id(index + 2) : !result.noMore && page<(isRanking()?25:10) ? 'popular-next' : page>1?'popular-previous':routeButton().dataset.focusId!;
        list.append(node);
      });
      previous.disabled=page===1;
      next.disabled = result.noMore || page === (isRanking()?25:10);
    } catch (error) { if(route==='search'&&!owner.signal.aborted){failedSearchPage=target;retrySearch.hidden=false;retrySearch.disabled=false;} if (!owner.signal.aborted) status.textContent = error instanceof PopularReadError ? `热门内容读取失败（${error.detail}），未读取到视频，本机队列可单独查看` : error instanceof SearchReadError ? `视频搜索读取失败（${error.detail}），请重试` : error instanceof DomainError && error.code === 'unsupported' ? '当前环境不支持内容网络' : error instanceof ContentApiError ? `${route==='search'?'视频搜索':isRanking()?'排行榜':'热门内容'}接口暂不可用（API ${error.apiCode}），请稍后重试` : `${route==='search'?'视频搜索':isRanking()?'排行榜':'热门内容'}读取失败，请重试`; }
    finally {
      busy = false;
      if (!owner.signal.aborted) { categories.disabled = refreshRanking.disabled = load.disabled = ranking.disabled = search.disabled = historyButton.disabled = hotButton.disabled = userButton.disabled = pgcButton.disabled = liveButton.disabled = false; (failedSearchPage!==undefined?retrySearch:list.querySelector<HTMLButtonElement>('button') ?? routeButton()).focus(); }
    }
  }
  function play(card: PopularCard): void {
    if(mediaUnavailable){feedback.textContent=typeof mediaUnavailable==='string'?mediaUnavailable:'当前设备缺少已验证的媒体能力，请核对设备信息';return;}
    if(vod){shell.openModal('vod-player',mediaOwner=>vodWorkspace(mediaOwner,shell,feedback,{bvid:card.bvid,part:1},profile,diagnostics,vod.caps,()=>vod.open(),source=>createGuestProbePlayer(source.url),queue),'vod-back');return;}
    if (owner.signal.aborted || busy) return;
    shell.openModal('guest-playback', mediaOwner => {
      const modal = document.createElement('section'); modal.className = 'media-panel';
      const title = document.createElement('h2'); title.id = 'media-heading'; title.textContent = card.title; modal.setAttribute('aria-labelledby', title.id);
      const timeline = document.createElement('p'); timeline.setAttribute('role', 'timer'); timeline.setAttribute('aria-live', 'off');
      const message = document.createElement('p'); message.setAttribute('role', 'status'); message.textContent = '正在获取播放源';
      const controls = document.createElement('div');
      const settings = profile.read();
      const stepSeconds = settings.kind === 'ok' ? settings.value.preferences.jumpSeconds : 5;
      const saved = settings.kind === 'ok' && settings.value.preferences.resumePrompt ? settings.value.resume.find(r => r.bvid === card.bvid) : undefined;
      const recorder = new LocalPlayback(profile, card.bvid, diagnostics, () => { feedback.textContent = '本地续播保存未确认，可在设置中核查'; },undefined,1,{title:card.title});
      const playback = new MediaSession(new GuestPlayback(card.bvid), source => createGuestProbePlayer(source.url), (outcome, closure, failure) => {
        diagnostics.add('media', closure.closed ? outcome === 'ended' ? 'ended' : 'failed' : 'close_unknown');
        if(failure)diagnostics.mediaFailure(failure);
        if (mediaOwner.signal.aborted) return;
        feedback.textContent = !closure.closed ? '资源关闭未确认，请重新打开应用' : outcome === 'ended' ? '播放结束' : mediaFailureFeedback(failure);
        void shell.back();
      }, 13000, value => recorder.observe(value));
      const toggle = button('media-toggle', '暂停 / 继续', () => playback.toggle());
      const seek = button('media-seek', `跳到 ${stepSeconds} 秒`, () => { void playback.seek(stepSeconds * 1000).catch(() => {}); });
      const back = button('media-back', '返回原卡', () => { void shell.back(); });
      // Cleanup is owned by the shell modal, so Back/Home/account invalidation all
      // wait for the same decoder + native result before another page can mount.
      mediaOwner.add('media-session', async () => { const result = await playback.close(); diagnostics.add('media', result.closed ? 'closed' : 'close_unknown'); if (!result.closed) throw new DomainError('unknown'); });
      document.body.classList.add('playing-media');
      mediaOwner.add('media-style', () => { document.body.classList.remove('playing-media'); });
      let started = false;
      const resumeTools = document.createElement('div');
      const begin = (position: number) => { if (started || mediaOwner.signal.aborted) return; started = true; resumeTools.remove(); playback.start(position); diagnostics.add('media','started'); back.focus(); update(); };
      if (saved) resumeTools.append(button('resume-continue', `继续观看 · ${Math.floor(saved.timeMs / 1000)} 秒`, () => begin(saved.timeMs)), button('resume-start', '从头播放', () => begin(0)));
      const update = () => {
        if (mediaOwner.signal.aborted) return;
        const snapshot = playback.snapshot(), available = ['playing', 'paused'].includes(snapshot.state) && !snapshot.seeking;
        toggle.disabled = !available; seek.disabled = !available;
        message.textContent = !started ? '是否继续上次在电视观看的位置？' : snapshot.seeking ? '正在跳转' : snapshot.state === 'loading' ? snapshot.recovery==='source-range-retry'?'范围检查超时，正在重试一次':'正在获取播放源' : snapshot.state === 'preparing' ? '正在准备' : snapshot.state === 'paused' ? '已暂停' : snapshot.state === 'playing' ? '正在播放' : '正在关闭';
        timeline.textContent = `${(snapshot.timeMs / 1000).toFixed(1)}${snapshot.durationMs ? ' / ' + (snapshot.durationMs / 1000).toFixed(1) : ''} 秒 · 游客360P首P`;
        // Do not leave actual focus on a control disabled by prepare/seek.
        if ((document.activeElement === toggle || document.activeElement === seek) && !available) back.focus();
      };
      const enqueue=button('media-enqueue','加入本机队列',()=>{if(!mediaOwner.signal.aborted&&queue){const result=queue.add({bvid:card.bvid,title:card.title});feedback.textContent=queueWriteMessage(result);enqueue.textContent=result==='saved'?'已加入本机队列':result==='full'?'本机队列已满':'加入未确认';}});enqueue.disabled=!queue;
      controls.append(back, toggle, seek, enqueue); modal.append(title, timeline, message, resumeTools, controls);
      const timer = setInterval(update, 200); mediaOwner.add('media-timer', () => clearInterval(timer));
      if (!saved) begin(0); else update(); return modal;
    });
  }
  const tools=document.createElement('div');tools.className='content-tools';tools.append(load,ranking,search,historyButton,hotButton,userButton,pgcButton,...(LIVE_IN_CURRENT_DELIVERY?[liveButton]:[]));
  section.append(heading, tools, retrySearch, status, list, previous, next, categories, refreshRanking); return section;
}
