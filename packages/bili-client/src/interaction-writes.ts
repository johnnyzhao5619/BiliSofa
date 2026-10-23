import {DomainError} from '../../contracts/src/index.ts';
import {parseAccountId} from '../../contracts/src/private-account.ts';
import {parseInteractionIntent,parseInteractionState,interactionApplied,interactionReady,type InteractionIntent,type InteractionState} from '../../contracts/src/video-interactions.ts';
import type {InteractionEntry,InteractionJournalStore,InteractionMark} from '../../contracts/src/interaction-journal.ts';
import type {JournalStore} from '../../contracts/src/retained-write.ts';
export const INTERACTION_JOURNAL_LIMIT=256;
/** Settled reversible rows and never-sent coin rows carry no replay or grant
 * evidence. Evict the oldest of them so a full journal cannot lock F11 forever;
 * pending/unknown intents and possibly consumed coin grants are never evicted. */
function evictSettled(rows:InteractionEntry[]):void{
 for(let i=0;rows.length>=INTERACTION_JOURNAL_LIMIT&&i<rows.length;){const e=rows[i]!;if(e.state==='not-sent'||e.intent.kind!=='coin'&&(e.state==='confirmed'||e.state==='not-applied'))rows.splice(i,1);else i++;}
}
/** Additive journal; the v1 retained journal is preserved and consulted. No
 * preference/account deletion or read can consume an irreversible grant twice. */
export class InteractionWrites{
 private poisoned=false;private busy=false;
 constructor(private readonly store:InteractionJournalStore,private readonly legacy:JournalStore){}
 summary(accountId:string):{total:number;unknown:number}|undefined{parseAccountId(accountId);if(this.poisoned)return undefined;try{const entries=this.store.read().value.entries.filter(e=>e.accountId===accountId);return{total:entries.length,unknown:entries.filter(e=>e.state==='pending'||e.state==='unknown').length};}catch{this.poisoned=true;return undefined;}}
 private change(edit:(entries:InteractionEntry[],serial:number)=>void){
  if(this.poisoned)throw new DomainError('unknown');try{const c=this.store.read();if(c.value.revision>=Number.MAX_SAFE_INTEGER)throw new DomainError('unknown');const revision=c.value.revision+1,entries=c.value.entries.map(e=>({...e,state:e.state==='pending'?'unknown' as const:e.state}));edit(entries,revision);this.store.replace(c.raw,{schema:1,revision,entries});}
  catch(e){if(!(e instanceof DomainError)||!['permission','invalid'].includes(e.code))this.poisoned=true;throw e;}
 }
 private legacyBlocked(accountId:string,s:InteractionState,coin=false):boolean{
  const rows=this.legacy.read().value.entries;return rows.some(e=>e.accountId===accountId&&(e.targetId===s.bvid||e.targetId===`uid:${s.ownerId}`)&&e.action!=='progress'&&(!['rejected','not-applied'].includes(e.state))&&(coin?['coin','triple'].includes(e.action):['pending','checking','unknown'].includes(e.state)));
 }
 inspect(accountId:string,raw:InteractionState):{blocked:boolean;coinLocked:boolean}{
  parseAccountId(accountId);const s=parseInteractionState(raw);if(this.poisoned)return{blocked:true,coinLocked:true};try{const rows=this.store.read().value.entries;return{blocked:this.legacyBlocked(accountId,s),coinLocked:this.legacyBlocked(accountId,s,true)||rows.some(e=>e.accountId===accountId&&e.before.bvid===s.bvid&&e.intent.kind==='coin'&&e.state!=='not-sent'&&(e.state!=='confirmed'||(s.coins===null||e.before.coins===null||s.coins<e.before.coins+e.intent.quantity)))};}catch{this.poisoned=true;return{blocked:true,coinLocked:true};}
 }
 /** Capture pending exact-target actions before read-only reconciliation. The
  * first click after an unknown result queries only; it cannot become a retry. */
 pendingActions(accountId:string,s:InteractionState):('like'|'follow'|'watch-later'|'favorite')[]{
  parseAccountId(accountId);parseInteractionState(s);if(this.poisoned)throw new DomainError('unknown');
  try{return [...new Set(this.store.read().value.entries.filter(e=>e.accountId===accountId&&['pending','unknown'].includes(e.state)&&(e.intent.kind==='follow'?e.before.ownerId===s.ownerId:e.before.bvid===s.bvid&&e.before.aid===s.aid)).map(e=>e.intent.kind).filter((k):k is 'like'|'follow'|'watch-later'|'favorite'=>k!=='coin'))];}catch{this.poisoned=true;throw new DomainError('unknown');}
 }
 /** Explicit read settles only reversible families. Coin unknowns remain unknown
  * even if another client later changes its counter: causality is unproven. */
 reconcile(accountId:string,s:InteractionState):void{
  parseAccountId(accountId);parseInteractionState(s);this.change(rows=>{for(const e of rows){if(e.accountId!==accountId||(e.intent.kind==='follow'?e.before.ownerId!==s.ownerId:e.before.bvid!==s.bvid)||e.intent.kind==='coin'||e.state==='not-sent')continue;const applied=interactionApplied(s,e.intent,e.before);if(applied!==undefined)e.state=applied?'confirmed':'not-applied';}});
 }
 async submit(accountId:string,raw:InteractionState,value:InteractionIntent,confirmed:boolean,signal:AbortSignal,send:()=>Promise<'accepted'|'unknown'|'not-sent'>,query:()=>Promise<InteractionState>):Promise<InteractionMark>{
  parseAccountId(accountId);const before=parseInteractionState(raw),intent=parseInteractionIntent(value);if(!interactionReady(before,intent))throw new DomainError('permission');if(confirmed!==true)throw new DomainError('permission');if(signal.aborted)throw new DomainError('cancelled');if(this.busy)throw new DomainError('permission');this.busy=true;let serial=0;
  try{
   const locks=this.inspect(accountId,before);if(locks.blocked||intent.kind==='coin'&&locks.coinLocked)throw new DomainError('permission');
   this.change((rows,sequence)=>{evictSettled(rows);if(rows.length>=INTERACTION_JOURNAL_LIMIT)throw new DomainError('invalid');if(rows.some(e=>e.accountId===accountId&&(e.before.bvid===before.bvid||intent.kind==='follow'&&e.before.ownerId===before.ownerId)&&['pending','unknown'].includes(e.state)&&(e.intent.kind===intent.kind&&e.intent.folderId===intent.folderId)))throw new DomainError('permission');serial=sequence;const minimal={...before,title:'已确认视频',owner:'已确认UP',balance:before.balance===null?null:0,folders:before.folders?.filter(f=>intent.kind==='favorite'&&f.id===intent.folderId).map(f=>({...f,title:'指定收藏夹'}))??null};rows.push({accountId,serial,intent,before:minimal,state:'pending',ack:false});});
   let state:InteractionMark='unknown',ack=false;
   try{if(signal.aborted)throw new DomainError('cancelled');const result=await send();if(result==='not-sent')state='not-sent';else if(result==='accepted')ack=true;}catch{/* No second POST after errors, cancellation or lost close ACK. */}
   this.finish(serial,state,ack);
   if(state==='not-sent'||signal.aborted)return state;
   try{let actual=await query();if(signal.aborted)return'unknown';let applied=interactionApplied(actual,intent,before);
    // Acknowledged reversible writes may precede cache convergence. Only GET
    // again once; never issue another POST or apply this policy to coin grants.
    if(ack&&intent.kind!=='coin'&&applied===false){await this.readbackDelay(signal);if(signal.aborted)return'unknown';actual=await query();if(signal.aborted)return'unknown';applied=interactionApplied(actual,intent,before);}
    state=intent.kind==='coin'?(ack&&applied===true?'confirmed':'unknown'):applied===true?'confirmed':applied===false?'not-applied':'unknown';}catch{state='unknown';}
   this.finish(serial,state,ack);return state;
  }catch(e){if(serial){try{this.finish(serial,'unknown',false);}catch{}return'unknown';}throw e;}finally{this.busy=false;}
 }
 private readbackDelay(signal:AbortSignal):Promise<void>{return new Promise((resolve,reject)=>{let timer:ReturnType<typeof setTimeout>;const cancel=()=>{clearTimeout(timer);signal.removeEventListener('abort',cancel);reject(new DomainError('cancelled'));};timer=setTimeout(()=>{signal.removeEventListener('abort',cancel);resolve();},750);signal.addEventListener('abort',cancel,{once:true});if(signal.aborted)cancel();});}
 private finish(serial:number,state:InteractionMark,ack:boolean){this.change(rows=>{const e=rows.find(e=>e.serial===serial);if(!e)throw new DomainError('unknown');e.state=state;e.ack=ack;});}
}
