import {preferredVodChoice,fallbackVodChoice} from './vod-track-preference.ts';
import {DomainError,type MediaSource} from '../../contracts/src/index.ts';
import {vodChoiceSupported,vodItemKey,type VodCapabilities,type VodChoice,type VodItem,type VodTrackPreference} from '../../contracts/src/vod-catalog.ts';
import {parseVodReadResult,type VodAccess,type VodReadResult} from '../../contracts/src/vod-runtime.ts';
import {MediaSession,type MediaClosure,type MediaObservation,type MediaOutcome,type MediaSnapshot,type OwnedPlayerBackend} from './session.ts';
import type {MediaFailure} from '../../contracts/src/media-failure.ts';
import type {VodMedia} from './vod-playback.ts';
export function defaultVodChoice(result:VodReadResult,caps:VodCapabilities):VodChoice{return preferredVodChoice(result,caps).choice;}
/** One item's source authority survives bounded runtime downshifts. Each next
 * pair waits the preceding MediaSession's real dual closure. Source/auth/TLS,
 * control/seek, cancellation and unknown closure never trigger a track retry.
 * ADR-110: a network or timeout failure first retries the same tracks once (the bridge then avoids the failed
 * host, ADR-102); only after that, or for an unsupported pair, does it move to a lower quality. At most four tries. */
export class VodCatalogMedia implements VodMedia {
  private readonly controller=new AbortController();
  private media:MediaSession|undefined;private loading:Promise<void>|undefined;private closing:Promise<MediaClosure>|undefined;
  private reported=false;private attempts=0;private position=0;private paused=false;private lineRetried=false;
  private readonly tried=new Set<string>();
  constructor(private readonly access:VodAccess,private readonly item:Pick<VodItem,'bvid'|'part'>,private readonly choice:VodChoice|undefined,
    private readonly caps:VodCapabilities,private readonly cached:()=>VodReadResult|undefined,
    private readonly selected:(result:VodReadResult,choice:VodChoice,fallback:boolean)=>void,
    private readonly backend:(source:MediaSource)=>OwnedPlayerBackend|undefined,
    private readonly finished:(outcome:MediaOutcome,closure:MediaClosure,failure?:MediaFailure)=>void,
    private readonly observed?:(value:MediaObservation)=>void,private readonly preferred:()=>VodTrackPreference|undefined=()=>undefined,
    private readonly retrying?:(kind:'line'|'quality')=>void){}
  start(initialMs=0,paused=false):void {
    if(this.loading||this.closing||!Number.isSafeInteger(initialMs)||initialMs<0||initialMs>86400000||typeof paused!=='boolean')throw new DomainError('invalid');
    this.position=initialMs;this.paused=paused;
    this.loading=Promise.resolve().then(async()=>{
      if(this.closing)return;
      const previous=this.cached(),result=parseVodReadResult(previous&&vodItemKey(previous.catalog.item)===vodItemKey(this.item)?previous:await this.access.read({bvid:this.item.bvid,part:this.item.part},this.controller.signal));
      if(this.closing||this.controller.signal.aborted)return;
      if(vodItemKey(result.catalog.item)!==vodItemKey(this.item)||initialMs>=result.catalog.item.durationMs)throw new DomainError('invalid');
      const resolved=preferredVodChoice(result,this.caps,this.preferred()),choice=this.choice??resolved.choice;
      if(!vodChoiceSupported(result.catalog,choice,this.caps))throw new DomainError('unsupported');
      this.attempt(result,choice,!this.choice&&resolved.fallback);
    }).catch(error=>{queueMicrotask(()=>{void this.failed(error);});});
  }
  private attempt(result:VodReadResult,choice:VodChoice,fallback:boolean):void {
    if(this.closing||this.reported||this.controller.signal.aborted)return;
    this.attempts++;this.tried.add(`${choice.videoKey}/${choice.audioKey}`);this.selected(result,choice,fallback);
    const media=new MediaSession(this.access.transport(choice),this.backend,(outcome,closure,failure)=>{
      if(this.closing||this.reported||this.media!==media)return;
      const retryable=outcome==='failed'&&closure.closed&&closure.decoderClosed&&closure.transportClosed&&this.attempts<4&&!!failure&&['prepare','playback'].includes(failure.phase);
      const transient=retryable&&['network','timeout'].includes(failure!.reason);
      if(transient&&!this.lineRetried){this.lineRetried=true;try{this.attempt(result,choice,false);this.retrying?.('line');}catch(error){queueMicrotask(()=>{void this.failed(error);});}return;}
      const next=retryable&&(transient||failure!.reason==='unsupported')?fallbackVodChoice(result.catalog,choice,this.caps,this.tried):undefined;
      if(next){try{this.attempt(result,next,true);this.retrying?.('quality');}catch(error){queueMicrotask(()=>{void this.failed(error);});}return;}
      this.reported=true;this.finished(outcome,closure,failure);
    },13000,value=>{
      // Preserve the last observed position and pause intent when the decoder
      // fails. A rejected seek/control is terminal rather than a hidden restart.
      if(value.timeMs>0&&value.timeMs<result.catalog.item.durationMs)this.position=value.timeMs;
      this.observed?.(value);
    });
    this.media=media;media.start(this.position,this.paused);
  }
  private async failed(error:unknown):Promise<void>{
    if(this.closing||this.reported)return;this.reported=true;const closure=await this.close();
    this.finished('failed',closure,{phase:'source',reason:error instanceof DomainError?error.code:'unknown'});
  }
  snapshot():MediaSnapshot{return this.media?.snapshot()??{state:this.closing?'closed':'loading',timeMs:0,durationMs:0,seeking:false};}
  toggle():void {
    if(this.closing||!this.media)return;const before=this.media.snapshot();this.media.toggle();const after=this.media.snapshot();
    if(['playing','paused'].includes(before.state)&&['playing','paused'].includes(after.state))this.paused=after.state==='paused';
  }
  async seek(timeMs:number):Promise<void>{if(!this.media||this.closing)throw new DomainError('invalid');await this.media.seek(timeMs);}
  setRate(rate:1|2):'accepted'|'unsupported'|'busy'|'failed'{return this.closing?'busy':this.media?.setRate(rate)??'busy';}
  close():Promise<MediaClosure>{
    if(!this.closing)this.closing=Promise.resolve().then(async()=>{
      this.controller.abort();await this.loading;if(this.media)return this.media.close();
      try{await this.access.close();return {closed:true,decoderClosed:true,transportClosed:true};}
      catch{return {closed:false,decoderClosed:true,transportClosed:false};}
    });return this.closing;
  }
}
