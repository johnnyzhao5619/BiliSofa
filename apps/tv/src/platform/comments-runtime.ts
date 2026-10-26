import { DomainError } from '../../../../packages/contracts/src/index.ts';
import type { PrivateAccount } from '../../../../packages/contracts/src/private-account.ts';
import { parsePrivateAccount } from '../../../../packages/contracts/src/private-account.ts';
import { vodBvid } from '../../../../packages/contracts/src/vod-catalog.ts';
import type { CommentAccess, CommentPage, CommentSort } from '../../../../packages/contracts/src/comments-dto.ts';
import { parseCommentQuery, parseCommentRequest, parseCommentResult, type CommentRequest, type CommentResult, type CommentCommand, type CommentBatch, type PrivateComment } from '../../../../packages/contracts/src/comments-read.ts';
import { ScopedGuestWorker } from './scoped-guest-worker.ts';
/** IDs/cursors and verified account stay in this adapter closure, never the UI.
 * API source batches become four-card pages without changing cursor semantics. */
export class CommentsRuntime {
 private account: PrivateAccount | undefined;
 private generation=0;private revision=0;private request=0;private poisoned=false;private closed=false;private queued=0;
 private worker:ScopedGuestWorker<CommentRequest,CommentResult>|undefined;private tail:Promise<unknown>=Promise.resolve();
 constructor(account?:PrivateAccount,private readonly limits={readMs:45000,closeMs:13000}){this.account=account===undefined?undefined:parsePrivateAccount(account);}
 /** ADR-112: `binding` gives each read a private port to the playing item's source Worker (AID, salts). */
 access(value:string,binding?:()=>MessagePort):CommentAccess {
  const bvid=vodBvid(value),generation=this.generation;let revision=++this.revision,sort:CommentSort='hot',roots:PrivateComment[]=[],pages:PrivateComment[][]=[],ended=false,closed=false,offset='',limited=false;
  const offsets=new Set<string>(['']),seen=new Set<string>();let replyKey='',replyPages:PrivateComment[][]=[],replyEnded=false,replyLimited=false,replyClosed=false,replySourcePage=0;const replySeen=new Set<string>();
  const clearReplies=()=>{replyKey='';replyPages=[];replyEnded=replyLimited=replyClosed=false;replySourcePage=0;replySeen.clear();};
  const alive=(signal:AbortSignal)=>{if(this.closed||this.poisoned||generation!==this.generation||signal.aborted)throw new DomainError(this.poisoned?'unknown':'cancelled');};
  const read=async(command:CommentCommand,signal:AbortSignal):Promise<CommentBatch>=>{
   alive(signal);const worker=new ScopedGuestWorker<CommentRequest,CommentResult>('comments-worker.js','comments-read',parseCommentRequest,parseCommentResult,this.limits.readMs,this.limits.closeMs,(q,r)=>r.kind!=='ok'||r.batch.kind===q.command.kind,false,8,false,()=>false,binding?()=>{try{return [binding()];}catch{return [];}}:undefined);this.worker=worker;
   try{const result=await worker.run({version:1,operation:'comments-read',scope:{accountId:this.account?.id??'guest',generation,mediaSessionId:'comments_lane',requestId:`comments_${++this.request}`},bvid,command,...(this.account?{account:this.account}:{})},signal);alive(signal);if(result.kind==='error')throw new DomainError(result.code);return result.batch;}
   finally{try{await worker.dispose();}catch{this.poisoned=true;throw new DomainError('unknown');}finally{if(this.worker===worker)this.worker=undefined;}}
  };
  const append=(batch:CommentBatch,target:PrivateComment[][],ids:Set<string>)=>{
   const fresh=batch.items.filter(x=>!ids.has(x.id));const capacity=(50-target.length)*4,kept=fresh.slice(0,capacity);for(const item of kept)ids.add(item.id);
   if(!kept.length&&target.length<50)target.push([]);else for(let i=0;i<kept.length;i+=4)target.push(kept.slice(i,i+4));return target.length>=50||kept.length!==fresh.length;
  };
  const page=(kind:CommentPage['kind'],number:number,rows:PrivateComment[],noMore:boolean,isLimited:boolean,isClosed:boolean):CommentPage=>({kind,sort,page:number,noMore,limited:isLimited,closed:isClosed,items:rows.map((row,i)=>{const{id,...value}=row;return{...value,key:kind==='roots'?`c${revision}_${roots.findIndex(r=>r.id===id)}`:`r${revision}_${(number-1)*4+i}`};})});
  return{read:(raw,signal)=>{
   const q=parseCommentQuery(raw);if(this.queued>=4)return Promise.reject(new DomainError('cancelled'));this.queued++;
   const task=this.tail.catch(()=>{}).then(async()=>{
    alive(signal);
    if(q.kind==='roots'){
     if(q.refresh||q.sort!==sort){revision=++this.revision;sort=q.sort;roots=[];pages=[];ended=closed=limited=false;offset='';offsets.clear();offsets.add('');seen.clear();clearReplies();}
     if(q.page>pages.length+1)throw new DomainError('invalid');
     if(q.page>pages.length&&!ended&&!limited){
      const batch=await read({kind:'roots',sort,offset},signal);alive(signal);
      if(!batch.end){if(!batch.next||offsets.has(batch.next))throw new DomainError('invalid');}
      limited=append(batch,pages,seen);roots=pages.flat();ended=batch.end;closed=batch.closed;if(!batch.end){offset=batch.next;offsets.add(offset);}
     }
     return page('roots',q.page,pages[q.page-1]??[],(ended||limited)&&q.page>=pages.length,limited,closed);
    }
    const match=/^c([1-9][0-9]*)_([0-9]+)$/.exec(q.rootKey),row=match&&Number(match[1])===revision?roots[Number(match[2])]:undefined;if(!row)throw new DomainError('cancelled');
    if(q.rootKey!==replyKey){clearReplies();replyKey=q.rootKey;}
    if(q.page>replyPages.length+1)throw new DomainError('invalid');
    if(q.page>replyPages.length&&!replyEnded&&!replyLimited){const batch=await read({kind:'replies',root:row.id,page:replySourcePage+1},signal);alive(signal);replyLimited=append(batch,replyPages,replySeen);replySourcePage++;replyEnded=batch.end;replyClosed=batch.closed;}
    return page('replies',q.page,replyPages[q.page-1]??[],(replyEnded||replyLimited)&&q.page>=replyPages.length,replyLimited,replyClosed);
   });const result=task.finally(()=>{this.queued--;});this.tail=result;return result;
  },close:()=>generation===this.generation?this.reset():Promise.resolve()};
 }
 async reset():Promise<void>{this.generation++;try{await this.worker?.dispose();}catch{this.poisoned=true;}await this.tail.catch(()=>{});if(this.poisoned)throw new DomainError('unknown');}
 async close():Promise<void>{this.closed=true;this.account=undefined;await this.reset();}
}
