import {DomainError,record} from '../../contracts/src/index.ts';
import {pgcRawId} from '../../contracts/src/pgc-season.ts';
import {eachRow,line} from './list-rows.ts';
import {parsePgcFollowCard,parsePgcFollowPage,parsePgcFollowQuery,type PgcFollowQuery,type PgcFollowPage} from '../../contracts/src/pgc-follow.ts';
import {vodInteger} from '../../contracts/src/vod-catalog.ts';
export function pgcFollowRoot(raw:string):Record<string,unknown> {
 if(typeof raw!=='string'||new TextEncoder().encode(raw).length>4194304)throw new DomainError('invalid');let value:unknown;try{value=JSON.parse(raw);}catch{throw new DomainError('invalid');}return record(value);
}
/** Only display season IDs/text. User payload, API addresses and images stay private. */
export function parsePgcFollowBody(raw:string,value:PgcFollowQuery):PgcFollowPage {
 const query=parsePgcFollowQuery(value),root=pgcFollowRoot(raw);if(root.code!==0)throw new DomainError(root.code===-101?'login':root.code===-403?'permission':'network');
 const d=record(root.data),total=vodInteger(d.total,0,100000);if(!Array.isArray(d.list)||d.list.length>4)throw new DomainError('invalid');
 // ADR-111: an unreadable or repeated season is skipped and counted; a full page still means four source rows.
 const seen=new Set<string>();const {items,skipped}=eachRow(d.list,value=>{const e=record(value);const ep=e.new_ep!==null&&typeof e.new_ep==='object'?e.new_ep as Record<string,unknown>:undefined;const card=parsePgcFollowCard({seasonId:pgcRawId(e.season_id),title:line(e.title,160),status:line(ep?.index_show,96),progress:line(e.progress,96)});if(seen.has(card.seasonId))return undefined;seen.add(card.seasonId);return card;});
 return parsePgcFollowPage({...query,total,noMore:d.list.length<4||query.page*4>=total,items,...(skipped?{skipped}:{})});
}
/** Dedicated per-user season status (0.49.1). The season view is cached content and its
 * user_status may lag a write; this read is the follow state. A logged-out reply is login loss. */
export function parsePgcFollowStatusBody(raw:string):'yes'|'no'|'unknown' {
 const root=pgcFollowRoot(raw);if(root.code!==0)throw new DomainError(root.code===-101?'login':root.code===-403?'permission':'network');
 const v=record(root.result??root.data);if(v.login!==1&&v.login!==true)throw new DomainError('login');
 return v.follow===1?'yes':v.follow===0?'no':'unknown';
}
