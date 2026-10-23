import {DomainError,record,text} from '../../contracts/src/index.ts';
import {vodInteger} from '../../contracts/src/vod-catalog.ts';
import {interactionId,parseInteractionState,type InteractionState} from '../../contracts/src/video-interactions.ts';
export function interactionRoot(raw:string):Record<string,unknown>{
 if(new TextEncoder().encode(raw).length>1048576)throw new DomainError('invalid');let root:Record<string,unknown>;try{root=record(JSON.parse(raw));}catch{throw new DomainError('invalid');}
 if(root.code===-101||root.code===-111)throw new DomainError('login');if(root.code!==0)throw new DomainError('permission');return root;
}
const id=(v:unknown)=>interactionId(typeof v==='number'&&Number.isSafeInteger(v)?String(v):v);
const flag=(v:unknown)=>{if(v===true||v===1)return true;if(v===false||v===0)return false;throw new DomainError('invalid');};
export function interactionVideo(raw:string,bvid:string):Pick<InteractionState,'bvid'|'aid'|'ownerId'|'owner'|'title'|'coinLimit'>{
 const v=record(interactionRoot(raw).data),owner=record(v.owner);if(v.bvid!==bvid)throw new DomainError('invalid');const copyright=vodInteger(v.copyright,1,3);
 return{bvid,aid:id(v.aid),ownerId:id(owner.mid),owner:text(owner.name,128),title:text(v.title,240),coinLimit:copyright===1||copyright===3?2:1};
}
export function interactionLike(raw:string):boolean{return flag(record(interactionRoot(raw).data).like);}
export function interactionCoins(raw:string):number{return vodInteger(record(interactionRoot(raw).data).coin,0,2);}
export function interactionRelation(raw:string):{liked:boolean;coins:number}{return{liked:interactionLike(raw),coins:interactionCoins(raw)};}
export function interactionFollow(raw:string,ownerId:string):{followed:boolean;followMode:number}{
 const v=record(interactionRoot(raw).data);interactionId(ownerId);const attr=vodInteger(v.attribute,0,128);
 if(![0,1,2,6,128].includes(attr))throw new DomainError('unsupported');
 // Official consumers use attribute. The target comes from the fixed fid
 // request, not optional/default response metadata with undocumented semantics.
 return{followed:[1,2,6].includes(attr),followMode:attr};
}
export function interactionFolders(raw:string):NonNullable<InteractionState['folders']>{
 const v=record(interactionRoot(raw).data);if(v.list===null&&Number(v.count)===0)return[];if(!Array.isArray(v.list)||v.list.length>100||v.count!==undefined&&v.count!==v.list.length)throw new DomainError('invalid');
 const folders=v.list.map(raw=>{const f=record(raw);return{id:id(f.id),title:text(f.title,160),selected:flag(f.fav_state)};});
 if(new Set(folders.map(f=>f.id)).size!==folders.length)throw new DomainError('invalid');return folders;
}
export function interactionWatchLater(raw:string,aid:string):boolean{
 const v=record(interactionRoot(raw).data);if(!Array.isArray(v.list)||v.list.length>1000||!Number.isSafeInteger(v.count)||Number(v.count)!==v.list.length)throw new DomainError('invalid');
 const ids=v.list.map(raw=>id(record(raw).aid));if(new Set(ids).size!==ids.length)throw new DomainError('invalid');return ids.includes(aid);
}
export function interactionBalance(raw:string):number{const v=record(interactionRoot(raw).data);if(typeof v.money!=='number'||!Number.isFinite(v.money)||v.money<0||v.money>1e9)throw new DomainError('invalid');return v.money;}
export function completeInteractionState(value:InteractionState):InteractionState{return parseInteractionState(value);}
