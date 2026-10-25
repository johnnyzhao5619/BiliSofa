import {publicArtwork} from './public-artwork.ts';
import {DomainError,record,finite,text} from '../../contracts/src/index.ts';
import {parseFavoriteFoldersBatch,parseFavoriteItemsPage,type FavoriteFoldersBatch,type FavoriteItemsPage,type FavoriteItemsQuery} from '../../contracts/src/favorites.ts';
function body(raw:string){if(new TextEncoder().encode(raw).length>524288)throw new DomainError('invalid');let root:Record<string,unknown>;try{root=record(JSON.parse(raw));}catch{throw new DomainError('invalid');}const code=finite(root.code,-2147483648,2147483647);if(!Number.isInteger(code))throw new DomainError('invalid');if(code!==0)throw new DomainError(code===-101?'login':code===-403?'permission':'network');return root.data;}
const title=(v:unknown)=>v===undefined||v===''?'未提供标题':text(v,512).slice(0,120);
/** Official header navigation is a bounded window; count disagreement is not hidden. */
export function parseFavoriteFoldersBody(raw:string):FavoriteFoldersBatch{const data=body(raw);if(!Array.isArray(data)||!data.length||data.length>10)throw new DomainError('invalid');const r=record(record(data[0]).mediaListResponse);if(!Array.isArray(r.list)||r.list.length>100)throw new DomainError('invalid');return parseFavoriteFoldersBatch({total:r.count,items:r.list.map(raw=>{const row=record(raw);return {id:row.id,title:title(row.title),count:row.media_count};})});}
/** Current official playlist collection type=3, real has_more and total_count. */
/** `rows` is the requested ps: 4, or 20 for one ADR-108 account kernel batch. */
export function parseFavoriteItemsBody(raw:string,query:FavoriteItemsQuery,rows:4|20=4):FavoriteItemsPage{
 const data=record(body(raw)),total=finite(data.total_count,0,1000000),offset=(query.page-1)*rows;
 if(!Number.isInteger(total)||![true,false,0,1].includes(data.has_more as boolean))throw new DomainError('invalid');
 // Null is a legitimate empty terminal representation, never a substitute for missing content.
 const list=data.media_list===null&&!data.has_more&&offset>=total?[]:data.media_list;
 if(!Array.isArray(list)||list.length>rows)throw new DomainError('invalid');
 const items=list.map(raw=>{const v=record(raw);if(v.pages!==undefined&&v.pages!==null&&(!Array.isArray(v.pages)||v.pages.length>10000))throw new DomainError('invalid');const cover=publicArtwork(v.cover);return {...(cover?{cover}:{}),...(v.type===2&&typeof v.bv_id==='string'&&/^BV[A-Za-z0-9]{10}$/.test(v.bv_id)?{bvid:v.bv_id}:{}),title:title(v.title),kind:v.type===2?'ugc':[24,42].includes(Number(v.type))?'pgc':v.type===25?'course':'unknown',providedParts:Array.isArray(v.pages)?v.pages.length:0};});
 if(!items.length&&data.has_more)throw new DomainError('invalid');
 return parseFavoriteItemsPage({...query,items,total,noMore:!data.has_more||offset+items.length>=total},rows);
}
