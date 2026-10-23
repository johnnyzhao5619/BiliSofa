import {DomainError,record} from '../../contracts/src/index.ts';
import {parseLiveBatch,parseLiveAreas,parseLiveCatalog,parseLiveMessages,parseLiveSelection,liveId,type LiveBatch,type LiveArea,type LiveCard,type LiveCatalog,type LiveSelection,type LiveMessages} from '../../contracts/src/live-product.ts';
import {pgcRawId} from '../../contracts/src/pgc-season.ts';
import {vodInteger,type VodCapabilities} from '../../contracts/src/vod-catalog.ts';
import {liveSourceUrl} from '../../contracts/src/live-probe.ts';
export class LiveApiError extends DomainError {constructor(readonly apiCode:number){super(apiCode===-101?'login':[-403,10015001,10015002].includes(apiCode)?'permission':'network');}}
function root(raw:string):Record<string,unknown>{if(new TextEncoder().encode(raw).length>4194304)throw new DomainError('invalid');let decoded:unknown;try{decoded=JSON.parse(raw);}catch{throw new DomainError('invalid');}const v=record(decoded),code=vodInteger(v.code,-2147483648,2147483647);if(code!==0)throw new LiveApiError(code);return v;}
function caption(value:unknown,max:number,empty=false):string {if(empty&&(value===null||value===undefined||value===''))return '';if(typeof value!=='string'||value.length>32768)throw new DomainError('invalid');const s=value.replace(/[\u0000-\u001f\u007f]+/g,' ').trim().slice(0,max);if(!s&&!empty)throw new DomainError('invalid');return s;}
function numeric(value:unknown):number {return vodInteger(typeof value==='string'&&/^(0|[1-9][0-9]{0,15})$/.test(value)?Number(value):value,0,Number.MAX_SAFE_INTEGER);}
function flag(value:unknown):boolean {if(value===true||value===1)return true;if(value===false||value===0)return false;throw new DomainError('invalid');}
function cards(value:unknown,following=false):LiveCard[]{
  if(!Array.isArray(value)||value.length>100)throw new DomainError('invalid');const seen=new Set<string>();
  return value.map(raw=>{const e=record(raw),id=e.roomid===undefined?e.room_id:e.roomid,roomId=id===0||id==='0'||id===undefined?undefined:pgcRawId(numeric(id));
    if(roomId&&seen.has(roomId))throw new DomainError('invalid');if(roomId)seen.add(roomId);
    const status=e.live_status===undefined?(following?'unknown':'live'):numeric(e.live_status)===1?'live':'offline';const owner=caption(e.uname,80),title=caption(e.title,160,true)||owner;
    return {...(roomId?{roomId}:{}),title,owner,category:caption(e.area_name_v2??e.area_v2_name??e.area_name,64,true),state:status} as LiveCard;
  });
}
export function parseLiveRecommendations(raw:string):LiveBatch {
  const d=record(root(raw).data);if(!Array.isArray(d.room_list)||d.room_list.length>64)throw new DomainError('invalid');
  const group=d.room_list.map(record).find(e=>e.module_info!==null&&e.module_info!==undefined&&[6,7].includes(Number(record(e.module_info).type)));
  const value=group?.list??d.recommend_room_list;return parseLiveBatch({items:cards(value),noMore:true});
}
export function parseLiveAreaBody(raw:string):LiveArea[]{
  const data=root(raw).data;if(!Array.isArray(data)||data.length>64)throw new DomainError('invalid');
  return parseLiveAreas(data.map(raw=>{const g=record(raw),id=pgcRawId(numeric(g.id));if(!Array.isArray(g.list)||g.list.length>1024)throw new DomainError('invalid');return {id,title:caption(g.name,64),children:g.list.map(raw=>{const c=record(raw);if(pgcRawId(numeric(c.parent_id))!==id)throw new DomainError('invalid');return {id:pgcRawId(numeric(c.id)),title:caption(c.name,64)};})};}));
}
export function parseLiveAreaRooms(raw:string):LiveBatch {const d=record(root(raw).data),more=numeric(d.has_more);if(more!==0&&more!==1)throw new DomainError('invalid');return parseLiveBatch({items:cards(d.list),noMore:more===0});}
export function parseLiveFollowing(raw:string,page:number):LiveBatch {vodInteger(page,1,25000);const d=record(root(raw).data),totalPage=vodInteger(numeric(d.totalPage),0,25000);return parseLiveBatch({items:cards(d.list,true),noMore:page>=totalPage});}
export interface PrivateLiveSource {summary:LiveCatalog;url?:string;alternates?:string[];}
/** Metadata/rights and the actual returned variant determine the source. A
 * requested qn or the advertised descriptions alone never prove a capability. */
export function parseLiveSource(raw:string,value:LiveSelection,id:string,_caps:VodCapabilities):PrivateLiveSource {
  const selection=parseLiveSelection(value),d=record(root(raw).data),roomId=pgcRawId(numeric(d.room_id));
  // Product cards carry canonical IDs, unlike the old fixed short-ID probe.
  if(roomId!==selection.roomId)throw new DomainError('invalid');
  if(flag(d.is_hidden)||flag(d.is_locked)||flag(d.encrypted)||numeric(d.hidden_till??0)!==0||numeric(d.lock_till??0)!==0)throw new DomainError('permission');
  const offline=()=>({summary:parseLiveCatalog({id,roomId,state:'offline',selectedQn:0,qualities:[],width:0,height:0,video:'',audio:''})});
  if(numeric(d.live_status)!==1)return offline();
  const play=record(record(d.playurl_info).playurl);
  if(!Array.isArray(play.g_qn_desc)||play.g_qn_desc.length>32||!Array.isArray(play.stream)||play.stream.length>4)throw new DomainError('invalid');
  const names=new Map<number,string>(play.g_qn_desc.map(raw=>{const q=record(raw);return [vodInteger(q.qn,1,100000),caption(q.desc,64)];}));
  for(const stream of play.stream){const s=record(stream);if(s.protocol_name!=='http_hls')continue;if(!Array.isArray(s.format)||s.format.length>4)throw new DomainError('invalid');
    for(const format of s.format){const f=record(format);if(f.format_name!=='ts')continue;if(!Array.isArray(f.codec)||f.codec.length>4)throw new DomainError('invalid');
      for(const codec of f.codec){const c=record(codec);if(c.codec_name!=='avc')continue;
        if(flag(c.drm)||numeric(c.hdr_type)!==0||numeric(c.dolby_type??0)!==0)throw new DomainError('unsupported');
        const video=caption(record(c.video_codecs).base,48),audio=caption(record(c.audio_codecs).base,48),info=record(c.media_info),width=vodInteger(info.width,1,16384),height=vodInteger(info.height,1,8640);
        if(!/^avc1\.[a-fA-F0-9]{6}$/.test(video)||audio!=='mp4a.40.2')throw new DomainError('unsupported');
        const selectedQn=vodInteger(c.current_qn,1,100000);if(!Array.isArray(c.accept_qn)||!c.accept_qn.length||c.accept_qn.length>32)throw new DomainError('invalid');
        const qualities=c.accept_qn.map(q=>{const qn=vodInteger(q,1,100000),label=names.get(qn);if(!label)throw new DomainError('invalid');return {qn,label};});

        if(typeof c.base_url!=='string'||c.base_url.length>1024||!c.base_url.startsWith('/')||c.base_url.startsWith('//')||c.base_url.includes('#')||!Array.isArray(c.url_info)||!c.url_info.length||c.url_info.length>8)throw new DomainError('invalid');
        const candidates=[...new Set(c.url_info.map(raw=>{const entry=record(raw);return liveSourceUrl(entry.host,c.base_url,entry.extra);}))].slice(0,3);
        const url=candidates[0]!;
        const candidate={summary:parseLiveCatalog({id,roomId,state:'live',selectedQn,qualities,width,height,video,audio}),url,alternates:candidates.slice(1)};return candidate;
      }
    }
  }
  throw new DomainError('unsupported');
}
/** Official recent-message read model, not a VOD timeline or full message log.
 * Keys are hashes of display fields; UID/medals/tokens are never released. */
export async function parseLiveHistory(raw:string,roomId:string,hash:(value:string)=>Promise<string>):Promise<LiveMessages>{
  liveId(roomId);const d=record(root(raw).data);if(!Array.isArray(d.room)||d.room.length>100)throw new DomainError('invalid');
  const rows=await Promise.all(d.room.map(async value=>{const m=record(value),body=caption(m.text,300),author=caption(m.nickname??m.uname,64),timeline=caption(m.timeline,24);
    if(!/^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$/.test(timeline))throw new DomainError('invalid');
    const atMs=Date.parse(timeline.replace(' ','T')+'+08:00');if(!Number.isSafeInteger(atMs)||new Date(atMs+28800000).toISOString().slice(0,19).replace('T',' ')!==timeline)throw new DomainError('invalid');
    return {key:await hash(JSON.stringify([roomId,timeline,author,body])),author,body,atMs};}));
  const items=[...new Map(rows.map(row=>[row.key,row])).values()].sort((a,b)=>a.atMs-b.atMs);return parseLiveMessages({roomId,items});
}
