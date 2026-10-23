import {publicArtwork} from './public-artwork.ts';
import {DomainError,record,finite,text} from '../../contracts/src/index.ts';
import {parseWatchLaterPage,type WatchLaterPage} from '../../contracts/src/watch-later.ts';
/** Current official playlist normalizer's arc_info/is_pgc/state/pages fields.
 * No account data, remote markup, arbitrary URLs or playback authority leave this parser. */
export function parseWatchLaterBody(raw:string,page:number):WatchLaterPage{
 if(new TextEncoder().encode(raw).length>524288)throw new DomainError('invalid');let decoded:unknown;try{decoded=JSON.parse(raw);}catch{throw new DomainError('invalid');}
 const root=record(decoded),code=finite(root.code,-2147483648,2147483647);if(!Number.isInteger(code))throw new DomainError('invalid');if(code!==0)throw new DomainError(code===-101?'login':code===-403?'permission':'network');
 const data=record(root.data);if(!Array.isArray(data.list)||data.list.length>4||![true,false,0,1].includes(data.has_more as boolean))throw new DomainError('invalid');
 const items=data.list.map(raw=>{const row=record(raw),arc=row.arc_info===undefined||row.arc_info===null?undefined:record(row.arc_info);const pgc=row.is_pgc;
 if(pgc!==undefined&&pgc!==null&&![true,false,0,1].includes(pgc as boolean))throw new DomainError('invalid');
 if(arc?.state!==undefined&&(!Number.isSafeInteger(arc.state)||Number(arc.state)<-2147483648||Number(arc.state)>2147483647))throw new DomainError('invalid');
 if(arc?.pages!==undefined&&(!Array.isArray(arc.pages)||arc.pages.length>10000))throw new DomainError('invalid');
 const cover=publicArtwork(arc?.pic??arc?.cover);const bvid=pgc===false||pgc===0?row.bvid:undefined;
 return {...(typeof bvid==='string'&&/^BV[A-Za-z0-9]{10}$/.test(bvid)?{bvid}:{}),...(cover?{cover}:{}),title:arc?.title===undefined||arc.title===''?'未提供标题':text(arc.title,512).slice(0,120),kind:pgc===true||pgc===1?'pgc':pgc===false||pgc===0?'ugc':'unknown',availability:arc?.state===undefined?'unknown':Number(arc.state)<0?'unavailable':'available',partCount:Array.isArray(arc?.pages)?arc.pages.length:0};});
 return parseWatchLaterPage({page,items,noMore:!data.has_more,total:data.count});
}
