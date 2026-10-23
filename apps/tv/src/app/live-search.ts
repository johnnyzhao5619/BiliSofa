import {DomainError} from '../../../../packages/contracts/src/index.ts';
import type {LiveSearchCard,LiveRoomState} from '../../../../packages/contracts/src/live-search.ts';
import type {SearchHistoryStore} from '../../../../packages/contracts/src/search-history.ts';
import {SessionManager} from '../../../../packages/bili-client/src/session.ts';
import {LiveSearchWorker} from '../platform/live-search-worker.ts';
import type {ResourceOwner} from './resource-owner.ts';
import type {TvShell} from './tv-shell.ts';
import type {AppDiagnostics} from './app-diagnostics.ts';
import {searchKeyword} from './search-keyword.ts';
import {historyPanel} from './search-history.ts';
/** Public room snapshot only. Live media has its own W04 owner. */
const stateLabel=(value:LiveRoomState)=>({live:'直播中',unknown:'未确认'} as const)[value];
export function liveSearch(owner:ResourceOwner,shell:TvShell,initialKeyword:string,history:SearchHistoryStore,diagnostics:AppDiagnostics,feedback:HTMLElement,play?:(card:LiveSearchCard)=>void):HTMLElement {
 const section=document.createElement('section');section.className='live-search-panel';
 const title=document.createElement('h2');title.id='live-search-title';section.setAttribute('aria-labelledby',title.id);
 const status=document.createElement('p');status.setAttribute('role','status');status.tabIndex=-1;
 const list=document.createElement('div');list.className='live-search-grid';
 const worker=new LiveSearchWorker(),sessions=new SessionManager();owner.add('live-search-worker',async()=>{sessions.dispose();await worker.dispose();});
 let keyword=initialKeyword,page=1,busy=false,failedPage:number|undefined;
 const button=(id:string,label:string,action:()=>void)=>{const b=document.createElement('button');b.dataset.focusId=id;b.textContent=label;b.addEventListener('click',()=>{if(!owner.signal.aborted)action();});return b;};
 const back=button('live-search-back','返回',()=>{void shell.back();});
 const input=button('live-search-keyword','更换直播搜索词',()=>{shell.openModal('live-keyword',inputOwner=>searchKeyword(inputOwner,shell,value=>{if(owner.signal.aborted)return;keyword=value;void read(1);},'直播'),'keyword-key-a');});
 const historyButton=button('live-search-history','从历史选直播关键词',()=>{shell.openModal('live-history',historyOwner=>historyPanel(historyOwner,shell,history,value=>{if(owner.signal.aborted)return;keyword=value;void read(1);}));});
 const retry=button('live-search-retry','重试直播搜索',()=>{if(failedPage!==undefined)void read(failedPage);});retry.hidden=true;
 const previous=button('live-search-previous','上一页',()=>{if(page>1)void read(page-1);}),next=button('live-search-next','下一页',()=>{if(page<10)void read(page+1);});previous.disabled=next.disabled=true;
 function summary(card:LiveSearchCard):void{
  if(busy||owner.signal.aborted)return;
  shell.openModal('live-search-summary',()=>{
   const detail=document.createElement('section');detail.className='live-search-summary';
   const heading=document.createElement('h2');heading.id='live-summary-title';heading.textContent=card.title;detail.setAttribute('aria-labelledby',heading.id);detail.append(heading);
   for(const label of [`房间号 ${card.roomId}`,`主播：${card.owner}`,`分区：${card.category||'未提供'}`,`标签：${card.tags||'未提供'}`,`搜索时状态：${stateLabel(card.state)} · 人气 ${card.popularity}`]){const p=document.createElement('p');p.textContent=label;detail.append(p);}
   detail.append(button('live-summary-back','返回直播搜索结果',()=>{void shell.back();}));if(play)detail.append(button('live-summary-play','播放直播',()=>play(card)));return detail;
  });
 }
 async function read(target:number):Promise<void>{
  if(busy||owner.signal.aborted)return;busy=true;failedPage=undefined;retry.hidden=true;retry.disabled=input.disabled=historyButton.disabled=previous.disabled=next.disabled=true;list.replaceChildren();title.textContent='直播搜索：'+keyword;status.textContent='正在读取直播';status.focus();
  sessions.invalidate();const task=sessions.begin('live-search');const abort=()=>sessions.invalidate();owner.signal.addEventListener('abort',abort,{once:true});
  try{
   if(history.remember(keyword)!=='saved'){feedback.textContent='搜索历史保存未确认，可在设置中核查';diagnostics.add('local','save_unconfirmed');}
   const result=await worker.run({version:1,scope:task.scope,operation:'public-live-search',keyword,page:target},task.signal);
   if(owner.signal.aborted||!sessions.accepts(task.scope))return;
   if(result.kind!=='ok'){failedPage=target;retry.hidden=false;retry.disabled=false;status.textContent=result.kind==='api_error'?`直播搜索接口暂不可用（API ${result.apiCode}），可手动重试`:`直播搜索读取失败（${result.code}），可手动重试`;return;}
   page=target;status.textContent=result.items.length?`第 ${page} 页 · 搜索快照`:'暂无直播结果';previous.disabled=page===1;next.disabled=result.noMore||page===10;
   result.items.forEach((card,i)=>{
    const node=button('live-'+card.roomId,`${card.title} · ${card.owner} · ${stateLabel(card.state)}`,()=>summary(card)),id=(j:number)=>'live-'+result.items[j]!.roomId;
    node.dataset.left=id(i%2?i-1:i);node.dataset.right=id(i%2===0&&i+1<result.items.length?i+1:i);node.dataset.up=i<2?'live-search-keyword':id(i-2);node.dataset.down=i+2<result.items.length?id(i+2):!next.disabled?'live-search-next':!previous.disabled?'live-search-previous':'live-search-keyword';list.append(node);
   });
  }catch(error){if(!owner.signal.aborted){failedPage=target;retry.hidden=false;retry.disabled=false;status.textContent=error instanceof DomainError&&error.code==='unknown'?'资源关闭未确认，请重新打开应用':'直播搜索未确认，可返回或手动重试';}}
  finally{owner.signal.removeEventListener('abort',abort);task.finish();busy=false;if(!owner.signal.aborted){input.disabled=historyButton.disabled=false;(failedPage!==undefined?retry:list.querySelector<HTMLButtonElement>('button')??input).focus();}}
 }
 section.append(title,back,input,historyButton,retry,status,list,previous,next);void read(1);return section;
}
