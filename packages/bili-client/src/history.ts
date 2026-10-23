import {publicArtwork} from './public-artwork.ts';
import {DomainError,record,finite,text} from '../../contracts/src/index.ts';
import {parseHistoryBatch,parseHistoryCursor,type HistoryBatch,type HistoryCursor} from '../../contracts/src/history.ts';
/** The current official page stops only on an empty batch, not an invented total. */
export function parseHistoryBody(raw:string,current:HistoryCursor):HistoryBatch{
 if(new TextEncoder().encode(raw).length>524288)throw new DomainError('invalid');let root:Record<string,unknown>;try{root=record(JSON.parse(raw));}catch{throw new DomainError('invalid');}
 const code=finite(root.code,-2147483648,2147483647);if(!Number.isInteger(code))throw new DomainError('invalid');if(code!==0)throw new DomainError(code===-101?'login':code===-403?'permission':'network');
 const data=record(root.data);if(!Array.isArray(data.list)||data.list.length>100)throw new DomainError('invalid');
 const items=data.list.map(raw=>{const v=record(raw),h=record(v.history);const kind=h.business==='archive'?'ugc':h.business==='pgc'?'pgc':h.business==='live'?'live':['article','article-list'].includes(String(h.business))?'article':h.business==='cheese'?'course':'unknown';const timed=['ugc','pgc','course'].includes(kind),cover=publicArtwork(v.cover);
 return {...(kind==='ugc'&&typeof h.bvid==='string'&&/^BV[A-Za-z0-9]{10}$/.test(h.bvid)?{bvid:h.bvid}:{}),...(cover?{cover}:{}),title:v.title===undefined||v.title===''?'未提供标题':text(v.title,512).slice(0,120),kind,viewedAtSec:v.view_at,progressSec:timed&&v.progress!==undefined?v.progress:null,durationSec:timed&&v.duration!==undefined?v.duration:null,part:kind==='ugc'&&Number.isInteger(h.page)&&Number(h.page)>0?h.page:null};});
 if(!items.length)return {items:[]};const cursor=record(data.cursor),next=parseHistoryCursor({max:cursor.max,viewAtSec:cursor.view_at,business:cursor.business});if(JSON.stringify(next)===JSON.stringify(parseHistoryCursor(current)))throw new DomainError('invalid');return parseHistoryBatch({items,next});
}
