import type {BookmarkRead,PartResumePoint,ProfileStore} from '../../../../packages/contracts/src/local-profile.ts';
import type {ResourceOwner} from './resource-owner.ts';
import type {TvShell} from './tv-shell.ts';
import {queuePart,type QueueStore} from '../../../../packages/contracts/src/local-queue.ts';
import type {ResumeLabel} from '../../../../packages/contracts/src/resume-label.ts';
const issue=(kind:string)=>kind==='future'?'本机观看记录版本不支持，请保留原数据或使用设置中的明确重置':kind==='corrupt'?'本机观看记录损坏，请保留原数据或使用设置中的明确重置':'本机观看记录读取未确认，请重新读取';
/** Fixed-identity local data only; records never cause a network or playback action. */
export function localBookmarks(owner:ResourceOwner,shell:TvShell,store:ProfileStore,queue?:QueueStore):HTMLElement{
 const panel=document.createElement('section');panel.className='bookmarks-panel';const heading=document.createElement('h2');heading.id='bookmarks-heading';heading.textContent='本机观看记录 · 含分P';panel.setAttribute('aria-labelledby',heading.id);
 const note=document.createElement('p');note.textContent='仅本机续播位置，独立于云端历史；删除不改偏好、队列、搜索记录或登录。';
 const status=document.createElement('p');status.setAttribute('role','status');const grid=document.createElement('div');grid.className='bookmarks-grid';let page=0,rows:PartResumePoint[]=[],read:BookmarkRead;
 const button=(id:string,label:string,action:()=>void)=>{const b=document.createElement('button');b.dataset.focusId=id;b.textContent=label;b.addEventListener('click',()=>{if(!owner.signal.aborted&&b.isConnected)action();});return b;};
 const back=button('bookmarks-back','返回设置',()=>{void shell.back();}),refresh=button('bookmarks-refresh','重新读取记录',()=>render());
 const previous=button('bookmarks-prev','上一页',()=>{page--;render();}),next=button('bookmarks-next','下一页',()=>{page++;render();});
 const key=(p:PartResumePoint)=>`bookmark-${p.bvid}-p${p.part}`;
 const labels=new Map<string,ResumeLabel>();
 const name=(p:PartResumePoint)=>{const label=labels.get(key(p));return label?`${label.title} · P${p.part}${label.partTitle&&label.partTitle!==label.title?' · '+label.partTitle:''}`:`名称暂不可用 · ${p.bvid} · P${p.part}`;};
 const time=(ms:number)=>{const sec=Math.floor(ms/1000),min=Math.floor(sec/60);return min>=60?`${Math.floor(min/60)}:${String(min%60).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`:`${min}:${String(sec%60).padStart(2,'0')}`;};
 function confirm(point?:PartResumePoint){
  shell.openModal('delete-bookmark',child=>{
   const modal=document.createElement('section');modal.className='bookmark-confirm';const h=document.createElement('h2');h.textContent=point?`删除 ${name(point)} 的本机位置？`:'仅清空当前身份的本机续播位置？';
   const detail=document.createElement('p');detail.textContent='保留播放偏好、队列、搜索记录、登录与写操作日志；不修改云端。';const feedback=document.createElement('p');feedback.setAttribute('role','status');
   const keep=button('bookmark-keep','保留记录',()=>{void shell.back();});
   const remove=button('bookmark-delete',point?'确认仅删除此分P位置':'确认仅清空续播位置',()=>{
    if(child.signal.aborted)return;remove.disabled=true;let result;
    try{result=point?store.forgetPart(point.bvid,point.part):store.clearBookmarks?.()??'unavailable';}catch{result='unconfirmed';}
    if(result==='saved'||result==='deleted')void shell.back().then(()=>{if(!owner.signal.aborted){render();status.textContent=point?'该分P本机位置已删除':'本机续播位置已清空，其他本机数据保留';}});
    else{feedback.textContent='删除未确认，可能已清除部分记录；请返回后重新读取核对';keep.textContent='返回记录';keep.focus();}
   });modal.append(h,detail,keep,remove,feedback);return modal;
  },'bookmark-keep');
 }
 const clear=button('bookmarks-clear','仅清空本机续播位置',()=>confirm());
 function select(point:PartResumePoint){shell.openModal('bookmark-detail',child=>{
  const modal=document.createElement('section');modal.className='bookmark-detail';const h=document.createElement('h2');h.textContent=name(point);const text=document.createElement('p');text.textContent=`${point.bvid} · 本机位置 ${time(point.timeMs)} / ${time(point.durationMs)}；本页不会播放或写回云端。`;
  const remove=button('bookmark-detail-delete','删除此分P的本机位置',()=>{if(child.signal.aborted)return;void shell.back().then(()=>{if(!owner.signal.aborted)confirm(point);});});
  modal.append(h,text,button('bookmark-detail-back','返回本机记录',()=>{void shell.back();}),remove);return modal;
 },'bookmark-detail-back');}
 function render(){
  if(owner.signal.aborted)return;grid.replaceChildren();read=store.bookmarks?.()??{kind:'unavailable'};clear.disabled=previous.disabled=next.disabled=true;
  if(read.kind!=='ok'){status.textContent=issue(read.kind);if(panel.isConnected)refresh.focus();return;}
  rows=read.items;page=Math.max(0,Math.min(page,Math.max(0,Math.ceil(rows.length/4)-1)));clear.disabled=!rows.length||!store.clearBookmarks;previous.disabled=page===0;next.disabled=(page+1)*4>=rows.length;
  status.textContent=rows.length?`第 ${page+1} 页 · ${rows.length}/192 条 · 首P ${rows.filter(p=>p.part===1).length} 条 / 其他分P ${rows.filter(p=>p.part>1).length} 条`:'本机观看记录为空';
  const visible=rows.slice(page*4,page*4+4),known=queue?.read();labels.clear();
  visible.forEach((point,i)=>{
   const label=store.readLabel?.(point.bvid,point.part);
   if(label?.kind==='ok'&&label.value)labels.set(key(point),label.value);
   else if(!label||label.kind==='ok'){
    // Only this visible page, only the fixed identity's existing local queue.
    const item=known?.kind==='ok'?(known.value.items.find(q=>q.bvid===point.bvid&&queuePart(q)===point.part)??known.value.items.find(q=>q.bvid===point.bvid)):undefined;
    if(item){const value={bvid:point.bvid,part:point.part,title:item.title,updatedAt:point.updatedAt};labels.set(key(point),value);store.rememberLabel?.(value);}
   }
   const b=button(key(point),`${name(point)} · ${time(point.timeMs)} / ${time(point.durationMs)}`,()=>select(point));const id=(n:number)=>key(visible[n]!);b.dataset.left=id(i%2?i-1:i);b.dataset.right=id(i%2===0&&i+1<visible.length?i+1:i);b.dataset.up=i<2?'bookmarks-refresh':id(i-2);b.dataset.down=i+2<visible.length?id(i+2):!next.disabled?'bookmarks-next':'bookmarks-refresh';grid.append(b);
  });
  if(panel.isConnected)(grid.querySelector<HTMLButtonElement>('button')??refresh).focus();
 }
 panel.append(heading,note,back,refresh,clear,status,grid,previous,next);render();return panel;
}
