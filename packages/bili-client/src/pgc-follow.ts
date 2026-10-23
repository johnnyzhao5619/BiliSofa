import {DomainError,record,text} from '../../contracts/src/index.ts';
import {pgcRawId} from '../../contracts/src/pgc-season.ts';
import {parsePgcFollowPage,parsePgcFollowQuery,type PgcFollowQuery,type PgcFollowPage} from '../../contracts/src/pgc-follow.ts';
import {vodInteger} from '../../contracts/src/vod-catalog.ts';
export function pgcFollowRoot(raw:string):Record<string,unknown> {
 if(typeof raw!=='string'||new TextEncoder().encode(raw).length>4194304)throw new DomainError('invalid');let value:unknown;try{value=JSON.parse(raw);}catch{throw new DomainError('invalid');}return record(value);
}
/** Only display season IDs/text. User payload, API addresses and images stay private. */
export function parsePgcFollowBody(raw:string,value:PgcFollowQuery):PgcFollowPage {
 const query=parsePgcFollowQuery(value),root=pgcFollowRoot(raw);if(root.code!==0)throw new DomainError(root.code===-101?'login':root.code===-403?'permission':'network');
 const d=record(root.data),total=vodInteger(d.total,0,100000);if(!Array.isArray(d.list)||d.list.length>4)throw new DomainError('invalid');
 const items=d.list.map(value=>{const e=record(value);const ep=e.new_ep===undefined||e.new_ep===null?undefined:record(e.new_ep);return {seasonId:pgcRawId(e.season_id),title:text(e.title,160),status:typeof ep?.index_show==='string'&&ep.index_show?text(ep.index_show,96):'',progress:typeof e.progress==='string'&&e.progress?text(e.progress,96):''};});
 return parsePgcFollowPage({...query,total,noMore:items.length<4||query.page*4>=total,items});
}
