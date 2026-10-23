import {DomainError,finite,record,text} from '../../contracts/src/index.ts';
import {parseUserSearchCard,type UserSearchCard} from '../../contracts/src/user-search.ts';
import type {SearchResponseIssue} from '../../contracts/src/search.ts';
import {SearchBodyError,searchTitle} from './search.ts';
/** One attached video per result preserves full card text inside the 4KiB IPC. */
export function parseUserSearchBody(raw:string,page:number):{apiCode:number;items:UserSearchCard[];noMore:boolean}{
  let issue:SearchResponseIssue='body';
  try{
    if(!Number.isInteger(page)||page<1||page>10||new TextEncoder().encode(raw).length>524288)throw new DomainError('invalid');
    issue='json';const root=record(JSON.parse(raw));issue='envelope';const apiCode=finite(root.code,-2147483648,2147483647);if(!Number.isInteger(apiCode))throw new DomainError('invalid');
    if(apiCode!==0)return {apiCode,items:[],noMore:true};const data=record(root.data);issue='pagination';
    const pages=finite(data.numPages,0,1000000),total=finite(data.numResults,0,Number.MAX_SAFE_INTEGER);
    if(data.page!==page||data.pagesize!==4||!Number.isInteger(pages)||!Number.isInteger(total)||(total===0)!==(pages===0)||total>0&&pages<page)throw new DomainError('invalid');
    issue='rows';const rows=data.result===undefined&&total===0?[]:data.result;if(!Array.isArray(rows)||rows.length>4||total===0&&rows.length)throw new DomainError('invalid');
    const seen=new Set<string>();const items=rows.map(row=>{
      issue='rows';const v=record(row);issue='type';if(v.type!=='bili_user')throw new DomainError('invalid');
      issue='identity';const mid=finite(v.mid,1,Number.MAX_SAFE_INTEGER);if(!Number.isInteger(mid)||seen.has(String(mid)))throw new DomainError('invalid');seen.add(String(mid));
      issue='text';const name=searchTitle(v.uname).slice(0,48);if(!name.length)throw new DomainError('invalid');
      issue='counts';const fans=finite(v.fans,0,Number.MAX_SAFE_INTEGER),videos=finite(v.videos,0,Number.MAX_SAFE_INTEGER);if(!Number.isInteger(fans)||!Number.isInteger(videos))throw new DomainError('invalid');
      issue='preview';if(v.res!==undefined&&(!Array.isArray(v.res)||v.res.length>3))throw new DomainError('invalid');
      let preview;
      if(Array.isArray(v.res)&&v.res.length){
        const card=record(v.res[0]),bvid=text(card.bvid,12),duration=text(card.duration,10);
        if(!/^BV[A-Za-z0-9]{10}$/.test(bvid)||!/^\d{1,4}:[0-5]?\d$/.test(duration))throw new DomainError('invalid');
        const[m,s]=duration.split(':').map(Number),durationSec=m!*60+s!;if(durationSec>86400)throw new DomainError('invalid');
        const rawViews=typeof card.play==='string'&&/^\d{1,16}$/.test(card.play)?Number(card.play):card.play,views=finite(rawViews,0,Number.MAX_SAFE_INTEGER);if(!Number.isInteger(views))throw new DomainError('invalid');
        preview={bvid,title:searchTitle(card.title),owner:name,durationSec,views};
      }
      return parseUserSearchCard({uid:String(mid),name,fans,videos,...(preview?{preview}:{})});
    });return {apiCode,items,noMore:page>=Math.min(pages,10)||items.length===0};
  }catch{throw new SearchBodyError(issue);}
}
