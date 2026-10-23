import { DomainError, record, text, parseCoverReference, type CoverReference } from './index.ts';
export const VOD_RATES=[1,2] as const;
export type VodRate=typeof VOD_RATES[number];
export type RepeatMode='off'|'one'|'all';
export interface VodItem {bvid:string;part:number;title:string;durationMs:number;}
export interface VodCollectionEntry {title:string;item?:VodItem;}
/** Optional detail-page facts from the same view response (0.48.0). Missing facts are omitted, never guessed. */
export interface VodAbout {description?:string;publishedAt?:number;views?:number;likes?:number;danmaku?:number;face?:CoverReference;}
export interface VodDetail {title:string;owner:string;parts:VodItem[];collection?:{title:string;entries:VodCollectionEntry[]};about?:VodAbout;}
const ABOUT_COUNT=Number.MAX_SAFE_INTEGER;
/** Description text may keep line breaks; every other control character is rejected. */
export function aboutText(value:unknown):string{if(typeof value!=='string'||!value.length||value.length>2000||/[\u0000-\u0009\u000b-\u001f\u007f]/.test(value))throw new DomainError('invalid');return value;}
export function parseVodAbout(value:unknown):VodAbout{
 const v=record(value),allowed=['description','publishedAt','views','likes','danmaku','face'];if(!Object.keys(v).length||Object.keys(v).some(k=>!allowed.includes(k)))throw new DomainError('invalid');
 const count=(n:unknown)=>{if(!Number.isSafeInteger(n)||(n as number)<0||(n as number)>ABOUT_COUNT)throw new DomainError('invalid');return n as number;};
 const about:VodAbout={};
 if(v.description!==undefined)about.description=aboutText(v.description);
 if(v.publishedAt!==undefined){if(!Number.isSafeInteger(v.publishedAt)||(v.publishedAt as number)<=0||(v.publishedAt as number)>=4102444800)throw new DomainError('invalid');about.publishedAt=v.publishedAt as number;}
 for(const k of ['views','likes','danmaku'] as const)if(v[k]!==undefined)about[k]=count(v[k]);
 if(v.face!==undefined)about.face=parseCoverReference(v.face);
 return about;
}
export type VideoCodec='avc'|'hevc'|'av1';
export type AudioCodec='aac'|'eac3'|'flac';
export interface VodVideoOption {key:string;quality:number;label:string;codec:VideoCodec;width:number;height:number;fps:number;bandwidth:number;}
export interface VodAudioOption {key:string;label:string;codec:AudioCodec;bandwidth:number;}
/** URLs/CIDs/credentials are intentionally absent from the UI catalog. */
export interface VodTrackPreference {quality:number;videoCodec:VideoCodec;videoBandwidth:number;audioCodec:AudioCodec;audioBandwidth:number;}
export interface VodCatalog {id:string;item:VodItem;videos:VodVideoOption[];audios:VodAudioOption[];}
export interface VodChoice {catalogId:string;videoKey:string;audioKey:string;}
export interface VodCapabilities {video:readonly VideoCodec[];audio:readonly AudioCodec[];qualities:readonly number[];maxWidth:number;maxHeight:number;maxFps:number;rates:readonly VodRate[];}
export function vodInteger(value:unknown,min:number,max:number):number{if(!Number.isSafeInteger(value)||Number(value)<min||Number(value)>max)throw new DomainError('invalid');return Number(value);}
export function vodKeys(value:Record<string,unknown>,keys:string[]):void{if(Object.keys(value).length!==keys.length||Object.keys(value).some(k=>!keys.includes(k)))throw new DomainError('invalid');}
export function vodBvid(value:unknown):string{if(typeof value!=='string'||!/^BV[A-Za-z0-9]{10}$/.test(value))throw new DomainError('invalid');return value;}
export function parseVodTrackPreference(value:unknown):VodTrackPreference {
 const v=record(value);vodKeys(v,['quality','videoCodec','videoBandwidth','audioCodec','audioBandwidth']);
 if(!['avc','hevc','av1'].includes(String(v.videoCodec))||!['aac','eac3','flac'].includes(String(v.audioCodec)))throw new DomainError('invalid');
 return {quality:vodInteger(v.quality,1,127),videoCodec:v.videoCodec as VideoCodec,videoBandwidth:vodInteger(v.videoBandwidth,1,200000000),audioCodec:v.audioCodec as AudioCodec,audioBandwidth:vodInteger(v.audioBandwidth,1,16000000)};
}
export function parseVodItem(value:unknown):VodItem{const v=record(value);vodKeys(v,['bvid','part','title','durationMs']);return {bvid:vodBvid(v.bvid),part:vodInteger(v.part,1,10000),title:text(v.title,120),durationMs:vodInteger(v.durationMs,1,86400000)};}
export function vodItemKey(value:Pick<VodItem,'bvid'|'part'>):string{return `${vodBvid(value.bvid)}:p${vodInteger(value.part,1,10000)}`;}
export function parseVodChoice(value:unknown):VodChoice{const v=record(value);vodKeys(v,['catalogId','videoKey','audioKey']);if(typeof v.catalogId!=='string'||!/^[a-f0-9]{32}$/.test(v.catalogId)||typeof v.videoKey!=='string'||!/^v[0-9]{1,3}$/.test(v.videoKey)||typeof v.audioKey!=='string'||!/^a[0-9]{1,2}$/.test(v.audioKey))throw new DomainError('invalid');return {catalogId:v.catalogId,videoKey:v.videoKey,audioKey:v.audioKey};}
export function parseVodCatalog(value:unknown):VodCatalog{
 const v=record(value);vodKeys(v,['id','item','videos','audios']);if(typeof v.id!=='string'||!/^[a-f0-9]{32}$/.test(v.id)||!Array.isArray(v.videos)||!v.videos.length||v.videos.length>256||!Array.isArray(v.audios)||!v.audios.length||v.audios.length>64)throw new DomainError('invalid');
 const videos=v.videos.map((raw,i)=>{const r=record(raw);vodKeys(r,['key','quality','label','codec','width','height','fps','bandwidth']);if(r.key!=='v'+i||!['avc','hevc','av1'].includes(String(r.codec))||typeof r.fps!=='number'||!Number.isFinite(r.fps)||r.fps<=0||r.fps>240)throw new DomainError('invalid');return {key:r.key,quality:vodInteger(r.quality,1,127),label:text(r.label,64),codec:r.codec as VideoCodec,width:vodInteger(r.width,1,16384),height:vodInteger(r.height,1,8640),fps:r.fps,bandwidth:vodInteger(r.bandwidth,1,200000000)};});
 const audios=v.audios.map((raw,i)=>{const r=record(raw);vodKeys(r,['key','label','codec','bandwidth']);if(r.key!=='a'+i||!['aac','eac3','flac'].includes(String(r.codec)))throw new DomainError('invalid');return {key:r.key,label:text(r.label,64),codec:r.codec as AudioCodec,bandwidth:vodInteger(r.bandwidth,1,16000000)};});
 return {id:v.id,item:parseVodItem(v.item),videos,audios};
}
/** Candidate policy from the adapter; eligibility is not proof of hardware support. Actual decode failures are handled by the playback owner. */
export function vodChoiceSupported(catalog:VodCatalog,value:unknown,caps:VodCapabilities):boolean{
 const choice=parseVodChoice(value);if(choice.catalogId!==catalog.id)return false;const video=catalog.videos.find(v=>v.key===choice.videoKey),audio=catalog.audios.find(a=>a.key===choice.audioKey);return !!video&&!!audio&&caps.video.includes(video.codec)&&caps.audio.includes(audio.codec)&&caps.qualities.includes(video.quality)&&video.width<=caps.maxWidth&&video.height<=caps.maxHeight&&video.fps<=caps.maxFps;
}
export function parseVodDetailSummary(value:unknown):VodDetail{
 const v=record(value),keys=['title','owner','parts',...(v.collection===undefined?[]:['collection']),...(v.about===undefined?[]:['about'])];vodKeys(v,keys);
 if(!Array.isArray(v.parts)||!v.parts.length||v.parts.length>10000)throw new DomainError('invalid');
 const parts=v.parts.map(parseVodItem);
 if(parts.some((p,i)=>p.part!==i+1||p.bvid!==parts[0]!.bvid))throw new DomainError('invalid');
 const result:VodDetail={title:text(v.title,120),owner:text(v.owner,48),parts};
 if(v.about!==undefined)result.about=parseVodAbout(v.about);
 if(v.collection!==undefined){
  const c=record(v.collection);vodKeys(c,['title','entries']);if(!Array.isArray(c.entries)||c.entries.length>10000)throw new DomainError('invalid');
  result.collection={title:text(c.title,120),entries:c.entries.map(raw=>{const entry=record(raw);vodKeys(entry,['title',...(entry.item===undefined?[]:['item'])]);return {title:text(entry.title,120),...(entry.item===undefined?{}:{item:parseVodItem(entry.item)})};})};
 }
 return result;
}
