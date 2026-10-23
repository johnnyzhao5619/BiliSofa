import {DomainError,type PopularCard} from '../../../../packages/contracts/src/index.ts';
import type {UserSearchCard} from '../../../../packages/contracts/src/user-search.ts';
import type {SearchHistoryStore} from '../../../../packages/contracts/src/search-history.ts';
import {SessionManager} from '../../../../packages/bili-client/src/session.ts';
import {UserSearchWorker} from '../platform/user-search-worker.ts';
import type {ResourceOwner} from './resource-owner.ts';
import type {TvShell} from './tv-shell.ts';
import type {AppDiagnostics} from './app-diagnostics.ts';
import {searchKeyword} from './search-keyword.ts';
import {historyPanel} from './search-history.ts';
/** UP identity and attached preview come only from the normalized search page. */
export function userSearch(owner:ResourceOwner,shell:TvShell,initialKeyword:string,history:SearchHistoryStore,diagnostics:AppDiagnostics,feedback:HTMLElement,play:(card:PopularCard)=>void):HTMLElement {
  const section=document.createElement('section');section.className='user-search-panel';
  const title=document.createElement('h2');title.id='user-search-title';section.setAttribute('aria-labelledby',title.id);
  const status=document.createElement('p');status.setAttribute('role','status');status.tabIndex=-1;
  const list=document.createElement('div');list.className='user-search-grid';
  const worker=new UserSearchWorker(),sessions=new SessionManager();owner.add('user-search-worker',async()=>{sessions.dispose();await worker.dispose();});
  let keyword=initialKeyword,page=1,busy=false,failedPage:number|undefined;
  const button=(id:string,label:string,action:()=>void)=>{const node=document.createElement('button');node.dataset.focusId=id;node.textContent=label;node.addEventListener('click',()=>{if(!owner.signal.aborted)action();});return node;};
  const back=button('user-search-back','返回',()=>{void shell.back();});
  const input=button('user-search-keyword','更换UP搜索词',()=>{shell.openModal('user-keyword',inputOwner=>searchKeyword(inputOwner,shell,value=>{if(owner.signal.aborted)return;keyword=value;void read(1);},'UP主'),'keyword-key-a');});
  const historyButton=button('user-search-history','从历史选UP关键词',()=>{shell.openModal('user-history',historyOwner=>historyPanel(historyOwner,shell,history,value=>{if(owner.signal.aborted)return;keyword=value;void read(1);}));});
  const retry=button('user-search-retry','重试UP搜索',()=>{if(failedPage!==undefined)void read(failedPage);});retry.hidden=true;
  const previous=button('user-search-previous','上一页',()=>{if(page>1)void read(page-1);}),next=button('user-search-next','下一页',()=>{if(page<10)void read(page+1);});previous.disabled=next.disabled=true;
  function summary(card:UserSearchCard):void{
    if(busy||owner.signal.aborted)return;
    shell.openModal('user-search-summary',detailOwner=>{
      const detail=document.createElement('section');detail.className='user-search-summary';
      const heading=document.createElement('h2');heading.id='user-summary-title';heading.textContent=card.name;detail.setAttribute('aria-labelledby',heading.id);
      const counts=document.createElement('p');counts.textContent=`UID ${card.uid} · ${card.videos} 投稿 · ${card.fans} 粉丝`;
      const close=button('user-summary-back','返回UP搜索结果',()=>{void shell.back();});
      const note=document.createElement('p');note.textContent=card.preview?'搜索附带的视频预览':'这次搜索没有附带视频预览';detail.append(heading,counts,close,note);
      if(card.preview){const preview=card.preview;detail.append(button('user-preview-'+preview.bvid,`${preview.title} · ${preview.durationSec} 秒`,()=>{if(!detailOwner.signal.aborted)play(preview);}));}
      return detail;
    });
  }
  async function read(target:number):Promise<void>{
    if(busy||owner.signal.aborted)return;busy=true;failedPage=undefined;retry.hidden=true;retry.disabled=input.disabled=historyButton.disabled=previous.disabled=next.disabled=true;list.replaceChildren();title.textContent='UP主搜索：'+keyword;status.textContent='正在读取UP主';status.focus();
    sessions.invalidate();const task=sessions.begin('user-search');const abort=()=>sessions.invalidate();owner.signal.addEventListener('abort',abort,{once:true});
    try{
      if(history.remember(keyword)!=='saved'){feedback.textContent='搜索历史保存未确认，可在设置中核查';diagnostics.add('local','save_unconfirmed');}
      const result=await worker.run({version:1,scope:task.scope,operation:'public-user-search',keyword,page:target},task.signal);
      if(owner.signal.aborted||!sessions.accepts(task.scope))return;
      if(result.kind!=='ok'){
        failedPage=target;retry.hidden=false;retry.disabled=false;
        status.textContent=result.kind==='api_error'?`UP主搜索接口暂不可用（API ${result.apiCode}），可手动重试`:`UP主搜索读取失败（${result.code}），可手动重试`;return;
      }
      page=target;status.textContent=result.items.length?`第 ${page} 页`:'暂无UP主结果';previous.disabled=page===1;next.disabled=result.noMore||page===10;
      result.items.forEach((card,i)=>{
        const node=button('user-'+card.uid,`${card.name} · ${card.videos} 投稿 · ${card.fans} 粉丝`,()=>summary(card)),id=(j:number)=>'user-'+result.items[j]!.uid;
        node.dataset.left=id(i%2?i-1:i);node.dataset.right=id(i%2===0&&i+1<result.items.length?i+1:i);node.dataset.up=i<2?'user-search-keyword':id(i-2);node.dataset.down=i+2<result.items.length?id(i+2):!next.disabled?'user-search-next':!previous.disabled?'user-search-previous':'user-search-keyword';list.append(node);
      });
    }catch(error){if(!owner.signal.aborted){failedPage=target;retry.hidden=false;retry.disabled=false;status.textContent=error instanceof DomainError&&error.code==='unknown'?'资源关闭未确认，请重新打开应用':'UP主搜索未确认，可返回或手动重试';}}
    finally{owner.signal.removeEventListener('abort',abort);task.finish();busy=false;if(!owner.signal.aborted){input.disabled=historyButton.disabled=false;(failedPage!==undefined?retry:list.querySelector<HTMLButtonElement>('button')??input).focus();}}
  }
  section.append(title,back,input,historyButton,retry,status,list,previous,next);void read(1);return section;
}
