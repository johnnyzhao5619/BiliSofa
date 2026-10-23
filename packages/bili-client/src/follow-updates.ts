import {DomainError,record,finite,text} from '../../contracts/src/index.ts';
import {parseFollowUpdatesBatch,parseFollowOffset,type FollowUpdatesBatch} from '../../contracts/src/follow-updates.ts';
const field=(value:unknown,fallback:string,max:number)=>value===undefined||value===''?fallback:text(value,512).slice(0,max);
/** Mirrors current official header AllInOneItem; Only a validated public BV identifier may leave the source boundary; links/cursors stay private. */
export function parseFollowUpdatesBody(raw:string,current:string):FollowUpdatesBatch{
 parseFollowOffset(current);if(new TextEncoder().encode(raw).length>524288)throw new DomainError('invalid');let root:Record<string,unknown>;try{root=record(JSON.parse(raw));}catch{throw new DomainError('invalid');}
 const code=finite(root.code,-2147483648,2147483647);if(!Number.isInteger(code))throw new DomainError('invalid');if(code!==0)throw new DomainError(code===-101?'login':code===-403?'permission':'network');const data=record(root.data);
 if(!Array.isArray(data.items)||data.items.length>50||![true,false,0,1].includes(data.has_more as boolean))throw new DomainError('invalid');
 const items=data.items.map(raw=>{const v=record(raw),author=v.author===undefined||v.author===null?{}:record(v.author);if(!Number.isInteger(v.type)||Number(v.type)<0||Number(v.type)>65535)throw new DomainError('invalid');return {title:field(v.title,'未提供标题',120),author:field(author.name,'未提供作者',80),pubTime:field(v.pub_time,'未提供发布时间',80),kind:v.type===64?'article':'video',...(v.type===8&&videoId(v)?{bvid:videoId(v)}:{})};});
 if(!data.has_more)return parseFollowUpdatesBatch({items});const next=parseFollowOffset(data.offset);if(!next||next===current||!items.length)throw new DomainError('invalid');return parseFollowUpdatesBatch({items,next});
}

function videoId(v:Record<string,unknown>):string|undefined{
 const direct=typeof v.bvid==='string'&&/^BV[A-Za-z0-9]{10}$/.test(v.bvid)?v.bvid:undefined;
 const link=typeof v.uri==='string'?v.uri:typeof v.jump_url==='string'?v.jump_url:undefined;
 const match=link?.match(/^(?:https:)?\/\/www\.bilibili\.com\/video\/(BV[A-Za-z0-9]{10})(?:[/?#]|$)/);
 if(direct&&match&&direct!==match[1])return;return direct??match?.[1];
}
