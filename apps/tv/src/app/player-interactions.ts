import {DomainError} from '../../../../packages/contracts/src/index.ts';
import {InteractionReadError} from '../../../../packages/contracts/src/video-interactions.ts';
import type {VideoInteractionAccess,InteractionSnapshot} from '../../../../packages/contracts/src/video-interactions-dto.ts';
import type {ResourceOwner} from './resource-owner.ts';
export type PlayerAction='like'|'follow'|'watch-later';
const names={like:'点赞',follow:'关注UP','watch-later':'稍后再看'};
export function actionValue(s:InteractionSnapshot|undefined,kind:PlayerAction):boolean|null|undefined{return kind==='like'?s?.liked:kind==='follow'?s?.followed:s?.watchLater;}
/** One explicit click -> current-state read -> at most one journalled toggle.
 * Unknown outcomes consume the next click as read-only, including after reopen.
 * All three buttons share serialization, source cancellation and readback. */
export class PlayerInteractions{
 private source='';private generation=0;private abort:AbortController|undefined;private access:VideoInteractionAccess|undefined;private task:Promise<void>|undefined;private closure:Promise<void>|undefined;
 private loaded=false;private unknown=new Set<PlayerAction>();snapshot:InteractionSnapshot|undefined;busy=false;message='';
 constructor(private owner:ResourceOwner,private open:(id:string)=>VideoInteractionAccess,private changed:()=>void){
  const abort=()=>{this.abort?.abort();void this.closeAccess().catch(()=>{});};owner.signal.addEventListener('abort',abort,{once:true});owner.add('player-interactions',async()=>{owner.signal.removeEventListener('abort',abort);abort();await this.task;await this.closeAccess();});
 }
 bind(source:string):void{if(source===this.source)return;this.source=source;this.generation++;this.abort?.abort();void this.closeAccess().catch(()=>{});this.loaded=false;this.snapshot=undefined;this.unknown.clear();this.message='';}
 private closeAccess():Promise<void>{const access=this.access;this.access=undefined;if(access){const prior=this.closure;this.closure=Promise.resolve(prior).then(()=>access.close());}return this.closure??Promise.resolve();}
 private merge(value:InteractionSnapshot,kind?:PlayerAction):InteractionSnapshot{
  const previous=this.snapshot;if(!kind||!previous||previous.bvid!==value.bvid||previous.owner!==value.owner)return value;
  const unavailable={...previous.unavailable};delete unavailable[kind];if(value.unavailable?.[kind])unavailable[kind]=value.unavailable[kind];
  const result={...value,liked:kind==='like'?value.liked:previous.liked,followed:kind==='follow'?value.followed:previous.followed,watchLater:kind==='watch-later'?value.watchLater:previous.watchLater};delete result.unavailable;if(Object.keys(unavailable).length)result.unavailable=unavailable;return result;
 }
 preload():void{if(this.loaded||this.busy||!this.source)return;this.loaded=true;this.run();}
 toggle(kind:PlayerAction):void{this.run(kind);}
 private run(kind?:PlayerAction):void{if(this.busy||!this.source||this.owner.signal.aborted)return;const previous=kind?actionValue(this.snapshot,kind):undefined,generation=this.generation,source=this.source,abort=new AbortController();this.abort=abort;this.busy=true;this.message=kind?`正在核对${names[kind]}状态`:'正在读取账号互动状态';this.changed();
  const alive=()=>!this.owner.signal.aborted&&!abort.signal.aborted&&generation===this.generation;
  const task=Promise.resolve().then(async()=>{
   await this.closeAccess();if(!alive())return;const access=this.open(source);this.access=access;
   const s=await access.read(abort.signal,kind??'toolbar');if(!alive())return;this.snapshot=this.merge(s,kind);
   if(!kind){for(const action of s.reconciled??[])if(action!=='favorite')this.unknown.add(action);this.message=s.blocked?'旧操作未确认，写入已锁定':['like','follow','watch-later'].some(k=>s.unavailable?.[k as PlayerAction])?'部分互动状态暂未读取，可独立核对':'账号互动状态已读取';return;}
   if(this.unknown.has(kind)||s.reconciled?.includes(kind)){this.unknown.delete(kind);this.message=`仅回查${names[kind]}：${actionValue(s,kind)===null?'状态未确认':actionValue(s,kind)?'已设置':'未设置'}，未重复提交；如需更改请再次点击`;return;}
   const value=actionValue(s,kind);if(s.blocked||typeof value!=='boolean'){this.message=s.blocked?'旧操作未确认，写入已锁定；不会自动重发':`${names[kind]}状态未确认（interaction.${kind}.${s.unavailable?.[kind]??'unknown'}），本次未提交；可再次点击只读核对`;return;}
   if(typeof previous!=='boolean'||previous!==value){this.message=`${names[kind]}状态已更新，本次仅核对；请按当前按钮状态操作`;return;}
   this.message=`正在${value?'取消':'设置'}${names[kind]}`;this.changed();
   // This explicit button press is the grant for this reversible operation.
   this.unknown.add(kind);const result=await access.submit(s.token,{kind,on:!value},true,abort.signal);if(!alive())return;this.snapshot=result.snapshot?this.merge(result.snapshot,kind):undefined;
   if(result.state!=='unknown')this.unknown.delete(kind);
   this.message=result.state==='confirmed'?`${names[kind]}${value?'已取消':'已设置'}，已回查确认`:result.state==='unknown'?`${names[kind]}结果未知；再次点击仅回查，不重发`:`${names[kind]}未生效，已回查实际状态`;
   if(result.state!=='confirmed'&&result.diagnostics?.length)this.message+=`（${result.diagnostics.join('；')}）`;
  }).catch(e=>{if(alive())this.message=`操作未完成（interaction.${e instanceof InteractionReadError?`${e.phase}.${e.code}`:e instanceof DomainError?e.code:'unknown'}）；${kind&&this.unknown.has(kind)?'再次点击仅回查，不重发':'本次未重复提交，可再次核对'}`;}).finally(async()=>{try{await this.closeAccess();}catch{if(alive())this.message='资源关闭未确认，请重新打开应用';}finally{this.busy=false;if(alive())this.changed();}});
  this.task=task;void task.catch(()=>{});
 }
}
