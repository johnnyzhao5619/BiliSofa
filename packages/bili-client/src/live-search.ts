import {DomainError,finite,record,text} from '../../contracts/src/index.ts';
import {parseLiveSearchCard,type LiveSearchCard,type LiveRoomState} from '../../contracts/src/live-search.ts';
import type {SearchResponseIssue} from '../../contracts/src/search.ts';
import {SearchBodyError,searchTitle} from './search.ts';
export function parseLiveSearchBody(raw:string,page:number):{apiCode:number;items:LiveSearchCard[];noMore:boolean}{
 let issue:SearchResponseIssue='body';
 try{
  if(!Number.isInteger(page)||page<1||page>10||new TextEncoder().encode(raw).length>524288)throw new DomainError('invalid');
  issue='json';const root=record(JSON.parse(raw));issue='envelope';const apiCode=finite(root.code,-2147483648,2147483647);if(!Number.isInteger(apiCode))throw new DomainError('invalid');
  if(apiCode!==0)return {apiCode,items:[],noMore:true};const data=record(root.data);issue='pagination';
  const pages=finite(data.numPages,0,1000000),total=finite(data.numResults,0,Number.MAX_SAFE_INTEGER);
  if(data.page!==page||data.pagesize!==4||!Number.isInteger(pages)||!Number.isInteger(total)||(total===0)!==(pages===0)||total>0&&pages<page)throw new DomainError('invalid');
  issue='rows';const rows=data.result===undefined&&total===0?[]:data.result;if(!Array.isArray(rows)||rows.length>4||total===0&&rows.length)throw new DomainError('invalid');
  const seen=new Set<string>();const items=rows.map(row=>{
   issue='rows';const v=record(row);issue='type';if(v.type!=='live_room')throw new DomainError('invalid');
   issue='identity';const id=finite(v.roomid,1,Number.MAX_SAFE_INTEGER);if(!Number.isInteger(id)||seen.has(String(id)))throw new DomainError('invalid');seen.add(String(id));
   issue='text';const title=searchTitle(v.title),owner=searchTitle(v.uname).slice(0,48);if(!title.length||!owner.length)throw new DomainError('invalid');
   issue='metadata';const label=(v:unknown)=>v===undefined||v===null||v===''?'':text(v,2048).slice(0,32);const category=label(v.cate_name),tags=label(v.tags);
   issue='counts';const popularity=finite(v.online,0,Number.MAX_SAFE_INTEGER);if(!Number.isInteger(popularity))throw new DomainError('invalid');
   issue='state';let state:LiveRoomState='unknown';if(v.live_status!==undefined&&v.live_status!==null){const flag=finite(v.live_status,0,2);if(!Number.isInteger(flag))throw new DomainError('invalid');state=flag===1?'live':'unknown';}
   // Ignore cover/links, alternate short IDs, attention counts and live_time.
   return parseLiveSearchCard({roomId:String(id),title,owner,category,tags,popularity,state});
  });return {apiCode,items,noMore:page>=Math.min(pages,10)||items.length===0};
 }catch{throw new SearchBodyError(issue);}
}
