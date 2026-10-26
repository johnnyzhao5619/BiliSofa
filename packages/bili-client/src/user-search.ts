import {DomainError,finite,record} from '../../contracts/src/index.ts';
import {parseUserSearchCard,type UserSearchCard} from '../../contracts/src/user-search.ts';
import type {SearchResponseIssue} from '../../contracts/src/search.ts';
import {SearchBodyError,searchTitle} from './search.ts';
import {clockSeconds,eachRow,line} from './list-rows.ts';
/** One attached video per result preserves full card text inside the 4KiB IPC. */
export function parseUserSearchBody(raw:string,page:number,size:4|20=4):{apiCode:number;items:UserSearchCard[];noMore:boolean;skipped?:number}{
  let issue:SearchResponseIssue='body';
  try{
    if(!Number.isInteger(page)||page<1||page>(size===4?10:5)||new TextEncoder().encode(raw).length>524288)throw new DomainError('invalid');
    issue='json';const root=record(JSON.parse(raw));issue='envelope';const apiCode=finite(root.code,-2147483648,2147483647);if(!Number.isInteger(apiCode))throw new DomainError('invalid');
    if(apiCode!==0)return {apiCode,items:[],noMore:true};const data=record(root.data);issue='pagination';
    const pages=finite(data.numPages,0,1000000),total=finite(data.numResults,0,Number.MAX_SAFE_INTEGER);
    if(data.page!==page||data.pagesize!==size||!Number.isInteger(pages)||!Number.isInteger(total)||(total===0)!==(pages===0)||total>0&&pages<page)throw new DomainError('invalid');
    issue='rows';const rows=data.result===undefined&&total===0?[]:data.result;if(!Array.isArray(rows)||rows.length>size||total===0&&rows.length)throw new DomainError('invalid');
    // ADR-111: an unreadable user row is skipped and counted; an unreadable preview only drops that preview.
    const seen=new Set<string>();const {items,skipped}=eachRow(rows,row=>{
      const v=record(row);if(v.type!=='bili_user')return undefined;
      const mid=v.mid;if(typeof mid!=='number'||!Number.isSafeInteger(mid)||mid<1||seen.has(String(mid)))return undefined;
      const name=searchTitle(line(v.uname,1024)).slice(0,48);if(!name.length)return undefined;
      const count=(n:unknown)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0?n:0;
      let preview;
      try{
        if(Array.isArray(v.res)&&v.res.length&&v.res.length<=3){
          const card=record(v.res[0]),bvid=card.bvid,title=searchTitle(line(card.title,1024));
          const rawViews=typeof card.play==='string'&&/^\d{1,16}$/.test(card.play)?Number(card.play):card.play;
          if(typeof bvid==='string'&&/^BV[A-Za-z0-9]{10}$/.test(bvid)&&title)preview={bvid,title,owner:name,durationSec:clockSeconds(card.duration),views:count(rawViews)};
        }
      }catch(error){if(!(error instanceof DomainError))throw error;preview=undefined;}
      const card=parseUserSearchCard({uid:String(mid),name,fans:count(v.fans),videos:count(v.videos),...(preview?{preview}:{})});seen.add(String(mid));return card;
    });issue='rows';return {apiCode,items,noMore:page>=Math.min(pages,size===4?10:5)||items.length===0,...(skipped?{skipped}:{})};
  }catch{throw new SearchBodyError(issue);}
}
