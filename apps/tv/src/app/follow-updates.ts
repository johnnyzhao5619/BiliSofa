import {DomainError} from '../../../../packages/contracts/src/index.ts';
import {parseFollowUpdatesPage,type FollowUpdate} from '../../../../packages/contracts/src/follow-updates.ts';
import type {AccountWorkspace} from './account-workspace.ts';
import type {ResourceOwner} from './resource-owner.ts';
import type {TvShell} from './tv-shell.ts';
const kinds={video:'视频更新',article:'专栏更新'} as const;
/** Account lease and native close complete before a modal can be replaced. */
export function followUpdates(owner:ResourceOwner,shell:TvShell,workspace:AccountWorkspace):HTMLElement{
 const section=document.createElement('section');section.className='follow-updates-panel';
 const title=document.createElement('h2');title.textContent='关注更新 · 只读';
 const status=document.createElement('p');status.setAttribute('role','status');status.tabIndex=-1;
 const list=document.createElement('div');list.className='follow-updates-grid';
 const button=(id:string,label:string,action:()=>void)=>{const b=document.createElement('button');b.dataset.focusId=id;b.textContent=label;b.addEventListener('click',()=>{if(!owner.signal.aborted)action();});return b;};
 let page=1,busy=false,closed=true,pending:Promise<void>|undefined,nativePending:Promise<void>|undefined,controller:AbortController|undefined;
 const back=button('follow-updates-back','返回账号管理',()=>{void shell.back();});
 const refresh=button('follow-updates-refresh','刷新列表',()=>{void read(1,true);});
 const previous=button('follow-updates-previous','上一页',()=>{if(page>1)void read(page-1);}),next=button('follow-updates-next','下一页',()=>{if(page<25)void read(page+1);});previous.disabled=next.disabled=true;
 owner.add('follow-updates-read',async()=>{controller?.abort();await nativePending;if(!closed)throw new DomainError('unknown');});
 function summary(card:FollowUpdate){shell.openModal('follow-updates-summary',()=>{const panel=document.createElement('section');panel.className='follow-updates-summary';const heading=document.createElement('h2');heading.textContent=card.title;const detail=document.createElement('p');detail.textContent=`${kinds[card.kind]} · ${card.author} · ${card.pubTime} · 网页导航更新摘要`;panel.append(heading,detail,button('follow-updates-summary-back','返回关注更新',()=>{void shell.back();}));return panel;});}
 function read(target:number,refreshFirst=false):Promise<void>{
  if(busy||owner.signal.aborted)return Promise.resolve();busy=true;closed=true;controller=new AbortController();const current=controller;
  refresh.disabled=previous.disabled=next.disabled=true;list.replaceChildren();status.textContent='正在读取关注更新';status.focus();
  pending=(async()=>{
   try{
    const result=await workspace.read(async(runtime,scope,signal)=>{
     if(!runtime.readFollowUpdates)throw new DomainError('unsupported');const abort=()=>current.abort();signal.addEventListener('abort',abort,{once:true});if(signal.aborted)current.abort();
     try{const operation=runtime.readFollowUpdates({page:target,...(refreshFirst?{refresh:true as const}:{})},scope,current.signal);nativePending=operation.then(()=>{},e=>{if(!(e instanceof DomainError)||e.code==='unknown')closed=false;});return await operation;}finally{signal.removeEventListener('abort',abort);}
    },parseFollowUpdatesPage);
    if(owner.signal.aborted)return;page=result.page;status.textContent=result.items.length?`第 ${page} 页 · 网页导航更新快照`:page===1?'暂无关注更新':'已到末尾，本页暂无记录';if(page===25&&!result.noMore)status.textContent+=' · 本内部包暂限25页';previous.disabled=page===1;next.disabled=result.noMore||page===25;
    result.items.forEach((card,i)=>{const node=button('follow-updates-'+i,`${card.title} · ${card.author} · ${kinds[card.kind]}`,()=>summary(card)),id=(n:number)=>'follow-updates-'+n;node.dataset.left=id(i%2?i-1:i);node.dataset.right=id(i%2===0&&i+1<result.items.length?i+1:i);node.dataset.up=i<2?'follow-updates-refresh':id(i-2);node.dataset.down=i+2<result.items.length?id(i+2):!next.disabled?'follow-updates-next':!previous.disabled?'follow-updates-previous':'follow-updates-refresh';list.append(node);});
   }catch(e){const code=e instanceof DomainError?e.code:'unknown';if(code==='unknown')closed=false;if(!owner.signal.aborted)status.textContent=code==='login'?'登录已失效，请重新扫码':code==='unknown'?'资源关闭未确认，请重新打开应用':`关注更新读取失败（${code}），可返回或刷新`;}
   finally{busy=false;if(!owner.signal.aborted){refresh.disabled=!closed;(list.querySelector<HTMLButtonElement>('button')??(closed?refresh:back)).focus();}}
  })();return pending;
 }
 section.append(title,back,refresh,status,list,previous,next);void read(1,true);return section;
}
