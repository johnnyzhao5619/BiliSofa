import type {QueueStore} from '../../../../packages/contracts/src/local-queue.ts';
import {libraryQueueAction} from './library-queue-action.ts';
import {DomainError} from '../../../../packages/contracts/src/index.ts';
import {parseWatchLaterPage,type WatchLaterCard} from '../../../../packages/contracts/src/watch-later.ts';
import type {AccountWorkspace} from './account-workspace.ts';
import type {ResourceOwner} from './resource-owner.ts';
import type {TvShell} from './tv-shell.ts';
const availability={available:'源端正常',unavailable:'源端已失效',unknown:'状态未提供'} as const;
const kinds={ugc:'普通视频',pgc:'番剧/影视',unknown:'类型未提供'} as const;
/** Account lease and native close complete before a modal can be replaced. */
export function watchLater(owner:ResourceOwner,shell:TvShell,workspace:AccountWorkspace,queue?:QueueStore):HTMLElement{
 const section=document.createElement('section');section.className='watch-later-panel';
 const title=document.createElement('h2');title.textContent='稍后再看 · 只读';
 const status=document.createElement('p');status.setAttribute('role','status');status.tabIndex=-1;
 const list=document.createElement('div');list.className='watch-later-grid';
 const button=(id:string,label:string,action:()=>void)=>{const b=document.createElement('button');b.dataset.focusId=id;b.textContent=label;b.addEventListener('click',()=>{if(!owner.signal.aborted)action();});return b;};
 let page=1,busy=false,closed=true,pending:Promise<void>|undefined,nativePending:Promise<void>|undefined,controller:AbortController|undefined;
 const back=button('watch-later-back','返回账号管理',()=>{void shell.back();});
 const refresh=button('watch-later-refresh','刷新列表',()=>{void read(1);});
 const previous=button('watch-later-previous','上一页',()=>{if(page>1)void read(page-1);}),next=button('watch-later-next','下一页',()=>{if(page<25)void read(page+1);});previous.disabled=next.disabled=true;
 owner.add('watch-later-read',async()=>{controller?.abort();await nativePending;if(!closed)throw new DomainError('unknown');});
 function summary(card:WatchLaterCard){shell.openModal('watch-later-summary',summaryOwner=>{const panel=document.createElement('section');panel.className='watch-later-summary library-summary';const heading=document.createElement('h2');heading.id='watch-later-summary-heading';panel.setAttribute('aria-labelledby',heading.id);heading.textContent=card.title;const detail=document.createElement('p');detail.textContent=`${kinds[card.kind]} · ${availability[card.availability]} · ${card.partCount?`${card.partCount} 个分P`:'分P信息未提供'}`;panel.append(heading,detail,libraryQueueAction(summaryOwner,queue,card,card.availability==='available'),button('watch-later-summary-back','返回稍后再看',()=>{void shell.back();}));return panel;},'watch-later-summary-back');}
 function read(target:number):Promise<void>{
  if(busy||owner.signal.aborted)return Promise.resolve();busy=true;closed=true;controller=new AbortController();const current=controller;
  refresh.disabled=previous.disabled=next.disabled=true;list.replaceChildren();status.textContent='正在读取稍后再看';status.focus();
  pending=(async()=>{
   try{
    const result=await workspace.read(async(runtime,scope,signal)=>{
     if(!runtime.readWatchLater)throw new DomainError('unsupported');const abort=()=>current.abort();signal.addEventListener('abort',abort,{once:true});if(signal.aborted)current.abort();
     try{const operation=runtime.readWatchLater({page:target},scope,current.signal);nativePending=operation.then(()=>{},e=>{if(!(e instanceof DomainError)||e.code==='unknown')closed=false;});return await operation;}finally{signal.removeEventListener('abort',abort);}
    },parseWatchLaterPage);
    if(owner.signal.aborted)return;page=result.page;status.textContent=result.items.length?`第 ${page} 页 · 源端共 ${result.total} 项`:result.total===0?'稍后再看为空':'本页暂无项目';if(page===25&&!result.noMore)status.textContent+=' · 本内部包暂显示前100项';previous.disabled=page===1;next.disabled=result.noMore||page===25;
    result.items.forEach((card,i)=>{const node=button('watch-later-'+i,`${card.title} · ${availability[card.availability]}`,()=>summary(card)),id=(n:number)=>'watch-later-'+n;node.dataset.left=id(i%2?i-1:i);node.dataset.right=id(i%2===0&&i+1<result.items.length?i+1:i);node.dataset.up=i<2?'watch-later-refresh':id(i-2);node.dataset.down=i+2<result.items.length?id(i+2):!next.disabled?'watch-later-next':!previous.disabled?'watch-later-previous':'watch-later-refresh';list.append(node);});
   }catch(e){const code=e instanceof DomainError?e.code:'unknown';if(code==='unknown')closed=false;if(!owner.signal.aborted)status.textContent=code==='login'?'登录已失效，请重新扫码':code==='unknown'?'资源关闭未确认，请重新打开应用':`稍后再看读取失败（${code}），可返回或刷新`;}
   finally{busy=false;if(!owner.signal.aborted){refresh.disabled=!closed;(list.querySelector<HTMLButtonElement>('button')??(closed?refresh:back)).focus();}}
  })();return pending;
 }
 section.append(title,back,refresh,status,list,previous,next);void read(1);return section;
}
