import {publicArtwork} from './public-artwork.ts';
import {DomainError,record,finite} from '../../contracts/src/index.ts';
import {parseWatchLaterCard,parseWatchLaterPage,type WatchLaterPage} from '../../contracts/src/watch-later.ts';
import {eachRow,line} from './list-rows.ts';
/** Current official playlist normalizer's arc_info/is_pgc/state/pages fields.
 * No account data, remote markup, arbitrary URLs or playback authority leave this parser. */
/** `rows` is the requested ps: 4, or 20 for one ADR-108 account kernel batch. */
export function parseWatchLaterBody(raw:string,page:number,rows:4|20=4):WatchLaterPage{
 if(new TextEncoder().encode(raw).length>524288)throw new DomainError('invalid');let decoded:unknown;try{decoded=JSON.parse(raw);}catch{throw new DomainError('invalid');}
 const root=record(decoded),code=finite(root.code,-2147483648,2147483647);if(!Number.isInteger(code))throw new DomainError('invalid');if(code!==0)throw new DomainError(code===-101?'login':code===-403?'permission':'network');
 const data=record(root.data);if(!Array.isArray(data.list)||data.list.length>rows||![true,false,0,1].includes(data.has_more as boolean))throw new DomainError('invalid');
 // ADR-111: an unreadable row is skipped and counted; unreadable flags read as unknown.
 const {items,skipped}=eachRow(data.list,raw=>{const row=record(raw),arc=row.arc_info===undefined||row.arc_info===null?undefined:record(row.arc_info);const pgc=[true,false,0,1].includes(row.is_pgc as boolean)?row.is_pgc:undefined;
 const state=Number.isSafeInteger(arc?.state)&&Number(arc!.state)>=-2147483648&&Number(arc!.state)<=2147483647?Number(arc!.state):undefined;
 const parts=Array.isArray(arc?.pages)&&arc.pages.length<=10000?arc.pages.length:0;
 const cover=publicArtwork(arc?.pic??arc?.cover);const bvid=pgc===false||pgc===0?row.bvid:undefined;
 return parseWatchLaterCard({...(typeof bvid==='string'&&/^BV[A-Za-z0-9]{10}$/.test(bvid)?{bvid}:{}),...(cover?{cover}:{}),title:line(arc?.title,120)||'未提供标题',kind:pgc===true||pgc===1?'pgc':pgc===false||pgc===0?'ugc':'unknown',availability:state===undefined?'unknown':state<0?'unavailable':'available',partCount:parts});});
 return parseWatchLaterPage({page,items,noMore:!data.has_more,total:data.count,...(skipped?{skipped}:{})},rows);
}
