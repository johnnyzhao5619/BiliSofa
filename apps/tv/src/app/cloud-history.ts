import type {QueueStore} from '../../../../packages/contracts/src/local-queue.ts';
import {libraryQueueAction} from './library-queue-action.ts';
import {DomainError} from '../../../../packages/contracts/src/index.ts';
import {parseHistoryPage,type HistoryCard} from '../../../../packages/contracts/src/history.ts';
import type {AccountWorkspace} from './account-workspace.ts';
import type {ResourceOwner} from './resource-owner.ts';
import type {TvShell} from './tv-shell.ts';
const kinds={ugc:'普通视频',pgc:'番剧/影视',live:'直播',article:'专栏',course:'课程',unknown:'类型未提供'} as const;
const progress=(card:HistoryCard)=>card.progressSec===null?'未提供进度':card.progressSec===-1?'已看完':`记录进度 ${card.progressSec} 秒`;
/** Account lease and native close complete before a modal can be replaced. */
export function cloudHistory(owner:ResourceOwner,shell:TvShell,workspace:AccountWorkspace,queue?:QueueStore):HTMLElement{
 const section=document.createElement('section');section.className='cloud-history-panel';
 const title=document.createElement('h2');title.textContent='云端历史 · 只读';
 const status=document.createElement('p');status.setAttribute('role','status');status.tabIndex=-1;
 const list=document.createElement('div');list.className='cloud-history-grid';
 const button=(id:string,label:string,action:()=>void)=>{const b=document.createElement('button');b.dataset.focusId=id;b.textContent=label;b.addEventListener('click',()=>{if(!owner.signal.aborted)action();});return b;};
 let page=1,busy=false,closed=true,pending:Promise<void>|undefined,nativePending:Promise<void>|undefined,controller:AbortController|undefined;
 const back=button('cloud-history-back','返回账号管理',()=>{void shell.back();});
 const refresh=button('cloud-history-refresh','刷新列表',()=>{void read(1,true);});
 const previous=button('cloud-history-previous','上一页',()=>{if(page>1)void read(page-1);}),next=button('cloud-history-next','下一页',()=>{if(page<25)void read(page+1);});previous.disabled=next.disabled=true;
 owner.add('cloud-history-read',async()=>{controller?.abort();await nativePending;if(!closed)throw new DomainError('unknown');});
 function summary(card:HistoryCard){shell.openModal('cloud-history-summary',summaryOwner=>{const panel=document.createElement('section');panel.className='cloud-history-summary library-summary';const heading=document.createElement('h2');heading.id='cloud-history-summary-heading';panel.setAttribute('aria-labelledby',heading.id);heading.textContent=card.title;const detail=document.createElement('p');detail.textContent=`${kinds[card.kind]} · ${progress(card)} · ${card.durationSec===null?'时长未提供':`时长 ${card.durationSec} 秒`}${card.part===null?'':` · 第 ${card.part} P`} · 查看于 ${new Date(card.viewedAtSec*1000).toLocaleString('zh-CN')}`;panel.append(heading,detail,libraryQueueAction(summaryOwner,queue,card),button('cloud-history-summary-back','返回云端历史',()=>{void shell.back();}));return panel;},'cloud-history-summary-back');}
 function read(target:number,refreshFirst=false):Promise<void>{
  if(busy||owner.signal.aborted)return Promise.resolve();busy=true;closed=true;controller=new AbortController();const current=controller;
  refresh.disabled=previous.disabled=next.disabled=true;list.replaceChildren();status.textContent='正在读取云端历史';status.focus();
  pending=(async()=>{
   try{
    const result=await workspace.read(async(runtime,scope,signal)=>{
     if(!runtime.readHistory)throw new DomainError('unsupported');const abort=()=>current.abort();signal.addEventListener('abort',abort,{once:true});if(signal.aborted)current.abort();
     try{const operation=runtime.readHistory({page:target,...(refreshFirst?{refresh:true as const}:{})},scope,current.signal);nativePending=operation.then(()=>{},e=>{if(!(e instanceof DomainError)||e.code==='unknown')closed=false;});return await operation;}finally{signal.removeEventListener('abort',abort);}
    },parseHistoryPage);
    if(owner.signal.aborted)return;page=result.page;status.textContent=result.items.length?`第 ${page} 页 · 云端历史快照`:page===1?'云端历史为空或未记录':'已到末尾，本页暂无记录';if(page===25&&!result.noMore)status.textContent+=' · 本内部包暂限25页';previous.disabled=page===1;next.disabled=result.noMore||page===25;
    result.items.forEach((card,i)=>{const node=button('cloud-history-'+i,`${card.title} · ${kinds[card.kind]} · ${progress(card)}`,()=>summary(card)),id=(n:number)=>'cloud-history-'+n;node.dataset.left=id(i%2?i-1:i);node.dataset.right=id(i%2===0&&i+1<result.items.length?i+1:i);node.dataset.up=i<2?'cloud-history-refresh':id(i-2);node.dataset.down=i+2<result.items.length?id(i+2):!next.disabled?'cloud-history-next':!previous.disabled?'cloud-history-previous':'cloud-history-refresh';list.append(node);});
   }catch(e){const code=e instanceof DomainError?e.code:'unknown';if(code==='unknown')closed=false;if(!owner.signal.aborted)status.textContent=code==='login'?'登录已失效，请重新扫码':code==='unknown'?'资源关闭未确认，请重新打开应用':`云端历史读取失败（${code}），可返回或刷新`;}
   finally{busy=false;if(!owner.signal.aborted){refresh.disabled=!closed;(list.querySelector<HTMLButtonElement>('button')??(closed?refresh:back)).focus();}}
  })();return pending;
 }
 section.append(title,back,refresh,status,list,previous,next);void read(1,true);return section;
}
