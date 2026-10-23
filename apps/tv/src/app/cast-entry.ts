import {PRODUCT_BROWSE} from '../ui/continuous-grid.ts';
import {castIdentity,castInstructions} from './cast-visuals.ts';
import {PlayerPresentation,PRODUCT_PLAYER} from './player-presentation.ts';
import {VodControls} from './vod-controls.ts';
import {SeekPreview} from '../../../../packages/media/src/seek-preview.ts';
import { DomainError } from '../../../../packages/contracts/src/index.ts';
import { WorkerReceiverLink } from '../platform/receiver-link.ts';
import { createCastProbePlayer } from '../platform/samsung.ts';
import { CastWorkspace } from './cast-workspace.ts';
import type { AppDiagnostics } from './app-diagnostics.ts';
import type { ResourceOwner } from './resource-owner.ts';
import type { TvShell } from './tv-shell.ts';
declare const BILISOFA_W06:boolean;
declare const BILISOFA_PRODUCT_CAST_SEEK:boolean;
declare const BILISOFA_PRODUCT_CAST_CLOCK:boolean;
const idempotentPosition=typeof BILISOFA_PRODUCT_CAST_CLOCK!=='undefined'&&BILISOFA_PRODUCT_CAST_CLOCK;
const nativePlayingSeek=typeof BILISOFA_PRODUCT_CAST_SEEK!=='undefined'&&BILISOFA_PRODUCT_CAST_SEEK;
const product=typeof BILISOFA_W06!=='undefined'&&BILISOFA_W06;
/** TV confirmation is the entry action. It authorizes only this foreground
 * bounded receiver, never silently converts the selected TV account into sender identity. */
export function castEntry(owner: ResourceOwner, shell: TvShell, feedback: HTMLElement, jumpSeconds = 5, diagnostics?: AppDiagnostics): HTMLButtonElement {
  const entry = document.createElement('button'); entry.dataset.focusId = 'cast-entry'; entry.textContent = '允许本次官方投屏会话';
  entry.addEventListener('click', () => {
    if (owner.signal.aborted) return;
    shell.openModal('official-cast', modalOwner => {
      const modal = document.createElement('section'); modal.className = 'cast-panel';
      const title = document.createElement('h2'); title.id = 'cast-heading'; title.textContent = '官方 App 投屏'; modal.setAttribute('aria-labelledby', title.id);
      const note = document.createElement('p'); note.textContent = product?'同网官方哔哩哔哩 App → 视频内 TV → BiliSofa。仅前台接收，电视账号与手机账号独立。':'同网官方哔哩哔哩 App → 视频内 TV → BiliSofa W01 Discovery';
      const limits = document.createElement('p'); limits.className = 'cast-limits'; limits.textContent = product?'首个发送端拥有本次会话；遥控接管后可交还手机。更换手机需电视确认；Home或返回结束接收。源到期/断连后可重新开启，并用手机重新投送。':'内部检查：最长5分钟，最多4个媒体源。返回或Home结束接收。';
      const status = document.createElement('p'); status.setAttribute('role', 'status');
      const timeline = document.createElement('p'); timeline.setAttribute('role', 'timer'); timeline.setAttribute('aria-live', 'off');
      const controls = document.createElement('div');
      const button = (id: string, label: string, action: () => void) => { const b = document.createElement('button'); b.dataset.focusId = id; b.textContent = label; b.addEventListener('click', action); controls.append(b); return b; };
      const waiting=document.createElement('div');waiting.className='tv-cast-standby';waiting.hidden=true;
      const waitReceiver=document.createElement('div');waitReceiver.className='tv-cast-receiver';const waitState=document.createElement('p');waitState.className='tv-cast-state';waitState.setAttribute('role','status');const waitDetail=document.createElement('p');waitDetail.className='tv-cast-hint';
      const waitingEnd=document.createElement('button');waitingEnd.dataset.focusId='cast-waiting-end';waitingEnd.textContent='结束接收';waitingEnd.onclick=()=>{void shell.closeOwnedModal(modalOwner);};const waitingRetry=document.createElement('button');waitingRetry.dataset.focusId='cast-waiting-restart';waitingRetry.textContent='重新开始接收';waitingRetry.onclick=()=>{void restart();};
      const foreground=document.createElement('p');foreground.className='tv-cast-hint';foreground.textContent='保持此页面等待手机。Home或结束接收会停止；电视账号与手机账号独立。';
      waitReceiver.append(castIdentity(),waitState,waitDetail,waitingRetry,waitingEnd,foreground);waiting.append(waitReceiver,castInstructions());
      let ticket=0,restarting=false,blocked=false,ended=false,terminal='';
      let workspace:CastWorkspace;
      const create=()=>{const epoch=++ticket;return new CastWorkspace(new WorkerReceiverLink(product), createCastProbePlayer, (error, closure) => {
        if(epoch!==ticket)return;
        diagnostics?.add('cast', !closure.closed ? 'close_unknown' : error ? 'failed' : 'ended');
        if (modalOwner.signal.aborted) return;
        feedback.textContent = !closure.closed ? '投屏资源关闭未确认，请重新打开应用' : error === 'unsupported' ? '需要电视媒体能力与普通局域网连接' : error ? '投屏已停止，可重新允许会话后重试' : '投屏会话已结束';
        if(product){blocked=!closure.closed;ended=true;terminal=!closure.closed?'关闭未确认，请重新打开应用':error?'投屏连接或源读取中断；可重新开启接收，再从手机重新投送':'会话已停止，可重新开启接收';update();}
        else void shell.back();
      },undefined,6000,product,fact=>{if(epoch===ticket)diagnostics?.add('cast',fact);},nativePlayingSeek,idempotentPosition);};workspace=create();
      async function restart(){if(restarting||blocked||modalOwner.signal.aborted)return;restarting=true;terminal='正在结束旧会话';update();const old=workspace;const result=await old.close();if(modalOwner.signal.aborted)return;if(!result.closed){blocked=true;ended=true;terminal='关闭未确认，请重新打开应用';}else{ticket++;workspace=create();ended=false;terminal='';workspace.start();}restarting=false;update();}
      const restartButton=button('cast-restart','重新开启接收',()=>{void restart();});restartButton.hidden=!product;
      const takeover=button('cast-replace-sender','允许其他手机接管',()=>{shell.openModal('cast-replace-confirm',child=>{const node=document.createElement('section'),h=document.createElement('h2'),p=document.createElement('p');h.textContent='更换投屏发送端';p.textContent='确认后停止当前声画和接收，清除当前发送端控制权；请在新手机重新选择 BiliSofa。';const cancel=document.createElement('button'),yes=document.createElement('button');cancel.dataset.focusId='cast-replace-cancel';cancel.textContent='取消，保持当前会话';cancel.onclick=()=>{void shell.back();};yes.dataset.focusId='cast-replace-yes';yes.textContent='确认结束旧会话并重新接收';yes.onclick=()=>{if(child.signal.aborted)return;yes.disabled=true;void shell.closeOwnedModal(child).then(()=>restart());};node.append(h,p,cancel,yes);return node;},'cast-replace-cancel');});takeover.hidden=!product;
      const back = button('cast-back', '结束会话', () => { if(PRODUCT_PLAYER)void shell.closeOwnedModal(modalOwner);else void shell.back(); });
      const toggle = button('cast-toggle', '遥控暂停 / 继续', () => workspace.toggle());
      const seek = button('cast-seek', `遥控跳到 ${jumpSeconds} 秒`, () => { void workspace.seek(jumpSeconds * 1000).catch(() => {}); });
      const handBack = button('cast-handback', '交还手机控制', () => workspace.handBack());
      modalOwner.add('cast-style', () => { document.body.classList.remove('playing-media'); });
      modalOwner.add('cast-session', async () => { const result = await workspace.close(); diagnostics?.add('cast', result.closed ? 'closed' : 'close_unknown'); if (!result.closed) throw new DomainError('unknown'); });
      function update() {
        if (modalOwner.signal.aborted) return;
        const value = workspace.status(), active = !ended&&!restarting&&['playing','paused','idle','preparing'].includes(value.phase)&&(!PRODUCT_BROWSE||value.phase!=='idle');
        document.body.classList.toggle('playing-media', active); modal.classList.toggle('media-panel', active);
        const playable = !ended&&!restarting&&['playing','paused'].includes(value.phase) && !value.seeking;restartButton.hidden=!product||!ended;restartButton.disabled=blocked||restarting;takeover.disabled=blocked||restarting||ended;
        toggle.disabled = !playable; seek.disabled = !playable; handBack.disabled = !playable || value.controller !== 'remote';
        if ([toggle, seek, handBack,takeover,restartButton].includes(document.activeElement as HTMLButtonElement) && (document.activeElement as HTMLButtonElement).disabled) back.focus();
        status.textContent = value.seeking ? '正在跳转' : ({starting:'正在开启接收',waiting:'等待手机投送',checking:'正在检查播放源',switching:'正在切换媒体',preparing:'正在准备',playing:'正在播放',paused:'已暂停',idle:'媒体已停止，可在手机重新播放',closing:'正在关闭',closed:'会话已结束'} as const)[value.phase];
        if ((value.phase === 'preparing' || value.seeking) && value.initializationMib > 8) status.textContent = `正在读取较大索引 · 已接收${value.receivedMib} MiB · 可随时返回`;
        if (playable) status.textContent += value.controller === 'remote' ? ' · 遥控器控制中' : ' · 手机控制中';
        if(terminal)status.textContent=terminal;
        if(PRODUCT_PLAYER){if(generation!==value.generation){preview.cancel();generation=value.generation;}commit.hidden=cancel.hidden=preview.targetMs===undefined;commit.disabled=cancel.disabled=!playable;presentation?.update(value.timeMs,value.durationMs,playable,value.controller==='remote'?'官方投屏 · 遥控器控制':'官方投屏 · 手机控制');modal.classList.toggle('tv-cast-waiting',!active);note.hidden=limits.hidden=active;if(!active&&modal.classList.contains('vod-controls-hidden')){layer?.update(false,true);}layer?.update(value.phase==='playing',!playable||!!presentation?.moreOpen||preview.targetMs!==undefined);}
        if(PRODUCT_BROWSE){
          waiting.hidden=active;content.hidden=!active||modal.classList.contains('vod-controls-hidden');modal.classList.toggle('tv-cast-standby-panel',!active);
          waitState.textContent=ended?'接收已结束':value.phase==='starting'?'正在开启接收':value.phase==='waiting'?'等待手机投送':value.phase==='idle'?'等待下一段视频':'正在连接手机内容';waitDetail.textContent=status.textContent;
          waitingRetry.hidden=!ended;waitingRetry.disabled=blocked||restarting;
          const available=[waitingRetry,waitingEnd].filter(b=>!b.hidden&&!b.disabled);available.forEach((b,i)=>{b.dataset.left=available[i-1]?.dataset.focusId??b.dataset.focusId;b.dataset.right=available[i+1]?.dataset.focusId??b.dataset.focusId;b.dataset.up=b.dataset.down=b.dataset.focusId;});
          if(active&&waiting.contains(document.activeElement))back.focus();else if(!active&&content.contains(document.activeElement))(available[0]??waitingEnd).focus();
        }
        if(!PRODUCT_PLAYER)timeline.textContent = active ? `${(value.timeMs / 1000).toFixed(1)} / ${(value.durationMs / 1000).toFixed(1)} 秒 · 第${value.generation}个媒体源` : '';
      }
      modal.append(title,note,limits,status,timeline,controls);
      const content=document.createElement('div'),wake=document.createElement('button');wake.dataset.focusId='cast-show-controls';wake.className='vod-wake';wake.textContent='显示播放控制';wake.hidden=true;
      const preview=new SeekPreview(()=>workspace.status().durationMs,()=>workspace.status().timeMs);
      let generation=0;
      const commit=button('cast-seek-confirm','确认跳转',()=>{void preview.confirm(ms=>workspace.seek(ms)).catch(()=>{});update();});
      const cancel=button('cast-seek-cancel','取消预览',()=>{preview.cancel();update();});
      let presentation:PlayerPresentation|undefined,layer:VodControls|undefined;
      if(PRODUCT_PLAYER){presentation=new PlayerPresentation(modalOwner,modal,title,timeline,status,controls,['cast-restart','cast-back','cast-toggle','cast-handback','cast-seek-confirm','cast-seek-cancel'],{preview:delta=>{if(!toggle.disabled){preview.move(delta);update();}},confirm:()=>{if(!commit.disabled)commit.click();},target:()=>preview.targetMs,stepMs:()=>jumpSeconds*1000});layer=new VodControls(modalOwner,modal,content,wake,()=>!presentation?.moreOpen&&!toggle.disabled);shell.modalInput(modalOwner,{back:()=>{if(preview.targetMs!==undefined){preview.cancel();update();return true;}return presentation?.back()||layer?.back()||false;},key:event=>layer?.key(event)||presentation?.key(event)||false,
        // Play/Pause is the same real control command as the remote toggle (takeover rules apply); Stop/seek keys never alter the phone session implicitly.
        media:command=>{if(command==='play-pause'&&!toggle.disabled)toggle.click();return true;}});}
      modal.append(waiting);
      const timer = setInterval(update, 200); modalOwner.add('cast-status', () => clearInterval(timer));
      if(PRODUCT_PLAYER){content.append(title.closest('.tv-player-heading')??title,note,limits,status,...(timeline.previousElementSibling?.classList.contains('tv-player-seek')?[timeline.previousElementSibling]:[]),timeline,controls);modal.append(content,wake);}else{commit.hidden=cancel.hidden=true;modal.append(title,note,limits,status,timeline,controls);} workspace.start(); diagnostics?.add('cast','started'); update(); return modal;
    });
  }); return entry;
}
