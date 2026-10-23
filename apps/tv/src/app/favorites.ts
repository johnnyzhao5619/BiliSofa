import type {QueueStore} from '../../../../packages/contracts/src/local-queue.ts';
import {libraryQueueAction} from './library-queue-action.ts';
import {DomainError,type Scope} from '../../../../packages/contracts/src/index.ts';
import type {AccountRuntime} from '../../../../packages/contracts/src/private-account.ts';
import {parseFavoriteFoldersPage,parseFavoriteItemsPage,type FavoriteFolder,type FavoriteItem} from '../../../../packages/contracts/src/favorites.ts';
import type {AccountWorkspace} from './account-workspace.ts';
import type {ResourceOwner} from './resource-owner.ts';
import type {TvShell} from './tv-shell.ts';
const kinds={ugc:'普通视频',pgc:'番剧/影视',course:'课程',unknown:'类型未提供'} as const;
interface Page<T>{page:number;items:T[];total:number;noMore:boolean;complete?:boolean;}
type Read<T>=(runtime:AccountRuntime,scope:Scope,signal:AbortSignal,page:number,refresh:boolean)=>Promise<Page<T>>;
/** A new modal owns each level; parent DOM/focus is retained while its child opens. */
function panel<T>(owner:ResourceOwner,shell:TvShell,workspace:AccountWorkspace,id:string,label:string,backLabel:string,readPage:Read<T>,parse:(v:unknown)=>Page<T>,describe:(card:T)=>string,select:(card:T)=>void):HTMLElement{
 const section=document.createElement('section');section.className='favorites-panel';const heading=document.createElement('h2');heading.textContent=label;
 const status=document.createElement('p');status.setAttribute('role','status');status.tabIndex=-1;const list=document.createElement('div');list.className='favorites-grid';
 let page=1,busy=false,closed=true,nativePending:Promise<void>|undefined,controller:AbortController|undefined;
 const button=(key:string,text:string,action:()=>void)=>{const b=document.createElement('button');b.dataset.focusId=id+'-'+key;b.textContent=text;b.addEventListener('click',()=>{if(!owner.signal.aborted)action();});return b;};
 const back=button('back',backLabel,()=>{void shell.back();}),refresh=button('refresh','刷新列表',()=>{void read(1,true);}),previous=button('previous','上一页',()=>{if(page>1)void read(page-1);}),next=button('next','下一页',()=>{if(page<25)void read(page+1);});previous.disabled=next.disabled=true;
 owner.add(id+'-read',async()=>{controller?.abort();await nativePending;if(!closed)throw new DomainError('unknown');});
 async function read(target:number,fresh=false){
  if(busy||owner.signal.aborted)return;busy=true;closed=true;controller=new AbortController();const current=controller;refresh.disabled=previous.disabled=next.disabled=true;list.replaceChildren();status.textContent='正在读取'+label;status.focus();
  try{const result=await workspace.read(async(runtime,scope,signal)=>{const abort=()=>current.abort();signal.addEventListener('abort',abort,{once:true});if(signal.aborted)current.abort();try{const operation=readPage(runtime,scope,current.signal,target,fresh);nativePending=operation.then(()=>{},e=>{if(!(e instanceof DomainError)||e.code==='unknown')closed=false;});return await operation;}finally{signal.removeEventListener('abort',abort);}},parse);
   if(owner.signal.aborted)return;page=result.page;status.textContent=result.items.length?`第 ${page} 页 · 源端报告共 ${result.total} 项`:result.total===0?'列表为空':'本页暂无项目';if(result.complete===false)status.textContent+=' · 当前导航未返回全部收藏夹';if(page===25&&!result.noMore)status.textContent+=' · 本内部包暂限25页';previous.disabled=page===1;next.disabled=result.noMore||page===25;
   result.items.forEach((card,i)=>{const node=button('card-'+i,describe(card),()=>select(card)),key=(n:number)=>id+'-card-'+n;node.dataset.left=key(i%2?i-1:i);node.dataset.right=key(i%2===0&&i+1<result.items.length?i+1:i);node.dataset.up=i<2?id+'-refresh':key(i-2);node.dataset.down=i+2<result.items.length?key(i+2):!next.disabled?id+'-next':!previous.disabled?id+'-previous':id+'-refresh';list.append(node);});
  }catch(e){const code=e instanceof DomainError?e.code:'unknown';if(code==='unknown')closed=false;if(!owner.signal.aborted)status.textContent=code==='login'?'登录已失效，请重新扫码':code==='unknown'?'资源关闭未确认，请重新打开应用':`收藏读取失败（${code}），可返回或刷新`;}
  finally{busy=false;if(!owner.signal.aborted){refresh.disabled=!closed;(list.querySelector<HTMLButtonElement>('button')??(closed?refresh:back)).focus();}}
 }
 section.append(heading,back,refresh,status,list,previous,next);void read(1,true);return section;
}
export function favorites(owner:ResourceOwner,shell:TvShell,workspace:AccountWorkspace,queue?:QueueStore):HTMLElement{
 function summary(card:FavoriteItem){shell.openModal('favorite-summary',summaryOwner=>{const section=document.createElement('section');section.className='favorite-summary library-summary';const title=document.createElement('h2'),detail=document.createElement('p'),back=document.createElement('button');title.id='favorite-summary-heading';section.setAttribute('aria-labelledby',title.id);title.textContent=card.title;detail.textContent=`${kinds[card.kind]} · 源端提供 ${card.providedParts} 个分P信息`;back.textContent='返回收藏内容';back.dataset.focusId='favorite-summary-back';back.addEventListener('click',()=>{void shell.back();});section.append(title,detail,libraryQueueAction(summaryOwner,queue,card),back);return section;},'favorite-summary-back');}
 function items(folder:FavoriteFolder){shell.openModal('favorite-items',child=>panel<FavoriteItem>(child,shell,workspace,'favorite-items',folder.title,'返回收藏夹',async(runtime,scope,signal,page)=>{if(!runtime.readFavoriteItems)throw new DomainError('unsupported');return runtime.readFavoriteItems({folderKey:folder.key,page},scope,signal);},parseFavoriteItemsPage,card=>`${card.title} · ${kinds[card.kind]}`,summary),'favorite-items-back');}
 return panel<FavoriteFolder>(owner,shell,workspace,'favorite-folders','收藏夹 · 只读','返回账号管理',async(runtime,scope,signal,page,refresh)=>{if(!runtime.readFavoriteFolders)throw new DomainError('unsupported');return runtime.readFavoriteFolders({page,...(refresh?{refresh:true as const}:{})},scope,signal);},parseFavoriteFoldersPage,card=>`${card.title} · ${card.count} 项`,items);
}
