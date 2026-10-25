import {DomainError} from '../../../../packages/contracts/src/index.ts';
import type {PgcSearchCard} from '../../../../packages/contracts/src/pgc-search.ts';
import type {SearchHistoryStore} from '../../../../packages/contracts/src/search-history.ts';
import {SessionManager} from '../../../../packages/bili-client/src/session.ts';
import {KernelPgcSearch} from '../platform/public-lanes.ts';
import type {ResourceOwner} from './resource-owner.ts';
import type {TvShell} from './tv-shell.ts';
import type {AppDiagnostics} from './app-diagnostics.ts';
import {searchKeyword} from './search-keyword.ts';
import {historyPanel} from './search-history.ts';
/** Read-only search metadata. PGC playback/episodes remain a separate W04 owner. */
export function pgcSearch(owner:ResourceOwner,shell:TvShell,initialKeyword:string,history:SearchHistoryStore,diagnostics:AppDiagnostics,feedback:HTMLElement,openSeason?:(card:PgcSearchCard)=>void):HTMLElement {
 const section=document.createElement('section');section.className='pgc-search-panel';
 const title=document.createElement('h2');title.id='pgc-search-title';section.setAttribute('aria-labelledby',title.id);
 const status=document.createElement('p');status.setAttribute('role','status');status.tabIndex=-1;
 const list=document.createElement('div');list.className='pgc-search-grid';
 const worker=new KernelPgcSearch(),sessions=new SessionManager();owner.add('pgc-search-worker',async()=>{sessions.dispose();await worker.dispose();});
 let keyword=initialKeyword,page=1,busy=false,failedPage:number|undefined;
 const button=(id:string,label:string,action:()=>void)=>{const b=document.createElement('button');b.dataset.focusId=id;b.textContent=label;b.addEventListener('click',()=>{if(!owner.signal.aborted)action();});return b;};
 const back=button('pgc-search-back','返回',()=>{void shell.back();});
 const input=button('pgc-search-keyword','更换番剧搜索词',()=>{shell.openModal('pgc-keyword',inputOwner=>searchKeyword(inputOwner,shell,value=>{if(owner.signal.aborted)return;keyword=value;void read(1);},'番剧'),'keyword-key-a');});
 const historyButton=button('pgc-search-history','从历史选番剧关键词',()=>{shell.openModal('pgc-history',historyOwner=>historyPanel(historyOwner,shell,history,value=>{if(owner.signal.aborted)return;keyword=value;void read(1);}));});
 const retry=button('pgc-search-retry','重试番剧搜索',()=>{if(failedPage!==undefined)void read(failedPage);});retry.hidden=true;
 const previous=button('pgc-search-previous','上一页',()=>{if(page>1)void read(page-1);}),next=button('pgc-search-next','下一页',()=>{if(page<10)void read(page+1);});previous.disabled=next.disabled=true;
 function summary(card:PgcSearchCard):void{
  if(busy||owner.signal.aborted)return;
  if(openSeason){openSeason(card);return;}
  shell.openModal('pgc-search-summary',()=>{
   const detail=document.createElement('section');detail.className='pgc-search-summary';
   const heading=document.createElement('h2');heading.id='pgc-summary-title';heading.textContent=card.title;detail.setAttribute('aria-labelledby',heading.id);detail.append(heading);
   for(const label of [`番剧编号 ss${card.seasonId}`,`类型：${card.category||'未提供'} · 地区：${card.region||'未提供'}`,`题材：${card.tags||'未提供'}`,`更新：${card.status||'未提供'}`,`评分：${card.score===undefined?'未提供':card.score}`]){const p=document.createElement('p');p.textContent=label;detail.append(p);}
   detail.append(button('pgc-summary-back','返回番剧搜索结果',()=>{void shell.back();}));return detail;
  });
 }
 async function read(target:number):Promise<void>{
  if(busy||owner.signal.aborted)return;busy=true;failedPage=undefined;retry.hidden=true;retry.disabled=input.disabled=historyButton.disabled=previous.disabled=next.disabled=true;list.replaceChildren();title.textContent='番剧搜索：'+keyword;status.textContent='正在读取番剧';status.focus();
  sessions.invalidate();const task=sessions.begin('pgc-search');const abort=()=>sessions.invalidate();owner.signal.addEventListener('abort',abort,{once:true});
  try{
   if(history.remember(keyword)!=='saved'){feedback.textContent='搜索历史保存未确认，可在设置中核查';diagnostics.add('local','save_unconfirmed');}
   const result=await worker.run({version:1,scope:task.scope,operation:'public-pgc-search',keyword,page:target},task.signal);
   if(owner.signal.aborted||!sessions.accepts(task.scope))return;
   if(result.kind!=='ok'){failedPage=target;retry.hidden=false;retry.disabled=false;status.textContent=result.kind==='api_error'?`番剧搜索接口暂不可用（API ${result.apiCode}），可手动重试`:`番剧搜索读取失败（${result.code}），可手动重试`;return;}
   page=target;status.textContent=result.items.length?`第 ${page} 页`:'暂无番剧结果';previous.disabled=page===1;next.disabled=result.noMore||page===10;
   result.items.forEach((card,i)=>{
    const node=button('pgc-'+card.seasonId,`${card.title} · ${card.category||'番剧'} · ${card.status||'更新信息未提供'}`,()=>summary(card)),id=(j:number)=>'pgc-'+result.items[j]!.seasonId;
    node.dataset.left=id(i%2?i-1:i);node.dataset.right=id(i%2===0&&i+1<result.items.length?i+1:i);node.dataset.up=i<2?'pgc-search-keyword':id(i-2);node.dataset.down=i+2<result.items.length?id(i+2):!next.disabled?'pgc-search-next':!previous.disabled?'pgc-search-previous':'pgc-search-keyword';list.append(node);
   });
  }catch(error){if(!owner.signal.aborted){failedPage=target;retry.hidden=false;retry.disabled=false;status.textContent=error instanceof DomainError&&error.code==='unknown'?'资源关闭未确认，请重新打开应用':'番剧搜索未确认，可返回或手动重试';}}
  finally{owner.signal.removeEventListener('abort',abort);task.finish();busy=false;if(!owner.signal.aborted){input.disabled=historyButton.disabled=false;(failedPage!==undefined?retry:list.querySelector<HTMLButtonElement>('button')??input).focus();}}
 }
 section.append(title,back,input,historyButton,retry,status,list,previous,next);void read(1);return section;
}
