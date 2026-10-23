import {DomainError,type MediaSource,type ErrorCode} from '../../contracts/src/index.ts';
import {LiveReadFailure,liveId,type LiveAccess,type LiveCatalog,type LiveSourceStatus} from '../../contracts/src/live-product.ts';
import {MediaSession,type OwnedPlayerBackend,type MediaSnapshot,type MediaClosure} from './session.ts';
export interface LivePlaybackSnapshot {phase:'idle'|'loading'|'recovering'|'playing'|'offline'|'error'|'closed';catalog?:LiveCatalog;media?:MediaSnapshot;notice:string;failure?:ErrorCode;restartRequired:boolean;retries:number;fallbacks:number;failurePhase?:string;source?:LiveSourceStatus;}
const empty=():MediaClosure=>({closed:true,decoderClosed:true,transportClosed:true});
/** Source metadata is a candidate, not a model whitelist. Decoder failures may
 * downshift at most three times to genuinely advertised lower qualities. A
 * server ignoring lower requests cannot cause the same failed shape to loop.
 * Network recovery remains a separate two-retry budget. Every change drains
 * both decoder and transport; no live seek/resume/rate semantics. */
export class LivePlayback {
  private readonly controller=new AbortController();
  private access:LiveAccess|undefined;private media:MediaSession|undefined;private catalog:LiveCatalog|undefined;
  private phase:LivePlaybackSnapshot['phase']='idle';private failurePhase:string|undefined;
  private source:LiveSourceStatus|undefined;
  private notice='';private failure:ErrorCode|undefined;private unsafe=false;private retries=0;private fallbacks=0;private epoch=0;
  private moving=false;private closing:Promise<MediaClosure>|undefined;
  private readonly requested=new Set<number>();private readonly failedShapes=new Set<string>();
  private delayTimer:ReturnType<typeof setTimeout>|undefined;private cancelDelay:(()=>void)|undefined;
  private lastPlayedQn:number|undefined;private lastTime=0;private advancedAt=0;private stableAt=0;
  constructor(private readonly roomId:string,private readonly open:()=>Promise<LiveAccess>,private readonly backend:(source:MediaSource)=>OwnedPlayerBackend|undefined,private readonly clock=()=>performance.now(),private readonly delays:readonly[number,number]=[1000,3000]){liveId(roomId);if(delays.some(n=>!Number.isSafeInteger(n)||n<0||n>10000))throw new DomainError('invalid');}
  snapshot():LivePlaybackSnapshot {
    const media=this.media?.snapshot();this.source=this.access?.sourceStatus?.()??this.source;
    if(!this.closing&&!this.moving&&media?.state==='playing'){
      const now=this.clock();if(!Number.isFinite(now)){this.unsafe=true;this.phase='error';this.failure='unknown';}
      else{
        if(this.phase!=='playing'){this.lastPlayedQn=this.catalog?.selectedQn;this.phase='playing';this.stableAt=this.advancedAt=now;this.lastTime=media.timeMs;}
        if(media.timeMs>this.lastTime){this.lastTime=media.timeMs;this.advancedAt=now;}
        if(now>=this.stableAt&&now-this.stableAt>=30000&&now-this.advancedAt<2000)this.retries=0;
        if(now<this.advancedAt||now-this.advancedAt>=20000){this.advancedAt=now;void this.recover(new DomainError('network'));}
      }
    }
    return {...(this.source?{source:{...this.source}}:{}),phase:this.phase,...(this.catalog?{catalog:this.catalog}:{}),...(media?{media}:{}),notice:this.notice,...(this.failurePhase?{failurePhase:this.failurePhase}:{}),...(this.failure?{failure:this.failure}:{}),restartRequired:this.unsafe,retries:this.retries,fallbacks:this.fallbacks};
  }
  start(qn=0):Promise<void>{return this.select(qn);}
  async select(qn:number):Promise<void>{
    if(!Number.isSafeInteger(qn)||qn<0||qn>100000)throw new DomainError('invalid');
    if(this.moving||this.closing||this.unsafe)throw new DomainError(this.unsafe?'unknown':'cancelled');
    this.retries=this.fallbacks=0;this.notice='';this.requested.clear();this.failedShapes.clear();
    await this.replace(qn,false,this.lastPlayedQn);
  }
  reconnect():Promise<void>{return this.select(this.catalog?.selectedQn??0);}
  private async drain():Promise<MediaClosure>{
    const media=this.media,access=this.access;this.source=access?.sourceStatus?.()??this.source;this.media=undefined;this.access=undefined;
    let result=empty();try{if(media)result=await media.close();}catch{result={closed:false,decoderClosed:false,transportClosed:false};}
    try{await access?.close();}catch{result={...result,closed:false,transportClosed:false};}
    if(!result.closed||!result.decoderClosed||!result.transportClosed)this.unsafe=true;return {...result,closed:result.closed&&!this.unsafe};
  }
  private remember<T>(set:Set<T>,value:T):void {
    if(!set.has(value)&&set.size>=8)set.delete(set.values().next().value!);
    set.add(value);
  }
  private shape(c:LiveCatalog):string{return JSON.stringify([c.selectedQn,c.width,c.height,c.video,c.audio]);}
  private async replace(qn:number,recovering:boolean,fallback?:number,lower=false):Promise<void>{
    if(this.closing||this.unsafe)return;this.moving=true;const epoch=++this.epoch;this.phase=recovering?'recovering':'loading';this.failure=undefined;this.failurePhase=undefined;
    if(!(await this.drain()).closed){this.moving=false;this.phase='error';this.failure='unknown';return;}
    if(this.closing||this.controller.signal.aborted||epoch!==this.epoch){this.moving=false;return;}
    this.catalog=undefined;this.source=undefined;
    try{
      const access=await this.open();if(this.closing||epoch!==this.epoch){await access.close();return;}this.access=access;
      this.remember(this.requested,qn||80);
      const catalog=await access.room({roomId:this.roomId,qn},this.controller.signal);if(this.closing||epoch!==this.epoch)return;
      this.catalog=catalog;
      if(catalog.state==='offline'){this.phase='offline';await this.drain();return;}
      if(qn&&qn!==catalog.selectedQn)this.notice='所选源不可用，以下显示本房间实际返回值';
      if(lower&&this.failedShapes.has(this.shape(catalog))){
        this.moving=false;
        if(!await this.downshift())await this.terminal(new DomainError('unsupported'),'negotiation');
        return;
      }
      this.startMedia(access,epoch);
    }catch(error){
      if(this.closing||epoch!==this.epoch)return;
      this.moving=false;
      if(fallback!==undefined&&fallback!==qn&&error instanceof DomainError&&error.code==='unsupported'){
        this.fallbacks++;this.notice='所选源不可用，正在恢复上次实际可用画质';await this.replace(fallback,false);return;
      }
      await this.recover(error,'source');
    }finally{if(epoch===this.epoch)this.moving=false;}
  }
  private startMedia(access:LiveAccess,epoch:number):void {
    this.phase='loading';
    const media=new MediaSession(access.transport(this.catalog!.id),this.backend,(_outcome,closure,failure)=>{
      void Promise.resolve().then(async()=>{
        if(this.closing||epoch!==this.epoch)return;
        if(!closure.closed||!closure.decoderClosed||!closure.transportClosed){this.unsafe=true;await this.terminal(new DomainError('unknown'),failure?.phase);return;}
        const error=new DomainError(failure?.reason??'network'),phase=failure?.phase??'playback';
        if(['prepare','playback'].includes(phase)&&['unsupported','network','timeout'].includes(error.code)){
          if(this.catalog)this.remember(this.failedShapes,this.shape(this.catalog));
          if(await this.downshift())return;
        }
        await this.recover(error,phase);
      });
    },13000);
    this.media=media;this.advancedAt=this.stableAt=this.clock();this.lastTime=0;media.start();
  }
  private async downshift():Promise<boolean>{
    if(this.closing||this.moving||this.unsafe||!this.catalog||this.fallbacks>=3)return false;
    const cat=this.catalog,lower=cat.qualities.map(q=>q.qn).filter(q=>q<cat.selectedQn&&!this.requested.has(q)).sort((a,b)=>b-a);
    const next=lower[0];if(next===undefined)return false;
    this.fallbacks++;this.notice=`播放源失败，正在自动回退至下一可用档（${this.fallbacks}/3）`;
    await this.replace(next,true,undefined,true);return true;
  }
  private retryable(error:unknown):boolean{return error instanceof DomainError&&['network','timeout'].includes(error.code)&&!(error instanceof LiveReadFailure&&error.apiCode!==undefined);}
  private async terminal(error:unknown,phase?:string):Promise<void>{
    this.failure=error instanceof DomainError?error.code:'unknown';this.failurePhase=phase;this.phase='error';await this.drain();
  }
  private async recover(error:unknown,phase?:string):Promise<void>{
    if(this.closing||this.moving||this.unsafe)return;
    this.source=this.access?.sourceStatus?.()??this.source;
    if(this.source?.exhausted||!this.retryable(error)||this.retries>=2){await this.terminal(error,phase);return;}
    this.moving=true;const epoch=++this.epoch;this.phase='recovering';this.failure=error instanceof DomainError?error.code:'network';this.failurePhase=phase;
    if(!(await this.drain()).closed){this.moving=false;this.phase='error';this.failure='unknown';return;}
    const retry=++this.retries,qn=this.catalog?.selectedQn??0;
    const proceed=await new Promise<boolean>(resolve=>{this.cancelDelay=()=>resolve(false);this.delayTimer=setTimeout(()=>resolve(true),this.delays[retry-1]);});clearTimeout(this.delayTimer);this.delayTimer=undefined;this.cancelDelay=undefined;
    if(this.closing||epoch!==this.epoch||!proceed){this.moving=false;return;}
    this.moving=false;await this.replace(qn,true);
  }
  close():Promise<MediaClosure>{
    if(!this.closing){this.epoch++;this.controller.abort();clearTimeout(this.delayTimer);this.cancelDelay?.();this.closing=Promise.resolve().then(async()=>{const result=await this.drain();this.phase='closed';return result;});}
    return this.closing;
  }
}
