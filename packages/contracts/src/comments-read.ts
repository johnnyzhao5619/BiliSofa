import { DomainError, record, text, parseScope, type Scope, type ErrorCode } from './index.ts';
import { vodBvid, vodInteger, vodKeys } from './vod-catalog.ts';
import { parsePrivateAccount, type PrivateAccount } from './private-account.ts';
import type { CommentText, CommentQuery, CommentSort } from './comments-dto.ts';
export interface PrivateComment extends CommentText { id: string; }
export type CommentCommand = { kind: 'roots'; sort: CommentSort; offset: string } | { kind: 'replies'; root: string; page: number };
export interface CommentBatch { kind: 'roots' | 'replies'; items: PrivateComment[]; end: boolean; closed: boolean; next: string; }
export interface CommentRequest { version: 1; operation: 'comments-read'; scope: Scope; bvid: string; command: CommentCommand; account?: PrivateAccount; }
export type CommentResult = { version: 1; operation: 'comments-read'; scope: Scope; closed: true } & ({ kind: 'ok'; batch: CommentBatch } | { kind: 'error'; code: ErrorCode });
export function commentId(v: unknown): string { const id = text(v, 20); if (!/^[1-9][0-9]{0,19}$/.test(id)) throw new DomainError('invalid'); return id; }
export function commentOffset(v: unknown): string { if (typeof v !== 'string' || v.length > 512 || /[^\x20-\x7e]|[!'()*]/.test(v)) throw new DomainError('invalid'); return v; }
export function commentSort(v: unknown): CommentSort { if (v !== 'hot' && v !== 'new') throw new DomainError('invalid'); return v; }
export function commentBody(v: unknown): string { if (typeof v !== 'string' || !v.length || v.length > 16000 || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(v)) throw new DomainError('invalid'); return v.replace(/\r\n?/g, '\n'); }
export function parseCommentQuery(raw: unknown): CommentQuery {
 const v = record(raw);
 if (v.kind === 'roots') { vodKeys(v, ['kind','sort','page','refresh']); if (typeof v.refresh !== 'boolean') throw new DomainError('invalid'); return { kind: 'roots', sort: commentSort(v.sort), page: vodInteger(v.page,1,50), refresh:v.refresh }; }
 if (v.kind !== 'replies') throw new DomainError('invalid'); vodKeys(v,['kind','rootKey','page']); const key=text(v.rootKey,64); if (!/^c[1-9][0-9]{0,8}_[0-9]{1,3}$/.test(key)) throw new DomainError('invalid'); return {kind:'replies',rootKey:key,page:vodInteger(v.page,1,50)};
}
export function parseCommentCommand(raw: unknown): CommentCommand {
 const v=record(raw); if(v.kind==='roots'){vodKeys(v,['kind','sort','offset']);return{kind:'roots',sort:commentSort(v.sort),offset:commentOffset(v.offset)};}
 if(v.kind!=='replies')throw new DomainError('invalid');vodKeys(v,['kind','root','page']);return{kind:'replies',root:commentId(v.root),page:vodInteger(v.page,1,50)};
}
export function parseCommentBatch(raw: unknown): CommentBatch {
 const v=record(raw);vodKeys(v,['kind','items','end','closed','next']);if(!['roots','replies'].includes(String(v.kind))||!Array.isArray(v.items)||v.items.length>64||typeof v.end!=='boolean'||typeof v.closed!=='boolean')throw new DomainError('invalid');
 let size=0;const ids=new Set<string>();const items=v.items.map(raw=>{const x=record(raw);vodKeys(x,['id','author','text','createdAt','likes','replies','pinned']);const id=commentId(x.id),body=commentBody(x.text);size+=body.length;if(ids.has(id)||size>262144||typeof x.pinned!=='boolean')throw new DomainError('invalid');ids.add(id);return{id,author:text(x.author,128),text:body,createdAt:vodInteger(x.createdAt,0,4102444800),likes:vodInteger(x.likes,0,Number.MAX_SAFE_INTEGER),replies:vodInteger(x.replies,0,Number.MAX_SAFE_INTEGER),pinned:x.pinned};});
 const next=commentOffset(v.next);if((v.end||v.closed)&&next||v.closed&&items.length||v.kind==='replies'&&next)throw new DomainError('invalid');return{kind:v.kind as CommentBatch['kind'],items,end:v.end,closed:v.closed,next};
}
export function parseCommentRequest(raw:unknown):CommentRequest {
 const v=record(raw);vodKeys(v,['version','operation','scope','bvid','command',...(v.account===undefined?[]:['account'])]);if(v.version!==1||v.operation!=='comments-read'||Object.keys(record(v.scope)).length!==4)throw new DomainError('invalid');const scope=parseScope(v.scope),account=v.account===undefined?undefined:parsePrivateAccount(v.account);if(scope.accountId!==(account?.id??'guest'))throw new DomainError('invalid');return{version:1,operation:'comments-read',scope,bvid:vodBvid(v.bvid),command:parseCommentCommand(v.command),...(account?{account}:{})};
}
export function parseCommentResult(raw:unknown):CommentResult {
 const v=record(raw);vodKeys(v,['version','operation','scope','closed','kind',v.kind==='ok'?'batch':'code']);if(v.version!==1||v.operation!=='comments-read'||v.closed!==true||Object.keys(record(v.scope)).length!==4)throw new DomainError('invalid');const base={version:1 as const,operation:'comments-read' as const,scope:parseScope(v.scope),closed:true as const};if(v.kind==='ok')return{...base,kind:'ok',batch:parseCommentBatch(v.batch)};if(v.kind!=='error'||!['invalid','cancelled','timeout','network','login','permission','unsupported','unknown'].includes(String(v.code)))throw new DomainError('invalid');return{...base,kind:'error',code:v.code as ErrorCode};
}
