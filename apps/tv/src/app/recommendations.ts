import {DomainError} from '../../../../packages/contracts/src/index.ts';
import {parseRecommendationPage,RecommendationReadError,type RecommendationCard} from '../../../../packages/contracts/src/recommendations.ts';
import type {AccountWorkspace} from './account-workspace.ts';
import type {ResourceOwner} from './resource-owner.ts';
import type {TvShell} from './tv-shell.ts';
/** One account-owned read-only list; cached source pages never leak across identity. */
export function recommendations(owner:ResourceOwner,shell:TvShell,workspace:AccountWorkspace,play:(card:RecommendationCard)=>void):HTMLElement{
 const section=document.createElement('section');section.className='recommend-panel';const title=document.createElement('h2');title.textContent='当前账号推荐';const note=document.createElement('p');note.textContent='来自当前账号的官方网页推荐，结果可与手机端不同；游客热门和排行榜仍单独读取。';
 const status=document.createElement('p');status.setAttribute('role','status');status.tabIndex=-1;const list=document.createElement('div');list.className='recommend-grid';
 const button=(id:string,label:string,fn:()=>void)=>{const b=document.createElement('button');b.dataset.focusId=id;b.textContent=label;b.onclick=()=>{if(!owner.signal.aborted)fn();};return b;};
 let page=1,busy=false,closed=true,nativePending:Promise<void>|undefined,controller:AbortController|undefined;
 const back=button('recommend-back','返回首页',()=>{void shell.back();}),refresh=button('recommend-refresh','刷新账号推荐',()=>{void read(1,true);}),previous=button('recommend-previous','上一页',()=>{void read(page-1);}),next=button('recommend-next','下一页',()=>{void read(page+1);});previous.disabled=next.disabled=true;
 owner.add('recommend-read',async()=>{controller?.abort();await nativePending;if(!closed)throw new DomainError('unknown');});
 function read(target:number,fresh=false):Promise<void>{
  if(busy||owner.signal.aborted)return Promise.resolve();busy=true;closed=true;controller=new AbortController();const current=controller;refresh.disabled=previous.disabled=next.disabled=true;list.replaceChildren();status.textContent='正在读取当前账号推荐；超时可自动重试一次，可随时返回';status.focus();
  return(async()=>{
   try{const result=await workspace.read(async(runtime,scope,signal)=>{if(!runtime.readRecommendations)throw new DomainError('unsupported');const abort=()=>current.abort();signal.addEventListener('abort',abort,{once:true});if(signal.aborted)current.abort();try{const job=runtime.readRecommendations({page:target,...(fresh?{refresh:true as const}:{})},scope,current.signal);nativePending=job.then(()=>{},e=>{if(!(e instanceof DomainError)||e.code==='unknown')closed=false;});return await job;}finally{signal.removeEventListener('abort',abort);}},parseRecommendationPage);
    if(owner.signal.aborted)return;page=result.page;status.textContent=result.items.length?`第 ${page} 页 · 当前账号网页推荐`:page===1?'账号推荐暂无内容':'当前推荐已到末尾';if(result.omitted)status.textContent+=` · 本批${result.omitted}项非普通视频未展示`;if(result.firstPage>1)status.textContent+=` · 暂存最近32页，较早内容可刷新重新读取`;previous.disabled=page<=result.firstPage;next.disabled=result.noMore;
    result.items.forEach((card,i)=>{const b=button('recommend-'+i,`${card.title} · ${card.author}${card.durationSeconds>0?` · ${Math.floor(card.durationSeconds/60)}:${String(card.durationSeconds%60).padStart(2,'0')}`:''}${card.reason?' · '+card.reason:''}`,()=>play(card));const id=(n:number)=>'recommend-'+n;b.dataset.left=id(i%2?i-1:i);b.dataset.right=id(i%2===0&&i+1<result.items.length?i+1:i);b.dataset.up=i<2?'recommend-refresh':id(i-2);b.dataset.down=i+2<result.items.length?id(i+2):!next.disabled?'recommend-next':!previous.disabled?'recommend-previous':'recommend-back';list.append(b);});
   }catch(e){if(!(e instanceof DomainError)||e.code==='unknown')closed=false;if(!owner.signal.aborted)status.textContent=e instanceof DomainError&&e.code==='login'?'登录已失效，请回账号管理重新扫码':!closed?'资源关闭未确认，请重新打开应用':`账号推荐读取失败（${e instanceof RecommendationReadError?e.detail:'recommend.'+(e instanceof DomainError?e.code:'invalid')}），可刷新或返回`;}
   finally{busy=false;if(!owner.signal.aborted){refresh.disabled=!closed;(list.querySelector<HTMLButtonElement>('button')??(closed?refresh:back)).focus();}}
  })();
 }
 section.append(title,note,back,refresh,status,list,previous,next);void read(1);return section;
}
