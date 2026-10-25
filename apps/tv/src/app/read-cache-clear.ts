import {DomainError} from '../../../../packages/contracts/src/index.ts';
import {parseReadCacheClear} from '../../../../packages/contracts/src/private-account.ts';
import type {AccountWorkspace} from './account-workspace.ts';
import type {ResourceOwner} from './resource-owner.ts';
import type {TvShell} from './tv-shell.ts';
import {clearPublicLists} from '../platform/public-lanes.ts';
/** Cancels/stales private read owners before resetting only their in-memory snapshots. */
export function readCacheClear(owner:ResourceOwner,shell:TvShell,workspace:AccountWorkspace):HTMLElement{
 const panel=document.createElement('section');panel.className='cache-confirm';const h=document.createElement('h2');h.textContent='清理当前账号的列表缓存？';
 const note=document.createElement('p');note.textContent='释放本次运行的推荐、云端历史、收藏夹、关注更新，以及热门、排行与搜索列表的快照；重新进入列表会重新读取。保留登录、本机观看位置、偏好、队列、搜索和写操作日志；不修改云端。';
 const status=document.createElement('p');status.setAttribute('role','status');let nativePending:Promise<void>|undefined,closed=true,current:AbortController|undefined;
 owner.add('read-cache-clear',async()=>{current?.abort();await nativePending;if(!closed)throw new DomainError('unknown');});
 const back=document.createElement('button');back.dataset.focusId='cache-keep';back.textContent='保留缓存并返回';back.addEventListener('click',()=>{if(!owner.signal.aborted)void shell.back();});
 const confirm=document.createElement('button');confirm.dataset.focusId='cache-confirm';confirm.textContent='确认仅清理列表缓存';
 confirm.addEventListener('click',()=>{
  if(owner.signal.aborted||confirm.disabled)return;confirm.disabled=true;current=new AbortController();const controller=current;status.textContent='正在等待旧读取关闭并清理列表快照';
  void workspace.read(async(runtime,scope,signal)=>{
   if(!runtime.clearReadCaches)throw new DomainError('unsupported');const abort=()=>controller.abort();signal.addEventListener('abort',abort,{once:true});if(signal.aborted)controller.abort();
   try{const operation=runtime.clearReadCaches(scope,controller.signal);nativePending=operation.then(()=>{},error=>{if(!(error instanceof DomainError)||error.code==='unknown')closed=false;});return await operation;}finally{signal.removeEventListener('abort',abort);}
  },parseReadCacheClear).then(()=>{clearPublicLists();if(!owner.signal.aborted){status.textContent='列表缓存已清理，登录与本机数据保留';back.textContent='返回设置';back.focus();}},error=>{if(owner.signal.aborted)return;if(!(error instanceof DomainError)||error.code==='unknown')closed=false;status.textContent=!closed?'资源关闭未确认，请重新打开应用':'列表缓存清理未完成，可返回后检查';back.textContent='返回设置';back.focus();});
 });panel.append(h,note,back,confirm,status);return panel;
}
