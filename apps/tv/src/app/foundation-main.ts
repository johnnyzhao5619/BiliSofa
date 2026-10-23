import {PRODUCT_RECOVERY} from './recovery-policy.ts';
import {PRODUCT_STREAM} from './stream-policy.ts';
import {PRODUCT_INSTANT} from './instant-actions-policy.ts';
import {PRODUCT_ACTIONS} from './player-actions-policy.ts';
import {PRODUCT_INTERACTIONS} from './interaction-policy.ts';
import {PRODUCT_BROWSE} from '../ui/continuous-grid.ts';
import {localOverlayPreferences} from '../platform/overlay-preferences-store.ts';
import {productSettings} from './product-settings.ts';
import {productAccount} from './product-account.ts';
import {productFrame} from './product-frame.ts';
import {productPage,type ProductMemory} from './product-page.ts';
import {LIVE_IN_CURRENT_DELIVERY} from '../../../../packages/contracts/src/product-scope.ts';
import {recommendations} from './recommendations.ts';
import {vodWorkspace} from './vod-workspace.ts';
import {accountDetails} from './account-details.ts';
import {readCacheClear} from './read-cache-clear.ts';
import {localQueues} from '../platform/local-queue-store.ts';
import {localQueue} from './local-queue.ts';
import { DomainError } from '../../../../packages/contracts/src/index.ts';
import { LoginCoordinator } from '../../../../packages/bili-client/src/login.ts';
import { protectedAccountStore } from '../platform/private-account-store.ts';
import { IdentityWorkerClient } from '../platform/identity-worker.ts';
import { accountRuntime } from '../platform/account-runtime.ts';
import { followUpdates } from './follow-updates.ts';
import { cloudHistory } from './cloud-history.ts';
import { favorites } from './favorites.ts';
import { watchLater } from './watch-later.ts';
import { exitApplication, isBack, mediaCommand, registerMediaKeys } from '../platform/samsung.ts';
import {PRODUCT_POLISH} from './polish-policy.ts';
import {PRODUCT_READING,READING_FIX,READING_FIX2} from './reading-policy.ts';
import { drawQr, clearQr } from '../ui/qr-code.ts';
import { TvShell } from './tv-shell.ts';
import { castEntry } from './cast-entry.ts';
import { guestHome } from './guest-home.ts';
import { localProfiles } from '../platform/local-profile-store.ts';
import { searchHistories } from '../platform/search-history-store.ts';
import { localSettings } from './local-settings.ts';
import { AppDiagnostics } from './app-diagnostics.ts';
import { AccountWorkspace } from './account-workspace.ts';
import { RetainedWrites } from '../../../../packages/bili-client/src/retained-writes.ts';
import {interactionWrites} from '../platform/interaction-journal.ts';
import { writeJournal } from '../platform/write-journal.ts';
import { createVodAccess, createPgcAccess } from '../platform/vod-runtime.ts';
import { vodCandidateCapabilities,vodRuntimeStatus,createGuestProbePlayer,createLiveRelayPlayer } from '../platform/samsung.ts';
import {createLiveAccess} from '../platform/live-runtime.ts';
import {accountLiveAccess} from './account-live.ts';
import {liveBrowse} from './live-browse.ts';
import {liveWorkspace} from './live-workspace.ts';
import type {LiveCard} from '../../../../packages/contracts/src/live-product.ts';
import type {OpenLive} from './live-reader.ts';
import type {ResourceOwner} from './resource-owner.ts';
import type {VodCapabilities} from '../../../../packages/contracts/src/vod-catalog.ts';
import {pgcFollows} from './pgc-follows.ts';
import {pgcFollowList} from './pgc-follow-list.ts';
import {pgcSeasonWorkspace} from './pgc-season.ts';
import type { VodAccess, PgcAccess } from '../../../../packages/contracts/src/vod-runtime.ts';
declare const BILISOFA_PRODUCT_PLAYER:boolean;
const productPlayerEnabled=typeof BILISOFA_PRODUCT_PLAYER!=='undefined'&&BILISOFA_PRODUCT_PLAYER;
declare const BILISOFA_PRODUCT_COLLECTIONS:boolean;
const productCollectionsEnabled=typeof BILISOFA_PRODUCT_COLLECTIONS!=='undefined'&&BILISOFA_PRODUCT_COLLECTIONS;
declare const BILISOFA_PRODUCT_DISCOVERY:boolean;
const productDiscoveryEnabled=typeof BILISOFA_PRODUCT_DISCOVERY!=='undefined'&&BILISOFA_PRODUCT_DISCOVERY;
declare const BILISOFA_PRODUCT_LIBRARY:boolean;
const productLibraryEnabled=typeof BILISOFA_PRODUCT_LIBRARY!=='undefined'&&BILISOFA_PRODUCT_LIBRARY;
declare const BILISOFA_PRODUCT_UI:boolean;
const productUi=typeof BILISOFA_PRODUCT_UI!=='undefined'&&BILISOFA_PRODUCT_UI;
if(productUi)document.body.classList.add('product-ui');
if(PRODUCT_BROWSE)document.body.classList.add('product-browse');
if(productPlayerEnabled)document.body.classList.add('product-player');
const productMemory:ProductMemory={identity:'',home:{source:{kind:'popular',page:1}},search:{source:{kind:'search',page:1}},library:{tab:'local',pages:{},anchors:{}}};
declare const BILISOFA_PRODUCT_CAST_START:boolean;
declare const BILISOFA_PRODUCT_CAST_SEEK:boolean;
declare const BILISOFA_PRODUCT_CAST_CLOCK:boolean;
declare const BILISOFA_PRODUCT_REMOTE:boolean;
const remote=typeof BILISOFA_PRODUCT_REMOTE!=='undefined'&&BILISOFA_PRODUCT_REMOTE;
if(PRODUCT_POLISH)document.body.classList.add('product-polish');
if(PRODUCT_READING)document.body.classList.add('product-reading');
const castClock=typeof BILISOFA_PRODUCT_CAST_CLOCK!=='undefined'&&BILISOFA_PRODUCT_CAST_CLOCK;
const castSeek=typeof BILISOFA_PRODUCT_CAST_SEEK!=='undefined'&&BILISOFA_PRODUCT_CAST_SEEK;
const castStart=typeof BILISOFA_PRODUCT_CAST_START!=='undefined'&&BILISOFA_PRODUCT_CAST_START;
declare const BILISOFA_U1:boolean;
declare const BILISOFA_RECOMMEND:boolean;
declare const BILISOFA_W06:boolean;
declare const BILISOFA_W04: boolean;
declare const BILISOFA_W05: boolean;
const w04 = typeof BILISOFA_W04 !== 'undefined' && BILISOFA_W04;
const root = document.querySelector<HTMLElement>('#pages')!, overlays = document.querySelector<HTMLElement>('#overlays')!, feedback = document.querySelector<HTMLElement>('#feedback')!;
// Transient notices clear after 4 s; progress, unconfirmed and sign-in notices stay until replaced.
if(productUi){let notice:ReturnType<typeof setTimeout>|undefined;new MutationObserver(()=>{clearTimeout(notice);const text=feedback.textContent??'';if(text&&!/正在|未确认|扫码|登录|失效|重新打开|权限/.test(text))notice=setTimeout(()=>{if(feedback.textContent===text)feedback.textContent='';},4000);}).observe(feedback,{childList:true,characterData:true,subtree:true});}
const repository = protectedAccountStore(), login = new LoginCoordinator(repository, () => new IdentityWorkerClient());
const queues=localQueues();
const profiles = localProfiles(), diagnostics = new AppDiagnostics(READING_FIX2?'U5-reading-0.47.2':READING_FIX?'U5-reading-0.47.1':PRODUCT_READING?'U5-reading-0.47.0':PRODUCT_POLISH?'U5-polish-0.46.0':remote?'U5-remote-0.45.0':castClock?'U4-cast-clock-0.43.0':castSeek?'U4-cast-seek-0.42.0':castStart?'U4-cast-start-0.41.0':PRODUCT_RECOVERY?'U4-recovery-0.40.0':PRODUCT_STREAM?'U4-stream-0.39.0':PRODUCT_INSTANT?'U4-instant-0.38.0':PRODUCT_ACTIONS?'U4-actions-0.37.0':PRODUCT_INTERACTIONS?'U4-interactions-0.36.0':PRODUCT_BROWSE?'U3-browse-0.35.0':productPlayerEnabled?'U3-player-0.34.0':productCollectionsEnabled?'U2-following-0.33.0':productDiscoveryEnabled?'U2-search-0.32.0':productLibraryEnabled?'U2-library-0.31.0':productUi?'U1-shell-0.30.0':typeof BILISOFA_U1!=='undefined'&&BILISOFA_U1?'U1-content-0.29.0':typeof BILISOFA_RECOMMEND!=='undefined'&&BILISOFA_RECOMMEND?'W05-local-data-0.28.0':typeof BILISOFA_W06!=='undefined'&&BILISOFA_W06?'W06-cast-0.25.0':typeof BILISOFA_W05!=='undefined'&&BILISOFA_W05?'W05-interactions-0.24.1':w04?'W04-development-0.21.0':'W03-account-details-0.20.0'); diagnostics.add('app','started');if(PRODUCT_INSTANT)document.body.classList.add('product-instant');if(PRODUCT_STREAM)document.body.classList.add('product-stream');
const histories=searchHistories();
const writes = new RetainedWrites(writeJournal());
function writeSummary(id:string){const old=writes.summary(id),video=typeof BILISOFA_W05!=='undefined'&&BILISOFA_W05?interactionWrites().summary(id):{total:0,unknown:0};return old&&video?{total:old.total+video.total,unknown:old.unknown+video.unknown}:undefined;}
let workspace: AccountWorkspace;
let disposed = false, selecting = false, selectionEpoch = 0;
function button(id: string, label: string, click: () => void): HTMLButtonElement {
  const b = document.createElement('button'); b.dataset.focusId = id; b.textContent = label; b.addEventListener('click', click); return b;
}
function message(error: unknown): string {
  const code = error instanceof DomainError ? error.code : 'unknown';
  return code === 'login' ? '登录已失效，请重新扫码' : code === 'permission' ? '账号已保存或存储已满，请先管理已有账号' : code === 'cancelled' ? '操作已取消' : code === 'unsupported' ? '当前环境不支持此功能' : code === 'network' ? '网络请求失败，请检查连接后重试' : code === 'timeout' ? '等待超时，请重试' : '操作结果未确认，请重新打开应用后核查';
}
async function selection(action: () => Promise<void>, success: () => string): Promise<void> {
  const epoch = ++selectionEpoch; selecting = true; feedback.textContent = '正在核对账号身份，按返回可取消';
  let outcome: 'verified' | 'cancelled' | 'failed' = 'cancelled';
  try { const pending = action(); feedback.tabIndex = -1; feedback.focus(); await pending; outcome = workspace.state.kind === 'active' ? 'verified' : 'cancelled'; if (epoch === selectionEpoch) feedback.textContent = success(); }
  catch (e) { outcome = e instanceof DomainError && e.code === 'cancelled' ? 'cancelled' : 'failed'; if (epoch === selectionEpoch) feedback.textContent = message(e); }
  finally { if (epoch === selectionEpoch) { selecting = false; diagnostics.add('account', outcome); } }
}
function use(id?: string): Promise<void> { return selection(() => workspace.select(id), () => id ? '账号身份已确认' : '已切换游客'); }
async function openPgcMedia(seasonId:string,caps:VodCapabilities):Promise<PgcAccess>{
 if(workspace.state.kind!=='active')return createPgcAccess(caps,seasonId);
 return workspace.read((runtime,scope,signal)=>{if(!runtime.openPgc)throw new DomainError('unsupported');return runtime.openPgc(seasonId,scope,signal);},value=>{
  const candidate=value as PgcAccess;if(!candidate||typeof candidate.season!=='function'||typeof candidate.read!=='function'||typeof candidate.close!=='function')throw new DomainError('invalid');return candidate;
 });
}

const shell = new TvShell(document, root, overlays, (route, owner): HTMLElement => {
  const state = workspace?.state;
  const profile = profiles.profile(state?.kind === 'active' ? state.account.id : 'guest');
  const queue=queues.profile(state?.kind==='active'?state.account.id:'guest');
  const history=histories.profile(state?.kind==='active'?state.account.id:'guest');
  let accountBack:(()=>boolean)|undefined;
  const wrap=(view:HTMLElement)=>productUi?productFrame(owner,shell,route,view,accountBack):view;
  if (route.page === 'settings') {const view=localSettings(owner, shell, profile, diagnostics, () => state?.kind === 'active' ? writeSummary(state.account.id) : 'guest',history,state?.kind==='active'?()=>{shell.openModal('read-cache-clear',child=>readCacheClear(child,shell,workspace),'cache-keep');}:undefined,queue,productUi?()=>{void shell.navigateTop({page:'home'});}:undefined);return wrap(productPlayerEnabled?productSettings(owner,shell,view,localOverlayPreferences(state?.kind==='active'?state.account.id:'guest')):view);}
  const section = document.createElement('section'), title = document.createElement('h1'); title.textContent = route.page === 'account' ? '账号管理' : 'BiliSofa'; section.append(title);
  if (route.page !== 'account') {
    const device=w04?vodRuntimeStatus():undefined,caps=device?.kind==='available'?device.capabilities:undefined;
    const unavailable=device?.kind==='unavailable'?'当前平台缺少可用播放器（media.player_api_missing），请核对平台API':false;
    const liveOpen:OpenLive=async(media,signal)=>{
      if(media&&!caps)throw new DomainError('unsupported');
      if(workspace.state.kind==='active')return accountLiveAccess(workspace,media,signal);
      if(signal.aborted)throw new DomainError('cancelled');return createLiveAccess(media?caps:undefined);
    };
    const playLive=(card:LiveCard)=>{if(!LIVE_IN_CURRENT_DELIVERY||owner.signal.aborted)return;if(!caps){feedback.textContent=unavailable||'设备媒体状态未确认';return;}shell.openModal('live-playback',child=>liveWorkspace(child,shell,card,liveOpen,()=>createLiveAccess(),source=>createLiveRelayPlayer(source.url),diagnostics),'live-player-back');};
    const vod=caps?{caps,open:async():Promise<VodAccess>=>{
      if(state?.kind!=='active')return createVodAccess(caps);
      return workspace.read((runtime,scope,signal)=>{if(!runtime.openVod)throw new DomainError('unsupported');return runtime.openVod(scope,signal);},value=>{
        const candidate=value as VodAccess;if(!candidate||typeof candidate.read!=='function'||typeof candidate.transport!=='function'||typeof candidate.close!=='function')throw new DomainError('invalid');return candidate;
      });
    },openPgc:(seasonId:string)=>openPgcMedia(seasonId,caps),playLive:(card:import('../../../../packages/contracts/src/live-search.ts').LiveSearchCard)=>playLive({roomId:card.roomId,title:card.title,owner:card.owner,category:card.category,state:card.state}),...(state?.kind==='active'?{follows:(child:ResourceOwner)=>pgcFollows(child,workspace)}:{})}:undefined;
    if(productUi)return wrap(productPage(owner,shell,route,productMemory,{profile,queue,history,feedback,diagnostics,workspace,unavailable,vod,libraryEnabled:productLibraryEnabled,discoveryEnabled:productDiscoveryEnabled,collectionsEnabled:productCollectionsEnabled}));
    const identity = document.createElement('p');
    identity.textContent = state?.kind === 'active' ? `当前账号：${state.account.name}` : '当前为游客'; section.append(identity);
    section.append(button('accounts', '管理账号', () => { void shell.navigate({ page: 'account' }); }));
    if(typeof BILISOFA_RECOMMEND!=='undefined'&&BILISOFA_RECOMMEND){const recommend=button('recommend-open','当前账号推荐',()=>{shell.openModal('recommendations',child=>recommendations(child,shell,workspace,card=>{if(!vod){feedback.textContent=unavailable||'当前平台缺少可用播放器';return;}shell.openModal('vod-player',mediaOwner=>vodWorkspace(mediaOwner,shell,feedback,{bvid:card.bvid,part:1},profile,diagnostics,vod.caps,()=>vod.open(),source=>createGuestProbePlayer(source.url),queue),'vod-back');}),'recommend-back');});recommend.disabled=state?.kind!=='active';section.append(recommend);}
    if(w04&&LIVE_IN_CURRENT_DELIVERY){const publicLive=button('live-open','直播推荐 / 分区',()=>{shell.openModal('live-browse',child=>liveBrowse(child,shell,liveOpen,false,playLive),'live-browse-back');});const followedLive=button('live-following-open','我的关注直播间',()=>{shell.openModal('live-following',child=>liveBrowse(child,shell,liveOpen,true,playLive),'live-browse-back');});followedLive.disabled=state?.kind!=='active';section.append(publicLive,followedLive);}
    const local = profile.read();
    section.append(castEntry(owner, shell, feedback, local.kind === 'ok' ? local.value.preferences.jumpSeconds : 10, diagnostics), button('settings', '设置与本地记录', () => { void shell.navigate({ page: 'settings' }); }), button('local-queue-open','本机播放队列',()=>{shell.openModal('local-queue',modalOwner=>localQueue(modalOwner,shell,queue,profile,diagnostics,feedback,vod,unavailable),'queue-back');}), guestHome(owner, shell, feedback, profile, diagnostics,history,queue,vod,unavailable));
    return section;
  }
  const status = document.createElement('p'); status.setAttribute('role', 'status'); status.textContent = '正在读取电视保存的账号';
  const canvas = document.createElement('canvas'); canvas.hidden = true; canvas.setAttribute('aria-label', '哔哩哔哩登录二维码');
  const list = document.createElement('div'); list.className = 'account-list';
  const renewal=PRODUCT_RECOVERY?workspace.recovery:undefined;
  if(renewal)feedback.textContent='登录会话需要更新，请在此页用原账号扫码';
  let qrPending=false,qrEpoch=0;
  const add = button('add-account', '添加账号 · 扫码登录', () => {
    const ticket=++qrEpoch;qrPending=true;add.disabled=true;status.textContent='正在获取登录二维码';
    void login.login(owner.signal,event=>{
      if(owner.signal.aborted||ticket!==qrEpoch)return;
      if(event.kind==='qr'){drawQr(canvas,event.url);canvas.hidden=false;status.textContent='请用官方哔哩哔哩扫码，并在手机确认';}
      else status.textContent='已扫描，请在手机确认登录';
    },renewal?.id).then(async saved=>{
      if(owner.signal.aborted||ticket!==qrEpoch)return;qrPending=false;
      if(renewal){await use(saved.id);return;}
      feedback.textContent='账号已保存，请选择使用';void shell.navigate({page:'account'},true);
    }).catch(error=>{
      if(owner.signal.aborted||ticket!==qrEpoch)return;qrPending=false;clearQr(canvas);canvas.hidden=true;
      status.textContent=renewal&&error instanceof DomainError&&error.code==='permission'?'请使用原账号扫码，本次没有更换账号':message(error);add.disabled=false;
    });
  });add.disabled=true;
  if(PRODUCT_RECOVERY)accountBack=()=>{
    if(!qrPending)return false;const ticket=++qrEpoch;qrPending=false;clearQr(canvas);canvas.hidden=true;add.disabled=true;status.textContent='正在取消扫码';
    void login.close().then(result=>{if(owner.signal.aborted||ticket!==qrEpoch)return;status.textContent=result.closed?'扫码已取消；会话和本机记录未删除':'扫码关闭未确认，请重新打开应用';add.disabled=!result.closed;if(result.closed)add.focus();});return true;
  };
  owner.add('login-exchange', async () => { if (!(await login.close()).closed) throw new DomainError('unknown'); });
  owner.add('qr-canvas', () => { clearQr(canvas); canvas.hidden = true; });
  const watch=button('watch-later-open','稍后再看 · 只读',()=>{shell.openModal('watch-later',modalOwner=>watchLater(modalOwner,shell,workspace,queue),'watch-later-back');});watch.disabled=state?.kind!=='active';
  const cloud=button('cloud-history-open','云端历史 · 只读',()=>{shell.openModal('cloud-history',modalOwner=>cloudHistory(modalOwner,shell,workspace,queue),'cloud-history-back');});cloud.disabled=state?.kind!=='active';
  const fav=button('favorite-folders-open','收藏夹 · 只读',()=>{shell.openModal('favorite-folders',modalOwner=>favorites(modalOwner,shell,workspace,queue),'favorite-folders-back');});fav.disabled=state?.kind!=='active';
  const updates=button('follow-updates-open','关注更新 · 只读',()=>{shell.openModal('follow-updates',modalOwner=>followUpdates(modalOwner,shell,workspace),'follow-updates-back');});updates.disabled=state?.kind!=='active';
  const details=button('account-details-open','当前账号详情',()=>{if(!owner.signal.aborted&&state?.kind==='active')shell.openModal('account-details',modalOwner=>accountDetails(modalOwner,shell,state.account,state.profile),'account-details-back');});details.disabled=state?.kind!=='active';
  section.append(details,watch,cloud,fav,updates);
  const pgcCaps=w04?vodCandidateCapabilities():undefined;
  if(pgcCaps){const follows=button('pgc-follow-list-open','我的追番 / 追剧',()=>{shell.openModal('pgc-follow-list',child=>pgcFollowList(child,shell,pgcFollows(child,workspace),card=>{shell.openModal('pgc-season',seasonOwner=>pgcSeasonWorkspace(seasonOwner,shell,profile,diagnostics,feedback,pgcCaps,()=>openPgcMedia(card.seasonId,pgcCaps),source=>createGuestProbePlayer(source.url),actionOwner=>pgcFollows(actionOwner,workspace),'返回追番 / 追剧列表'),'pgc-season-back');}),'pgc-list-back');});follows.disabled=state?.kind!=='active';section.append(follows);}
  if(PRODUCT_RECOVERY&&state?.kind==='active')section.append(button('renew-account','重新扫码更新此会话',()=>{void workspace.prepareRenewal().catch(error=>{feedback.textContent=message(error);});}));
  section.append(add, button('guest', '使用游客身份', () => { void use(); }), button('account-back', '返回', () => { void shell.back(); }), status, canvas, list);
  void repository.list().then(accounts => {
    if (owner.signal.aborted) return;
    add.disabled = false;if(renewal&&(document.activeElement as HTMLElement|null)?.dataset.focusId==='guest')add.focus(); status.textContent = renewal?'登录需要更新，请用原账号扫码；成功后返回原页面':accounts.length ? '请选择账号；使用前会重新核对身份' : '尚未保存账号';
    for (const account of accounts) {
      const row = document.createElement('div');
      row.append(button('use-' + account.id, `使用 ${account.name}`, () => { void use(account.id); }), button('remove-' + account.id, `移除 ${account.name}`, () => {
        shell.openModal('remove-account', () => {
          const modal = document.createElement('section'), heading = document.createElement('h2'); heading.id = 'remove-title'; heading.textContent = `从电视移除 ${account.name} 及本地设置、续播、队列？`; modal.setAttribute('aria-labelledby', heading.id); modal.append(heading);
          const retained = document.createElement('p'); retained.textContent = '搜索历史和本机队列也会清除；防重复写操作记录会保留'; modal.append(retained);
          modal.append(button('keep-account', '保留账号', () => { void shell.back(); }), button('confirm-remove', '确认移除', () => {
            void (async () => {
              await shell.back(); await workspace.select();
              const removed = profiles.profile(account.id).clear(); diagnostics.add('local',removed === 'deleted' ? 'deleted' : 'delete_unconfirmed');
              const searchRemoved=histories.profile(account.id).clear(),queueRemoved=queues.profile(account.id).clear();
              if (removed !== 'deleted'||searchRemoved!=='deleted'||queueRemoved!=='deleted') { feedback.textContent = '本地记录清除未确认，账号已保留，可重试移除'; await shell.navigate({ page: 'account' }); return; }
              await workspace.remove(account.id); diagnostics.add('account','removed'); feedback.textContent = '该账号及设置、续播、队列已移除；防重复写操作记录已保留'; await shell.navigate({ page: 'account' });
            })().catch(e => { feedback.textContent = message(e); });
          })); return modal;
        });
      })); list.append(row);
    }
  }).catch(error => { if (!owner.signal.aborted) status.textContent = message(error); });
  return wrap(productPlayerEnabled?productAccount(owner,shell,section,workspace):section);
}, isBack, () => {
  if (shell.restartRequired) { exitApplication(); return; }
  shell.openModal('exit', () => {
    const modal = document.createElement('section'), title = document.createElement('h2'); title.id = 'exit-title'; title.textContent = '退出 BiliSofa？'; modal.setAttribute('aria-labelledby', title.id); modal.append(title);
    modal.append(button('stay', '继续使用', () => { void shell.back(); }), button('exit', '退出', () => {
      void workspace.dispose().then(closed => { if (closed) { disposed = true; exitApplication(); } else feedback.textContent = '资源关闭未确认，请使用系统返回键退出应用'; });
    })); return modal;
  });
}, 15000, () => { if (selecting && !document.hidden) void use(); }, mediaCommand);
diagnostics.add('app', registerMediaKeys() === 'registered' ? 'media_keys_registered' : 'media_keys_unavailable');
workspace = new AccountWorkspace(shell, repository, accountRuntime, undefined, 16000, writes, PRODUCT_RECOVERY);
const visibility = () => {
  if (disposed) return;
  if (document.hidden) { diagnostics.add('lifecycle','suspended'); selectionEpoch++; selecting = false; void workspace.setHidden(true).catch(e => { feedback.textContent = message(e); }); }
  else { diagnostics.add('lifecycle','resumed'); void selection(() => workspace.setHidden(false), () => workspace.state.kind === 'active' ? '账号身份已重新确认' : '已返回游客界面'); }
};
document.addEventListener('visibilitychange', visibility);
globalThis.addEventListener('pagehide', () => { disposed = true; document.removeEventListener('visibilitychange', visibility); void workspace.dispose(); }, { once: true });
void shell.start();
