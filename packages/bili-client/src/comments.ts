import { DomainError, record, text } from '../../contracts/src/index.ts';
import { commentId, parseCommentBatch, type PrivateComment, type CommentBatch, type CommentCommand } from '../../contracts/src/comments-read.ts';
import { vodInteger } from '../../contracts/src/vod-catalog.ts';
function id(v: unknown): string { return commentId(typeof v === 'number' && Number.isSafeInteger(v) ? String(v) : v); }
function checked(raw: string): Record<string,unknown> {
 if(new TextEncoder().encode(raw).length>4194304)throw new DomainError('invalid');let x:unknown;try{x=JSON.parse(raw);}catch{throw new DomainError('invalid');}const v=record(x);if(v.code!==0)throw new DomainError(v.code===-101?'login':v.code===-403?'permission':'network');return record(v.data);
}
export function commentVideo(raw:string,bvid:string):string {const v=checked(raw);if(v.bvid!==bvid)throw new DomainError('invalid');return id(v.aid);}
function row(raw:unknown,aid:string,root:string,pinned=false):PrivateComment|undefined {
 const v=record(raw);if(id(v.oid_str??v.oid)!==aid||v.type!==1)throw new DomainError('invalid');
 const actualRoot=v.root_str??(typeof v.root==='number'&&Number.isSafeInteger(v.root)?String(v.root):v.root);if(actualRoot!==root)throw new DomainError('invalid');
 if(v.invisible===true)return undefined;const member=record(v.member),body=record(v.content);
 return{id:id(v.rpid_str??v.rpid),author:text(member.uname,128),text:body.message as string,createdAt:vodInteger(v.ctime,0,4102444800),likes:vodInteger(v.like,0,Number.MAX_SAFE_INTEGER),replies:vodInteger(v.rcount??v.count??0,0,Number.MAX_SAFE_INTEGER),pinned};
}
export function parseComments(raw:string,aid:string,command:CommentCommand):CommentBatch {
 if(new TextEncoder().encode(raw).length>4194304)throw new DomainError('invalid');
 let envelope:unknown;try{envelope=JSON.parse(raw);}catch{throw new DomainError('invalid');}const code=record(envelope).code;
 if(code===12002||code===12061)return parseCommentBatch({kind:command.kind,items:[],end:true,closed:true,next:''});
 const data=checked(raw),items:PrivateComment[]=[];const seen=new Set<string>();
 const add=(raw:unknown,pinned=false)=>{const value=row(raw,aid,command.kind==='roots'?'0':command.root,pinned);if(value&&!seen.has(value.id)){seen.add(value.id);items.push(value);}};
 if(command.kind==='roots'){
  const control=data.control===undefined?{}:record(data.control);if(control.is_closed===true)return parseCommentBatch({kind:'roots',items:[],end:true,closed:true,next:''});
  const cursor=record(data.cursor);if(typeof cursor.is_end!=='boolean'||cursor.mode!==undefined&&cursor.mode!==(command.sort==='hot'?3:2))throw new DomainError('invalid');
  if(!command.offset&&data.top_replies!==undefined){if(!Array.isArray(data.top_replies)||data.top_replies.length>20)throw new DomainError('invalid');for(const raw of data.top_replies)add(raw,true);}
  if(data.replies!==null&&data.replies!==undefined){if(!Array.isArray(data.replies)||data.replies.length>44)throw new DomainError('invalid');for(const raw of data.replies)add(raw);}
  const next=cursor.is_end?'':record(cursor.pagination_reply).next_offset;if(!cursor.is_end&&(typeof next!=='string'||!next))throw new DomainError('invalid');return parseCommentBatch({kind:'roots',items,end:cursor.is_end,closed:false,next});
 }
 const root=record(data.root);if(id(root.rpid_str??root.rpid)!==command.root||id(root.oid_str??root.oid)!==aid||root.type!==1)throw new DomainError('invalid');
 const page=record(data.page),num=vodInteger(page.num,1,50),size=vodInteger(page.size,1,20),count=vodInteger(page.count,0,Number.MAX_SAFE_INTEGER);if(num!==command.page||size!==10)throw new DomainError('invalid');
 if(data.replies!==null&&data.replies!==undefined){if(!Array.isArray(data.replies)||data.replies.length>10)throw new DomainError('invalid');for(const raw of data.replies)add(raw);}
 return parseCommentBatch({kind:'replies',items,end:num*size>=count,closed:false,next:''});
}
