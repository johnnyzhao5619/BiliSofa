import { DomainError } from '../../../../packages/contracts/src/index.ts';
import type { CommentAccess, CommentCard, CommentPage, CommentSort } from '../../../../packages/contracts/src/comments-dto.ts';
import type { ResourceOwner } from './resource-owner.ts';
import type { TvShell } from './tv-shell.ts';
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
   const h=document.createElement('h2'),status=document.createElement('p'),grid=document.createElement('div');h.textContent=root?'楼中楼回复 · 只读':'评论 · 只读';status.setAttribute('role','status');grid.className='comments-grid';
   let sort:CommentSort='hot',page=1,result:CommentPage|undefined,loading=false,request=0,controller=new AbortController();child.add('comments-request',()=>controller.abort());
   const back=button(child,'comments-back',root?'返回原评论':'返回播放',()=>{void shell.back();});
   const hot=button(child,'comments-hot','热门',()=>{void load(1,'hot',true);}),latest=button(child,'comments-new','最新',()=>{void load(1,'new',true);}),refresh=button(child,'comments-refresh','刷新当前排序',()=>{void load(1,sort,true);});
   const previous=button(child,'comments-previous','上一页',()=>{void load(page-1,sort,false);}),next=button(child,'comments-next','下一页',()=>{void load(page+1,sort,false);}),retry=button(child,'comments-retry','重试本次读取',()=>{void load(page,sort,false);});retry.hidden=true;
   hot.hidden=latest.hidden=refresh.hidden=!!root;
   function controls(){for(const b of [hot,latest,refresh,previous,next,retry])b.disabled=loading;previous.disabled||=page===1;next.disabled||=!result||result.noMore;hot.setAttribute('aria-pressed',String(sort==='hot'));latest.setAttribute('aria-pressed',String(sort==='new'));}
   async function load(target:number,order:CommentSort,reload:boolean){
    if(!alive(child)||loading)return;loading=true;page=target;sort=order;result=undefined;grid.replaceChildren();const ticket=++request;controller.abort();controller=new AbortController();status.textContent='正在读取评论，视频继续播放';retry.hidden=true;controls();
    const signal=controller.signal;const abort=()=>controller.abort();child.signal.addEventListener('abort',abort,{once:true});
    try{
     const value=await get().read(root?{kind:'replies',rootKey:root.key,page:target}:{kind:'roots',sort:order,page:target,refresh:reload},signal);
     if(!alive(child)||ticket!==request)return;result=value;page=target;sort=order;
     grid.replaceChildren(...value.items.map((item,i)=>{const b=button(child,`comments-card-${i}`,`${item.pinned?'置顶 · ':''}${item.author} · ${item.likes}赞 · ${item.replies}回复\n${item.text.slice(0,140)}`,()=>detail(item,!!root));return b;}));
     status.textContent=value.closed?'评论区已关闭':!value.items.length?'当前页暂无可显示内容':`${root?'回复':sort==='hot'?'热门':'最新'} · 第${page}页${value.limited?' · 已到本次读取上限，可刷新':''}`;
     if(target!==1||reload)(grid.querySelector<HTMLButtonElement>('button')??back).focus();
    }catch(error){if(alive(child)&&ticket===request){status.textContent=`评论读取失败（comments.${error instanceof DomainError?error.code:'invalid'}），可手动重试或返回，视频不受影响`;retry.hidden=false;}}
    finally{child.signal.removeEventListener('abort',abort);if(alive(child)&&ticket===request){loading=false;controls();if((document.activeElement as HTMLButtonElement|null)?.disabled)back.focus();}}
   }
   node.append(h,status,back,hot,latest,refresh,grid,previous,next,retry);void load(1,sort,false);return node;
  }
  return list(owner);
 },'comments-back');
}
