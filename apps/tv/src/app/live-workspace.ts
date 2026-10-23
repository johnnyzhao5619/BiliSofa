import {DomainError,type MediaSource} from '../../../../packages/contracts/src/index.ts';
import type {LiveCard,LiveAccess} from '../../../../packages/contracts/src/live-product.ts';
import {LivePlayback} from '../../../../packages/media/src/live-playback.ts';
import type {OwnedPlayerBackend} from '../../../../packages/media/src/session.ts';
import {ResourceOwner} from './resource-owner.ts';
import type {TvShell} from './tv-shell.ts';
import type {AppDiagnostics} from './app-diagnostics.ts';
import type {OpenLive} from './live-reader.ts';
import {liveMessages} from './live-messages.ts';
export function liveWorkspace(owner:ResourceOwner,shell:TvShell,card:LiveCard,open:OpenLive,openMessages:()=>LiveAccess,backend:(source:MediaSource)=>OwnedPlayerBackend|undefined,diagnostics:AppDiagnostics):HTMLElement {
  if(!card.roomId)throw new DomainError('invalid');const roomId=card.roomId;
  const panel=document.createElement('section');panel.className='media-panel live-workspace-panel';const title=document.createElement('h2'),status=document.createElement('p'),source=document.createElement('p'),controls=document.createElement('div'),messages=document.createElement('div');title.textContent=`${card.title} · ${card.owner}`;status.setAttribute('role','status');
  const player=new LivePlayback(roomId,()=>open(true,owner.signal),backend);let messageOwner:ResourceOwner|undefined,messageBusy=false,messageUnsafe=false;
  const button=(id:string,label:string,action:()=>void)=>{const b=document.createElement('button');b.dataset.focusId=id;b.textContent=label;b.addEventListener('click',()=>{if(!owner.signal.aborted)action();});return b;};
  const back=button('live-player-back','停止直播并返回',()=>{void shell.back();});
  const reconnect=button('live-player-reconnect','重新连接直播',()=>{void player.reconnect().catch(()=>{});});
  const quality=button('live-player-quality','选择直播画质',()=>{const current=player.snapshot().catalog;if(!current||current.state!=='live')return;
    shell.openModal('live-quality',child=>{const node=document.createElement('section');node.className='live-quality-picker';const heading=document.createElement('h2'),grid=document.createElement('div'),paging=document.createElement('p');heading.textContent='源端可请求画质';grid.className='live-quality-grid';let page=0;
      const goBack=button('live-quality-back','返回直播',()=>{void shell.back();}),previous=button('live-quality-prev','上一组',()=>{page--;render();}),next=button('live-quality-next','下一组',()=>{page++;render();});
      function render(){if(child.signal.aborted)return;grid.replaceChildren();paging.textContent=`第${page+1}/${Math.ceil(current!.qualities.length/4)}组；将按实际返回的码流与播放器实际结果核对`;
        current!.qualities.slice(page*4,page*4+4).forEach((q,i)=>{const b=button('live-quality-'+i,q.label+(q.qn===current!.selectedQn?' · 当前源':''),()=>{void shell.back().then(()=>{if(!owner.signal.aborted)return player.select(q.qn);}).catch(()=>{});});grid.append(b);});previous.disabled=page===0;next.disabled=(page+1)*4>=current!.qualities.length;(grid.querySelector<HTMLButtonElement>('button')??goBack).focus();}
      node.append(heading,paging,grid,goBack,previous,next);render();return node;
    },'live-quality-0');
  });

  const toggle=button('live-player-messages','显示直播弹幕',()=>{void toggleMessages();});
  async function toggleMessages(){
    if(messageBusy||owner.signal.aborted)return;messageBusy=true;toggle.disabled=true;
    try{if(messageOwner){const closing=messageOwner;messageOwner=undefined;const result=await closing.close();messages.replaceChildren();if(!result.closed){messageUnsafe=true;throw new DomainError('unknown');}}
      else{const child=new ResourceOwner(13000);messageOwner=child;messages.append(liveMessages(child,openMessages,roomId));}
      toggle.textContent=messageOwner?'隐藏直播弹幕':'显示直播弹幕';
    }catch{status.textContent='弹幕资源关闭未确认，请停止直播并重新打开应用';messageUnsafe=true;}
    finally{messageBusy=false;if(!owner.signal.aborted){toggle.disabled=messageUnsafe;toggle.focus();}}
  }
  function update(){
    if(owner.signal.aborted)return;const s=player.snapshot(),cat=s.catalog;document.body.classList.toggle('playing-media',s.phase==='playing');
    source.textContent=cat?.state==='live'?`播放源：${cat.qualities.find(q=>q.qn===cat.selectedQn)?.label??cat.selectedQn} · ${cat.width}×${cat.height} · AVC / AAC · 直播不支持点播续播/跳转`:'';

    quality.disabled=!cat||cat.state!=='live'||['loading','recovering','closed'].includes(s.phase)||s.restartRequired;reconnect.disabled=['loading','recovering','closed'].includes(s.phase)||s.restartRequired;
    const detail=s.failurePhase==='source'&&s.source?`.${s.source.stage}_h${s.source.http}_c${s.source.curl<0?'na':s.source.curl}_n${s.source.node}`:'';
    const loading=s.source?.stage==='manifest'?`正在读取直播节点 ${s.source.node}（最多3个） 的清单`:s.source?.stage==='probe'?`正在检查直播节点 ${s.source.node}（最多3个） 的媒体分片`:s.source?.stage==='listener'?'直播源已通过检查，正在准备播放器':s.source?.stage==='api'?'正在读取直播状态与实际播放源':'正在核对直播状态、画质并准备播放';
    if(messageUnsafe)status.textContent='弹幕资源关闭未确认，请停止直播并重新打开应用';
    else status.textContent=s.restartRequired?'资源关闭未确认，请重新打开应用':s.phase==='offline'?'当前房间未开播，可返回或稍后手动刷新':s.phase==='error'?`直播播放失败（live.${s.failure??'unknown'}.${s.failurePhase??'unknown'}${detail}），可手动重连或返回`:s.phase==='recovering'?(s.notice||`直播连接中断，正在第${s.retries}/2次重新连接`):s.phase==='playing'?(s.notice||'正在直播'):s.notice||loading;
  }
  const abort=()=>{document.body.classList.remove('playing-media');void player.close();};owner.signal.addEventListener('abort',abort,{once:true});
  owner.add('live-playback',async()=>{owner.signal.removeEventListener('abort',abort);document.body.classList.remove('playing-media');const result=await player.close();diagnostics.add('media',result.closed?'closed':'close_unknown');if(!result.closed)throw new DomainError('unknown');});
  owner.add('live-messages',async()=>{const result=await messageOwner?.close();messageOwner=undefined;messages.replaceChildren();if(messageUnsafe||result&&!result.closed)throw new DomainError('unknown');});
  shell.modalInput(owner,{back(){if(messageOwner){void toggleMessages();return true;}return false;},key(){return false;}});
  const timer=setInterval(update,200);owner.add('live-view-timer',()=>clearInterval(timer));
  controls.append(back,quality,reconnect,toggle);panel.append(title,status,source,controls,messages);void player.start().catch(()=>{});diagnostics.add('media','started');update();return panel;
}
