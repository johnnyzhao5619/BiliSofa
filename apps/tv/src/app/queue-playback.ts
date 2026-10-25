import {vodWorkspace} from './vod-workspace.ts';
import type {VodCapabilities} from '../../../../packages/contracts/src/vod-catalog.ts';
import type {VodAccess} from '../../../../packages/contracts/src/vod-runtime.ts';
import {DomainError} from '../../../../packages/contracts/src/index.ts';
import {queuePart,type QueueItem} from '../../../../packages/contracts/src/local-queue.ts';
import type {ProfileStore} from '../../../../packages/contracts/src/local-profile.ts';
import {PlaybackQueue} from '../../../../packages/media/src/queue.ts';
import {MediaSession} from '../../../../packages/media/src/session.ts';
import {GuestPlayback} from '../platform/guest-playback.ts';
import {createGuestProbePlayer} from '../platform/samsung.ts';
import {LocalPlayback} from './local-playback.ts';
import {mediaFailureFeedback} from './media-failure-feedback.ts';
import type {AppDiagnostics} from './app-diagnostics.ts';
import type {TvShell} from './tv-shell.ts';
/** An explicit run owns an immutable queue snapshot and one global decoder at a time. */
export function queuePlayback(shell:TvShell,items:QueueItem[],index:number,continuous:boolean,profile:ProfileStore,diagnostics:AppDiagnostics,feedback:HTMLElement,vod?:{caps:VodCapabilities;open():Promise<VodAccess>}):void{
 if(vod){
  // Keep the immutable queue and original source order, but use the complete VOD
  // workspace. Each successor waits for this modal's real resource closure.
  const snapshot=items.map(item=>({...item})),item=snapshot[index];if(!item||snapshot.length>64)throw new DomainError('invalid');
  shell.openModal('queue-playback',owner=>{let advancing=false;return vodWorkspace(owner,shell,feedback,{bvid:item.bvid,part:queuePart(item)},profile,diagnostics,vod.caps,()=>vod.open(),source=>createGuestProbePlayer(source.url),undefined,false,undefined,{label:`本机队列 ${index+1}/${snapshot.length}`,continuous,...(index+1<snapshot.length?{next:(continueQueue:boolean)=>{if(advancing||owner.signal.aborted)return;advancing=true;void shell.closeOwnedModal(owner).then(()=>{if(!shell.restartRequired)queuePlayback(shell,snapshot,index+1,continueQueue,profile,diagnostics,feedback,vod);});}}:{})});},'vod-back');return;
 }
 shell.openModal('queue-playback',owner=>{
  const modal=document.createElement('section');modal.className='media-panel';const heading=document.createElement('h2'),timeline=document.createElement('p'),status=document.createElement('p'),controls=document.createElement('div'),resume=document.createElement('div');heading.id='queue-media-heading';modal.setAttribute('aria-labelledby',heading.id);timeline.setAttribute('role','timer');timeline.setAttribute('aria-live','off');status.setAttribute('role','status');
  const local=profile.read(),step=local.kind==='ok'?local.value.preferences.jumpSeconds:10,resumeRead=local.kind==='ok'&&local.value.preferences.resumePrompt?profile.readPart(items[index]!.bvid,queuePart(items[index]!)):undefined,saved=resumeRead?.kind==='ok'?resumeRead.value:undefined;
  const player=new PlaybackQueue(items,index,continuous,(item,finished)=>{const recorder=new LocalPlayback(profile,item.bvid,diagnostics,()=>{feedback.textContent='本地续播保存未确认';},undefined,queuePart(item),{title:item.title});if(queuePart(item)!==1)throw new DomainError('unsupported');return new MediaSession(new GuestPlayback(item.bvid),source=>createGuestProbePlayer(source.url),finished,13000,v=>recorder.observe(v));},(outcome,closure,failure)=>{
   diagnostics.add('media',closure.closed?outcome==='ended'?'ended':'failed':'close_unknown');if(failure)diagnostics.mediaFailure(failure);if(owner.signal.aborted)return;feedback.textContent=!closure.closed?'资源关闭未确认，请重新打开应用':outcome==='ended'?'本次队列播放结束':mediaFailureFeedback(failure);void shell.back();
  });
  const button=(id:string,label:string,action:()=>void)=>{const b=document.createElement('button');b.dataset.focusId=id;b.textContent=label;b.addEventListener('click',()=>{if(!owner.signal.aborted)action();});return b;};
  const back=button('queue-media-back','停止并返回',()=>{void shell.back();}),toggle=button('queue-media-toggle','暂停 / 继续',()=>player.toggle()),seek=button('queue-media-seek',`跳到 ${step} 秒`,()=>{void player.seek(step*1000).catch(()=>{});}),next=button('queue-media-next','下一项',()=>{void player.next().catch(()=>{});});
  let started=false;const begin=(at:number)=>{if(started||owner.signal.aborted)return;started=true;resume.remove();player.start(at);back.focus();update();};
  if(saved)resume.append(button('queue-resume-continue',`继续观看 · ${Math.floor(saved.timeMs/1000)} 秒`,()=>begin(saved.timeMs)),button('queue-resume-start','从头播放',()=>begin(0)));
  const update=()=>{if(owner.signal.aborted)return;const q=player.snapshot(),media=q.media,available=started&&!q.moving&&!!media&&['playing','paused'].includes(media.state)&&!media.seeking;heading.textContent=`${q.index+1}/${q.length} · ${q.item.title} · P${queuePart(q.item)}`;timeline.textContent=`${((media?.timeMs??0)/1000).toFixed(1)}${media?.durationMs?' / '+(media.durationMs/1000).toFixed(1):''} 秒 · 本机队列 · ${'匿名360P'} · P${queuePart(q.item)}`;status.textContent=!started?'是否继续上次在电视观看的位置？':q.moving?'正在关闭旧媒体并切换':media?.seeking?'正在跳转':media?.state==='playing'?'正在播放':media?.state==='paused'?'已暂停':media?.state==='preparing'?'正在准备':'正在获取播放源';toggle.disabled=seek.disabled=!available;next.disabled=!available||q.index+1>=q.length;if([toggle,seek,next].includes(document.activeElement as HTMLButtonElement)&&!available)back.focus();};
  controls.append(back,toggle,seek,next);modal.append(heading,timeline,status,resume,controls);document.body.classList.add('playing-media');owner.add('queue-style',()=>{document.body.classList.remove('playing-media');});owner.add('queue-media',async()=>{const r=await player.close();diagnostics.add('media',r.closed?'closed':'close_unknown');if(!r.closed)throw new DomainError('unknown');});const timer=setInterval(update,200);owner.add('queue-timer',()=>clearInterval(timer));if(!saved)begin(0);else update();return modal;
 });
}
