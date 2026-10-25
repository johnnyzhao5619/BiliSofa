import { DomainError } from '../../../../packages/contracts/src/index.ts';
import type { CommentAccess, CommentCard, CommentPage, CommentSort } from '../../../../packages/contracts/src/comments-dto.ts';
import type { ResourceOwner } from './resource-owner.ts';
import type { TvShell } from './tv-shell.ts';
/** Single-column reading (ADR-092): at most this many pages are appended per list. */
const READ_PAGES = 10;
/** A single optional readonly lane. Does not pause, seek or reopen the player. */
export function vodComments(shell:TvShell,open:()=>CommentAccess,valid:()=>boolean):void {
 shell.openModal('vod-comments',owner=>{
  let access:CommentAccess|undefined;const nodes=new Set<HTMLElement>();
  const alive=(child:ResourceOwner)=>!child.signal.aborted&&!owner.signal.aborted&&valid();
  const get=()=>access??=open();
  owner.add('comments-read',async()=>{await access?.close();});
  const guard=setInterval(()=>{if(owner.signal.aborted||valid())return;for(const node of nodes){node.inert=true;node.replaceChildren();}void shell.closeOwnedBranch(owner);},200);owner.add('comments-source-guard',()=>clearInterval(guard));
  function button(child:ResourceOwner,id:string,label:string,run:()=>void):HTMLButtonElement {const b=document.createElement('button');b.dataset.focusId=id;b.textContent=label;b.onclick=()=>{if(alive(child))run();};return b;}
  function detail(item:CommentCard,isReply:boolean):void {
   // A reply opened from the reply lane is a distinct layer above its root's detail.
   shell.openModal(isReply?'comment-reply-detail':'comment-detail',reader=>{
    const node=document.createElement('section');node.className='comment-detail-panel';nodes.add(node);reader.add('comment-node',()=>{nodes.delete(node);});
    const h=document.createElement('h2'),meta=document.createElement('p'),body=document.createElement('article');h.textContent=item.author;meta.textContent=`${new Date(item.createdAt*1000).toLocaleDateString('zh-CN')} · ${item.likes}赞 · ${item.replies}回复${item.pinned?' · 置顶':''}`;body.textContent=item.text;body.tabIndex=0;body.dataset.focusId='comment-text';body.className='comment-full-text';body.setAttribute('aria-label','评论正文，方向上下滚动');
    const back=button(reader,'comment-detail-back','返回阅读列表',()=>{void shell.back();});node.append(h,meta,body,back);
    if(!isReply&&item.replies>0)node.append(button(reader,'comment-replies','查看楼中楼回复',()=>{shell.openModal('comment-replies',replies=>list(replies,item),'comments-back');}));
    shell.modalInput(reader,{back:()=>false,key:event=>{if(document.activeElement!==body)return false;const delta=['ArrowDown','Down'].includes(event.key)||event.keyCode===40?100:['ArrowUp','Up'].includes(event.key)||event.keyCode===38?-100:0;if(!delta)return false;const next=Math.max(0,Math.min(body.scrollHeight-body.clientHeight,body.scrollTop+delta));if(next===body.scrollTop)return false;body.scrollTop=next;return true;}});
    return node;
   },'comment-text');
  }
  function list(child:ResourceOwner,root?:CommentCard):HTMLElement {
   const node=document.createElement('section');node.className='comments-panel';nodes.add(node);child.add('comments-node',()=>{nodes.delete(node);});
   const h=document.createElement('h2'),status=document.createElement('p'),grid=document.createElement('div');h.textContent=root?'回复':'评论';status.setAttribute('role','status');grid.className='comments-grid';
   let sort:CommentSort='hot',page=1,result:CommentPage|undefined,loading=false,request=0,controller=new AbortController();child.add('comments-request',()=>controller.abort());
   const back=button(child,'comments-back',root?'返回原评论':'返回播放',()=>{void shell.back();});
   const hot=button(child,'comments-hot','热门',()=>{void load(1,'hot',true);}),latest=button(child,'comments-new','最新',()=>{void load(1,'new',true);}),refresh=button(child,'comments-refresh','刷新当前排序',()=>{void load(1,sort,true);});
   const previous=button(child,'comments-previous','上一页',()=>{void load(page-1,sort,false);}),next=button(child,'comments-next','下一页',()=>{void load(page+1,sort,false);}),retry=button(child,'comments-retry','重试本次读取',()=>{void (appendFailed?load(page+1,sort,false,true):load(page,sort,false));});let appendFailed=false;retry.hidden=true;
   hot.hidden=latest.hidden=refresh.hidden=!!root;
   refresh.hidden=true;node.classList.add('comments-reading');
   // Initial mark, name, date/likes/replies, then up to four clamped lines; Enter still opens the full text.
   const card=(item:CommentCard,index:number)=>{
    const b=button(child,`comments-card-${index}`,'',()=>detail(item,!!root)),mark=document.createElement('span'),name=document.createElement('span'),meta=document.createElement('span'),body=document.createElement('span');
    b.className='comment-card';mark.className='comment-mark';mark.setAttribute('aria-hidden','true');mark.textContent=Array.from(item.author)[0]??'?';name.className='comment-name';name.textContent=item.author;
    meta.className='comment-meta';meta.textContent=`${item.pinned?'置顶 · ':''}${new Date(item.createdAt*1000).toLocaleDateString('zh-CN')} · ${item.likes}赞${root?'':` · ${item.replies}回复`}`;body.className='comment-body';body.textContent=item.text;
    b.append(mark,name,meta,body);b.setAttribute('aria-label',`${item.author}，${item.text.slice(0,140)}`);return b;};
   // Reaching the last comment reads the next page once, appended below (bounded by READ_PAGES).
   const more=(event:FocusEvent)=>{if(loading||!result||result.noMore||page>=READ_PAGES)return;const cards=[...grid.querySelectorAll('button')];if(event.target===cards.at(-1))void load(page+1,sort,false,true);};
   grid.addEventListener('focusin',more);child.add('comments-more',()=>grid.removeEventListener('focusin',more));
   function controls(){for(const b of [hot,latest,refresh,previous,next,retry])b.disabled=loading;previous.disabled||=page===1;next.disabled||=!result||result.noMore;previous.hidden=next.hidden=true;hot.setAttribute('aria-pressed',String(sort==='hot'));latest.setAttribute('aria-pressed',String(sort==='new'));}
   async function load(target:number,order:CommentSort,reload:boolean,append=false){
    if(!alive(child)||loading)return;loading=true;const previousPage=page,previousResult=result;page=target;sort=order;result=undefined;appendFailed=false;
    // The back button is only a fallback while nothing is readable; keep focus on it during a reload.
    if(!append){const hadCard=grid.contains(document.activeElement);back.hidden=false;if(hadCard)back.focus();grid.replaceChildren();}const ticket=++request;controller.abort();controller=new AbortController();status.textContent='正在读取评论，视频继续播放';retry.hidden=true;controls();
    const signal=controller.signal;const abort=()=>controller.abort();child.signal.addEventListener('abort',abort,{once:true});
    try{
     const value=await get().read(root?{kind:'replies',rootKey:root.key,page:target}:{kind:'roots',sort:order,page:target,refresh:reload},signal);
     if(!alive(child)||ticket!==request)return;result=value;page=target;sort=order;
     const offset=append?grid.querySelectorAll('button').length:0,cards=value.items.map((item,i)=>card(item,offset+i));
     if(append)grid.append(...cards);else grid.replaceChildren(...cards);
     const shown=grid.querySelectorAll('button').length;
     status.textContent=value.closed?'评论区已关闭':!shown?'当前页暂无可显示内容':`${root?'回复':sort==='hot'?'热门':'最新'} · 已显示${shown}条${value.noMore||page>=READ_PAGES?'':' · 向下继续'}`;
     const first=grid.querySelector<HTMLButtonElement>('button');
     if(append){back.hidden=true;}else if(first){if(target!==1||reload||document.activeElement===back)first.focus();back.hidden=true;}else if(target!==1||reload)back.focus();
    }catch(error){if(append&&alive(child)&&ticket===request){page=previousPage;result=previousResult;appendFailed=true;}if(alive(child)&&ticket===request){status.textContent=error instanceof DomainError&&error.code==='login'?'登录已过期，评论暂不可读；视频不受影响':'评论暂时无法读取，可重试或返回，视频不受影响';retry.hidden=false;back.hidden=false;}}
    finally{child.signal.removeEventListener('abort',abort);if(alive(child)&&ticket===request){loading=false;controls();if((document.activeElement as HTMLButtonElement|null)?.disabled||document.activeElement===document.body)(retry.hidden?grid.querySelector<HTMLButtonElement>('button')??back:retry).focus();}}
   }
   node.append(h,status,back,hot,latest,refresh,grid,previous,next,retry);void load(1,sort,false);return node;
  }
  return list(owner);
 },'comments-back');
}
