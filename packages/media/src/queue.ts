import {DomainError} from '../../contracts/src/index.ts';
import {parseQueueItem,queueItemKey,type QueueItem} from '../../contracts/src/local-queue.ts';
import type {MediaClosure,MediaOutcome,MediaSnapshot} from './session.ts';
import type {MediaFailure} from '../../contracts/src/media-failure.ts';
export interface QueueMedia {start(initialMs?:number):void;toggle():void;seek(timeMs:number):Promise<void>;snapshot():MediaSnapshot;close():Promise<MediaClosure>;}
const clean=():MediaClosure=>({closed:true,decoderClosed:true,transportClosed:true});
/** Fixed snapshot per explicit run. No next item before both old close facts resolve. */
export class PlaybackQueue{
 private readonly items:QueueItem[];private index:number;private epoch=0;private current:QueueMedia|undefined;private moving=false;private started=false;private closing:Promise<MediaClosure>|undefined;private ended=false;private uncertain=false;
 constructor(items:QueueItem[],index:number,private readonly continuous:boolean,
  private readonly create:(item:QueueItem,finished:(outcome:MediaOutcome,closure:MediaClosure,failure?:MediaFailure)=>void)=>QueueMedia,
  private readonly finished:(outcome:MediaOutcome,closure:MediaClosure,failure?:MediaFailure)=>void){
  if(!items.length||items.length>64||!Number.isInteger(index)||index<0||index>=items.length||typeof continuous!=='boolean')throw new DomainError('invalid');this.items=items.map(parseQueueItem);if(new Set(this.items.map(queueItemKey)).size!==this.items.length)throw new DomainError('invalid');this.index=index;
 }
 snapshot(){return {item:{...this.items[this.index]!},index:this.index,length:this.items.length,moving:this.moving,ended:this.ended,media:this.current?.snapshot()};}
 start(initialMs=0):void{if(this.started||this.closing||!Number.isSafeInteger(initialMs)||initialMs<0||initialMs>86400000)throw new DomainError('invalid');this.started=true;this.open(initialMs);}
 private open(initialMs=0):void{if(this.closing||this.ended)return;const epoch=++this.epoch;try{const media=this.create({...this.items[this.index]!},(outcome,closure,failure)=>{if(epoch===this.epoch&&!this.closing&&!this.moving&&!this.ended)void this.complete(outcome,closure,failure);});this.current=media;media.start(initialMs);}catch{void this.complete('failed',clean(),{phase:'prepare',reason:'unknown'});}}
 private async complete(outcome:MediaOutcome,reported:MediaClosure,failure?:MediaFailure){
  if(this.moving||this.closing||this.ended)return;this.moving=true;this.uncertain ||= !reported.closed||!reported.decoderClosed||!reported.transportClosed;const epoch=++this.epoch;let actual:MediaClosure;try{actual=await (this.current?.close()??Promise.resolve(clean()));}catch{actual={closed:false,decoderClosed:false,transportClosed:false};}
  if(epoch!==this.epoch||this.closing)return;const closure={closed:reported.closed&&actual.closed&&reported.decoderClosed&&reported.transportClosed&&actual.decoderClosed&&actual.transportClosed,decoderClosed:reported.decoderClosed&&actual.decoderClosed,transportClosed:reported.transportClosed&&actual.transportClosed};
  this.uncertain ||= !closure.closed;this.moving=false;if(outcome==='ended'&&closure.closed&&this.continuous&&this.index+1<this.items.length){this.index++;this.current=undefined;this.open();return;}this.ended=true;this.finished(outcome,closure,failure);
 }
 toggle(){if(this.started&&!this.moving&&!this.closing&&!this.ended)this.current?.toggle();}
 async seek(timeMs:number){if(!this.started||this.moving||this.closing||this.ended||!this.current)throw new DomainError('invalid');await this.current.seek(timeMs);}
 async next():Promise<void>{
  if(!this.started||this.moving||this.closing||this.ended||!this.current||this.index+1>=this.items.length)throw new DomainError('invalid');this.moving=true;const epoch=++this.epoch;let closure:MediaClosure;
  try{closure=await this.current.close();}catch{closure={closed:false,decoderClosed:false,transportClosed:false};}
  if(epoch!==this.epoch||this.closing)return;this.moving=false;if(!closure.closed||!closure.decoderClosed||!closure.transportClosed){this.uncertain=true;this.ended=true;this.finished('failed',{...closure,closed:false});return;}this.current=undefined;this.index++;this.open();
 }
 close():Promise<MediaClosure>{if(!this.closing){this.epoch++;this.ended=true;this.closing=Promise.resolve().then(()=>this.current?.close()??clean()).catch(()=>({closed:false,decoderClosed:false,transportClosed:false})).then(r=>({...r,closed:r.closed&&r.decoderClosed&&r.transportClosed&&!this.uncertain}));}return this.closing;}
}
