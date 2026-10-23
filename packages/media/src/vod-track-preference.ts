import {DomainError} from '../../contracts/src/index.ts';
import {parseVodTrackPreference,parseVodChoice,vodChoiceSupported,type VodChoice,type VodCatalog,type VodCapabilities,type VodTrackPreference} from '../../contracts/src/vod-catalog.ts';
import type {VodReadResult} from '../../contracts/src/vod-runtime.ts';
/** Without a remembered intent: AVC first (ADR-055), then the best quality up to
 * 1080P (qn 80) so the first play is not the lowest track; 1080P+/4K/HDR stay explicit. */
export const DEFAULT_QUALITY_CEILING=80;
/** Semantic intent only. Keys/nonces belong to one source catalog and must
 * never be reused as a preference for another item or refreshed response. */
export function vodPreference(catalog:VodCatalog,value:VodChoice):VodTrackPreference {
 const c=parseVodChoice(value),v=catalog.videos.find(v=>v.key===c.videoKey),a=catalog.audios.find(a=>a.key===c.audioKey);
 if(c.catalogId!==catalog.id||!v||!a)throw new DomainError('invalid');return {quality:v.quality,videoCodec:v.codec,videoBandwidth:v.bandwidth,audioCodec:a.codec,audioBandwidth:a.bandwidth};
}
export function preferredVodChoice(result:VodReadResult,caps:VodCapabilities,preference?:VodTrackPreference):{choice:VodChoice;fallback:boolean}{
 if(preference)preference=parseVodTrackPreference(preference);
 const c=result.catalog;
 const videos=c.videos.filter(v=>c.audios.some(a=>vodChoiceSupported(c,{catalogId:c.id,videoKey:v.key,audioKey:a.key},caps)));
 const rank=(v:typeof videos[number])=>preference?[v.codec===preference.videoCodec?0:1,v.quality<=preference.quality?0:1,Math.abs(v.quality-preference.quality),Math.abs(v.bandwidth-preference.videoBandwidth)]:[v.codec==='avc'?0:v.codec==='hevc'?1:2,v.quality<=DEFAULT_QUALITY_CEILING?0:1,v.quality<=DEFAULT_QUALITY_CEILING?-v.quality:v.quality,-v.bandwidth];
 const compare=(a:number[],b:number[])=>{for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]!-b[i]!;return 0;};
 videos.sort((a,b)=>compare(rank(a),rank(b)));const video=videos[0];if(!video)throw new DomainError('unsupported');
 const audios=c.audios.filter(a=>vodChoiceSupported(c,{catalogId:c.id,videoKey:video.key,audioKey:a.key},caps));
 audios.sort((a,b)=>preference?compare([a.codec===preference.audioCodec?0:1,Math.abs(a.bandwidth-preference.audioBandwidth)],[b.codec===preference.audioCodec?0:1,Math.abs(b.bandwidth-preference.audioBandwidth)]):compare([a.codec==='aac'?0:a.codec==='eac3'?1:2,-a.bandwidth],[b.codec==='aac'?0:b.codec==='eac3'?1:2,-b.bandwidth]));
 const audio=audios[0];if(!audio)throw new DomainError('unsupported');const choice={catalogId:c.id,videoKey:video.key,audioKey:audio.key};
 return {choice,fallback:!!preference&&(video.quality!==preference.quality||video.codec!==preference.videoCodec||audio.codec!==preference.audioCodec||audio.bandwidth!==preference.audioBandwidth)};
}
/** Runtime downgrade after a genuine prepare/playback failure. Never invent a
 * quality, carry a foreign key, retry a failed pair, or raise the failed quality.
 * Prefer a different video representation (AVC first) with ordinary AAC audio;
 * when only one video exists, a lower audio representation is still useful. */
export function fallbackVodChoice(catalog:VodCatalog,current:VodChoice,caps:VodCapabilities,tried:ReadonlySet<string>):VodChoice|undefined {
 const selected=vodPreference(catalog,current),pairs:VodChoice[]=[];
 for(const video of catalog.videos)for(const audio of catalog.audios){
  const choice={catalogId:catalog.id,videoKey:video.key,audioKey:audio.key};
  if(video.quality<=selected.quality&&!tried.has(`${video.key}/${audio.key}`)&&vodChoiceSupported(catalog,choice,caps))pairs.push(choice);
 }
 const rank=(choice:VodChoice)=>{
  const v=catalog.videos.find(v=>v.key===choice.videoKey)!,a=catalog.audios.find(a=>a.key===choice.audioKey)!;
  return [v.key===current.videoKey?1:0,v.codec==='avc'?0:v.codec==='hevc'?1:2,a.codec==='aac'?0:a.codec==='eac3'?1:2,selected.quality-v.quality,a.bandwidth<=selected.audioBandwidth?0:1,Math.abs(a.bandwidth-selected.audioBandwidth),v.bandwidth];
 };
 pairs.sort((a,b)=>{const ar=rank(a),br=rank(b);for(let i=0;i<ar.length;i++)if(ar[i]!==br[i])return ar[i]!-br[i]!;return 0;});return pairs[0];
}
