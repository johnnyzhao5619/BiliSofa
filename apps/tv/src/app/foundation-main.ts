import {localOverlayPreferences} from '../platform/overlay-preferences-store.ts';
import {productSettings} from './product-settings.ts';
import {productAccount} from './product-account.ts';
import {productFrame} from './product-frame.ts';
import {productPage,type ProductMemory} from './product-page.ts';
import {LIVE_IN_CURRENT_DELIVERY} from '../../../../packages/contracts/src/product-scope.ts';
import {accountDetails} from './account-details.ts';
import {readCacheClear} from './read-cache-clear.ts';
import {localQueues} from '../platform/local-queue-store.ts';
import { DomainError } from '../../../../packages/contracts/src/index.ts';
import { LoginCoordinator } from '../../../../packages/bili-client/src/login.ts';
import { protectedAccountStore } from '../platform/private-account-store.ts';
import { IdentityWorkerClient } from '../platform/identity-worker.ts';
import { accountRuntime, prewarmAccountKernel, dropWarmAccountKernel } from '../platform/account-runtime.ts';
import { followUpdates } from './follow-updates.ts';
import { cloudHistory } from './cloud-history.ts';
import { favorites } from './favorites.ts';
import { watchLater } from './watch-later.ts';
import { exitApplication, isBack, mediaCommand, registerMediaKeys } from '../platform/samsung.ts';
import {productButton} from './product-frame.ts';
import {rateProbe} from './rate-probe.ts';
import {publicListNote} from '../platform/public-lists.ts';
import {visitorSettings} from './visitor-settings.ts';
import {bridgeEvidence,type SourceStep} from '../platform/bridge-evidence.ts';
import {openLaunchChooser,rememberProfile,forgetProfile} from './launch-chooser.ts';
import { drawQr, clearQr } from '../ui/qr-code.ts';
import { TvShell } from './tv-shell.ts';
import { publicKernel } from '../platform/public-kernel.ts';
import { localProfiles } from '../platform/local-profile-store.ts';
import { searchHistories } from '../platform/search-history-store.ts';
import { localSettings } from './local-settings.ts';
import { AppDiagnostics } from './app-diagnostics.ts';
import { onListSkips } from '../platform/list-skips.ts';
import { AccountWorkspace } from './account-workspace.ts';
import { RetainedWrites } from '../../../../packages/bili-client/src/retained-writes.ts';
import {interactionWrites} from '../platform/interaction-journal.ts';
import { writeJournal } from '../platform/write-journal.ts';
import { createVodAccess, createPgcAccess } from '../platform/vod-runtime.ts';
import { vodCandidateCapabilities,vodRuntimeStatus,createGuestProbePlayer,createLiveRelayPlayer } from '../platform/samsung.ts';
import {createLiveAccess} from '../platform/live-runtime.ts';
import {accountLiveAccess} from './account-live.ts';
import {liveWorkspace} from './live-workspace.ts';
import type {LiveCard} from '../../../../packages/contracts/src/live-product.ts';
import type {OpenLive} from './live-reader.ts';
import type {ResourceOwner} from './resource-owner.ts';
import type {VodCapabilities} from '../../../../packages/contracts/src/vod-catalog.ts';
import {pgcFollows} from './pgc-follows.ts';
import {pgcFollowList} from './pgc-follow-list.ts';
import {pgcSeasonWorkspace} from './pgc-season.ts';
import type { VodAccess, PgcAccess } from '../../../../packages/contracts/src/vod-runtime.ts';
document.body.classList.add('product-ui');
document.body.classList.add('product-browse');
document.body.classList.add('product-player');
const productMemory:ProductMemory={identity:'',home:{source:{kind:'popular',page:1}},search:{source:{kind:'search',page:1}},library:{tab:'local',pages:{},anchors:{}}};
document.body.classList.add('product-polish');
document.body.classList.add('product-reading');
document.body.classList.add('product-detail');
document.body.classList.add('product-season');
document.body.classList.add('product-profiles');
document.body.classList.add('product-up');
const root = document.querySelector<HTMLElement>('#pages')!, overlays = document.querySelector<HTMLElement>('#overlays')!, feedback = document.querySelector<HTMLElement>('#feedback')!;
// Transient notices clear after 4 s; progress, unconfirmed and sign-in notices stay until replaced.
{let notice:ReturnType<typeof setTimeout>|undefined;new MutationObserver(()=>{clearTimeout(notice);const text=feedback.textContent??'';if(text&&!/正在|未确认|扫码|登录|失效|重新打开|权限/.test(text))notice=setTimeout(()=>{if(feedback.textContent===text)feedback.textContent='';},4000);}).observe(feedback,{childList:true,characterData:true,subtree:true});}
const repository = protectedAccountStore(), login = new LoginCoordinator(repository, () => new IdentityWorkerClient());
const queues=localQueues();
const profiles = localProfiles(), diagnostics = new AppDiagnostics('U5-0.60.0'); diagnostics.add('app','started'); onListSkips(() => diagnostics.add('app','list_items_skipped'));document.body.classList.add('product-instant');document.body.classList.add('product-stream');
const histories=searchHistories();
const writes = new RetainedWrites(writeJournal());
function writeSummary(id:string){const old=writes.summary(id),video=interactionWrites().summary(id);return old&&video?{total:old.total+video.total,unknown:old.unknown+video.unknown}:undefined;}
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
/** ADR-102: which step of the media source failed, in fixed words; hosts appear only as a class. */
function stepNote(s:SourceStep|undefined):string{
  if(!s)return '';
  const upstream=s.timeout?' · 上游超时':` · 上游 HTTP ${s.http||'无响应'} / cURL ${s.curl}`;
  const reads:Record<number,string>={0:'登录状态',1:'视频信息',2:'播放地址',4:'番剧信息',5:'播放地址'},hosts={upos:'B站镜像',akamai:'B站Akamai',edge:'国内边缘节点'} as const;
  if(s.kind==='read')return ` · 读取播放信息（${reads[s.operation]??'请求'}）${upstream}`;
  if(s.kind==='check')return ` · 来源检查（${s.track==='video'?'视频':'音频'}·${s.position==='primary'?'主线路':'备用线路'}·${hosts[s.host]}）${upstream}`;
  return ` · 播放桥接${upstream}`;
}
/** One line in 帮助与诊断 naming the latest playback failure (0.50.1), so a device report needs no JSON paging. */
function lastFailureNote(f:ReturnType<AppDiagnostics['lastMediaFailure']>):HTMLElement{
  const p=document.createElement('p');p.className='tv-diagnostic-note';p.setAttribute('role','status');
  const phase={source:'读取播放源时',prepare:'准备播放时',playback:'播放过程中',seek:'跳转时',control:'控制播放时',protocol:'播放协议处理时'} as const;
  const reason:Record<string,string>={network:'网络中断',timeout:'超时',permission:'无权限或地区限制',login:'登录失效',unsupported:'格式或设备不支持',invalid:'返回内容无效',unknown:'资源释放未确认',cancelled:'已取消'};
  // ADR-101: the bridge's last upstream answer and how often it moved to Bilibili's backup line, as fixed numbers.
  const e=bridgeEvidence(),line=e?`${stepNote(e.step)}${e.failovers?` · 已切换备用线路 ${e.failovers} 次`:''}`:'';
  p.textContent=f?`最近一次播放失败：${phase[f.phase]} · ${reason[f.reason]??f.reason}${f.sourceCode?` · 代码 ${f.sourceCode}`:''}${line}`:`本次运行没有播放失败记录${e?.failovers?`（已切换备用线路 ${e.failovers} 次）`:''}`;
  // ADR-105: the latest category/UP read outcome (lane and B站 code), on its own line.
  const lists=publicListNote();if(!lists)return p;
  const box=document.createElement('div'),q=document.createElement('p');q.className='tv-public-note';q.textContent=lists;box.append(p,q);return box;
}
function use(id?: string): Promise<void> { return selection(() => workspace.select(id), () => id ? '账号身份已确认' : '已切换游客').then(() => { if (id && workspace.state.kind === 'active' && workspace.state.account.id === id) rememberProfile(id); }); }
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
  const wrap=(view:HTMLElement)=>productFrame(owner,shell,route,view,accountBack);
  const openVodAccess=async(caps:Parameters<typeof createVodAccess>[0]):Promise<VodAccess>=>{
    if(state?.kind!=='active')return createVodAccess(caps);
    return workspace.read((runtime,scope,signal)=>{if(!runtime.openVod)throw new DomainError('unsupported');return runtime.openVod(scope,signal);},value=>{
      const candidate=value as VodAccess;if(!candidate||typeof candidate.read!=='function'||typeof candidate.transport!=='function'||typeof candidate.close!=='function')throw new DomainError('invalid');return candidate;
    });
  };
  if (route.page === 'settings') {const view=localSettings(owner, shell, profile, diagnostics, () => state?.kind === 'active' ? writeSummary(state.account.id) : 'guest',history,state?.kind==='active'?()=>{shell.openModal('read-cache-clear',child=>readCacheClear(child,shell,workspace),'cache-keep');}:undefined,queue,()=>{void shell.navigateTop({page:'home'});});const probeDevice=vodRuntimeStatus(),probeCaps=probeDevice?.kind==='available'?probeDevice.capabilities:undefined;
    // R07 rate probe (ADR-095) lives in 帮助与诊断 and only runs when the viewer starts it.
    const probe=probeCaps?productButton('settings-rate-probe','倍速探查（诊断）',()=>{if(!owner.signal.aborted)shell.openModal('rate-probe',child=>rateProbe(child,shell,probeCaps,()=>openVodAccess(probeCaps),profile),'rate-probe-start');}):undefined;
    return wrap(productSettings(owner,shell,view,localOverlayPreferences(state?.kind==='active'?state.account.id:'guest'),probe,lastFailureNote(diagnostics.lastMediaFailure()),visitorSettings(owner)));}
  const section = document.createElement('section'), title = document.createElement('h1'); title.textContent = route.page === 'account' ? '账号管理' : 'BiliSofa'; section.append(title);
  if (route.page !== 'account') {
    const device=vodRuntimeStatus(),caps=device?.kind==='available'?device.capabilities:undefined;
    const unavailable=device?.kind==='unavailable'?'当前平台缺少可用播放器（media.player_api_missing），请核对平台API':false;
    const liveOpen:OpenLive=async(media,signal)=>{
      if(media&&!caps)throw new DomainError('unsupported');
      if(workspace.state.kind==='active')return accountLiveAccess(workspace,media,signal);
      if(signal.aborted)throw new DomainError('cancelled');return createLiveAccess(media?caps:undefined);
    };
    const playLive=(card:LiveCard)=>{if(!LIVE_IN_CURRENT_DELIVERY||owner.signal.aborted)return;if(!caps){feedback.textContent=unavailable||'设备媒体状态未确认';return;}shell.openModal('live-playback',child=>liveWorkspace(child,shell,card,liveOpen,()=>createLiveAccess(),source=>createLiveRelayPlayer(source.url),diagnostics),'live-player-back');};
    // ADR-113: the card menu's 稍后再看 uses the signed-in account's own interaction lane.
    const openInteractions=state?.kind==='active'?(bvid:string)=>workspace.read((runtime,scope,signal)=>{if(!runtime.openInteractions)throw new DomainError('unsupported');return runtime.openInteractions(bvid,scope,signal);},value=>{const lane=value as import('../../../../packages/contracts/src/video-interactions-dto.ts').VideoInteractionAccess;if(!lane||typeof lane.read!=='function'||typeof lane.submit!=='function'||typeof lane.close!=='function')throw new DomainError('invalid');return lane;}):undefined;
    const vod=caps?{caps,open:()=>openVodAccess(caps),openPgc:(seasonId:string)=>openPgcMedia(seasonId,caps),...(openInteractions?{interactions:openInteractions}:{}),playLive:(card:import('../../../../packages/contracts/src/live-search.ts').LiveSearchCard)=>playLive({roomId:card.roomId,title:card.title,owner:card.owner,category:card.category,state:card.state}),...(state?.kind==='active'?{follows:(child:ResourceOwner)=>pgcFollows(child,workspace)}:{})}:undefined;
    return wrap(productPage(owner,shell,route,productMemory,{profile,queue,history,feedback,diagnostics,workspace,unavailable,vod,libraryEnabled:true,discoveryEnabled:true,collectionsEnabled:true}));
  }
  const status = document.createElement('p'); status.setAttribute('role', 'status'); status.textContent = '正在读取电视保存的账号';
  const canvas = document.createElement('canvas'); canvas.hidden = true; canvas.setAttribute('aria-label', '哔哩哔哩登录二维码');
  const list = document.createElement('div'); list.className = 'account-list';
  const renewal=workspace.recovery;
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
  accountBack=()=>{
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
  const pgcCaps=vodCandidateCapabilities();
  if(pgcCaps){const follows=button('pgc-follow-list-open','我的追番 / 追剧',()=>{shell.openModal('pgc-follow-list',child=>pgcFollowList(child,shell,pgcFollows(child,workspace),card=>{shell.openModal('pgc-season',seasonOwner=>pgcSeasonWorkspace(seasonOwner,shell,profile,diagnostics,feedback,pgcCaps,()=>openPgcMedia(card.seasonId,pgcCaps),source=>createGuestProbePlayer(source.url),actionOwner=>pgcFollows(actionOwner,workspace),'返回追番 / 追剧列表'),'pgc-season-back');}),'pgc-list-back');});follows.disabled=state?.kind!=='active';section.append(follows);}
  if(state?.kind==='active')section.append(button('renew-account','重新扫码更新此会话',()=>{void workspace.prepareRenewal().catch(error=>{feedback.textContent=message(error);});}));
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
              await shell.back(); await workspace.select(); forgetProfile(account.id);
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
  return wrap(productAccount(owner,shell,section,workspace));
}, isBack, () => {
  if (shell.restartRequired) { exitApplication(); return; }
  shell.openModal('exit', () => {
    const modal = document.createElement('section'), title = document.createElement('h2'); title.id = 'exit-title'; title.textContent = '退出 BiliSofa？'; modal.setAttribute('aria-labelledby', title.id); modal.append(title);
    modal.append(button('stay', '继续使用', () => { void shell.back(); }), button('exit', '退出', () => {
      void Promise.all([workspace.dispose(), publicKernel().close()]).then(([closed]) => { if (closed) { disposed = true; exitApplication(); } else feedback.textContent = '资源关闭未确认，请使用系统返回键退出应用'; });
    })); return modal;
  });
}, 15000, () => { if (selecting && !document.hidden) void use(); }, mediaCommand);
diagnostics.add('app', registerMediaKeys() === 'registered' ? 'media_keys_registered' : 'media_keys_unavailable');
workspace = new AccountWorkspace(shell, repository, accountRuntime, undefined, 16000, writes, true);
const visibility = () => {
  if (disposed) return;
  // ADR-108: the resident public kernel closes with the app and starts again on the next read.
  if (document.hidden) { diagnostics.add('lifecycle','suspended'); selectionEpoch++; selecting = false; void publicKernel().close(); dropWarmAccountKernel(); void workspace.setHidden(true).catch(e => { feedback.textContent = message(e); }); }
  else { diagnostics.add('lifecycle','resumed'); void selection(() => workspace.setHidden(false), () => workspace.state.kind === 'active' ? '账号身份已重新确认' : '已返回游客界面'); }
};
document.addEventListener('visibilitychange', visibility);
globalThis.addEventListener('pagehide', () => { disposed = true; document.removeEventListener('visibilitychange', visibility); void publicKernel().close(); void workspace.dispose(); }, { once: true });
// ADR-108: boot the public kernel (WASM compile, first TLS) while the first screen and the chooser appear.
publicKernel().prewarm();
// 0.50.0 (ADR-099): a cold start asks who is watching before any private content is read.
void shell.start().then(() => {
  if (disposed) return;
  // ADR-109: with saved accounts, the account kernel compiles while the viewer chooses (no jar, no request).
  void openLaunchChooser(shell, { accounts: () => repository.list().then(list => { if (list.length) prewarmAccountKernel(); return list; }), use: async id => { await use(id); return id === undefined ? workspace.state.kind !== 'active' : workspace.state.kind === 'active' && workspace.state.account.id === id; }, addAccount: () => { void shell.navigateTop({ page: 'account' }); } });
});
