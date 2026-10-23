import {DomainError,record} from '../../../packages/contracts/src/index.ts';
import type {PrivateAccount} from '../../../packages/contracts/src/private-account.ts';
import {InteractionReadError,parseInteractionCommand,interactionApplied,interactionReady,type InteractionCommand,type InteractionState,type InteractionValue,type InteractionIssues,type InteractionStage,type InteractionPhase} from '../../../packages/contracts/src/video-interactions.ts';
import {interactionBalance,interactionVideo,interactionLike,interactionCoins,interactionFollow,interactionFolders,interactionWatchLater,completeInteractionState} from '../../../packages/bili-client/src/video-interactions.ts';
import {VodNativeApi,VodResponseError} from './vod-native-api.ts';
export class InteractionNativeApi extends VodNativeApi{
 execute(raw:InteractionCommand,account:PrivateAccount,signal:AbortSignal):Promise<InteractionValue>{
  const command=parseInteractionCommand(raw);
  let phase:InteractionPhase='identity';
  return this.authorized<InteractionValue>(signal,account,async (verified,_keys,nav)=>{
   if(!verified)throw new DomainError('login');
   const family=command.kind==='state'?command.family:['like','follow','watch-later'].includes(command.intent.kind)?command.intent.kind:undefined;
   const wants=(stage:InteractionStage)=>!family||(family==='toolbar'?['like','follow','watch-later'].includes(stage):family===stage);
   phase='video';await this.request(1,command.bvid,signal);const video=interactionVideo(this.json(),command.bvid);
   if(command.kind==='write'&&(video.aid!==command.expected.aid||video.ownerId!==command.expected.ownerId))return{kind:'write',ack:'not-sent',reason:'target_changed'};
   const unavailable:InteractionIssues={};for(const stage of ['like','coins','follow','watch-later','folders','balance']as const)if(!wants(stage))unavailable[stage]='unsupported';
   const stage=async<T>(key:InteractionStage,operation:number,value:string,parse:(raw:string)=>T):Promise<T|null>=>{
    phase=key;
    // Only a completed response permits the next request. A begin rejection,
    // unacknowledged timeout, login loss or close uncertainty aborts the batch.
    try{await this.request(operation,value,signal);}
    catch(error){if(!(error instanceof VodResponseError))throw error;unavailable[key]=error.code;this.native._vod_response_clear();return null;}
    try{return parse(this.json());}
    catch(error){if(!(error instanceof DomainError)||!['invalid','permission','unsupported'].includes(error.code))throw error;unavailable[key]=error.code;return null;}
   };
   const relation=wants('like')||wants('coins')?await stage('like',4,video.aid,raw=>raw):null;
   const parseRelation=<T>(key:'like'|'coins',parse:(raw:string)=>T):T|null=>{if(relation===null){unavailable[key]=unavailable.like!;return null;}try{return parse(relation);}catch(error){if(!(error instanceof DomainError)||!['invalid','permission','unsupported'].includes(error.code))throw error;unavailable[key]=error.code;return null;}};
   const liked=wants('like')?parseRelation('like',interactionLike):null,coins=wants('coins')?parseRelation('coins',raw=>{const value=interactionCoins(raw);if(value>video.coinLimit)throw new DomainError('invalid');return value;}):null;
   const followState=wants('follow')?await stage('follow',6,video.ownerId,raw=>interactionFollow(raw,video.ownerId)):null;
   const watchLater=wants('watch-later')?await stage('watch-later',7,'',raw=>interactionWatchLater(raw,video.aid)):null;
   const folders=wants('folders')?await stage('folders',5,`${video.aid}|${verified.uid}`,interactionFolders):null;
   let balance:number|null=null;if(wants('balance'))try{balance=interactionBalance(nav);}catch{unavailable.balance='invalid';}
   const state:InteractionState=completeInteractionState({...video,liked,coins,folders,followed:followState?.followed??null,followMode:followState?.followMode??null,watchLater,balance,...(Object.keys(unavailable).length?{unavailable}:{})});
   if(command.kind==='state')return{kind:'state',state};
   const intent=command.intent,expected=command.expected;
   if(!interactionReady(state,intent)||!interactionReady(expected,intent))return{kind:'write',ack:'not-sent',reason:'unavailable'};
   // A changed read state invalidates a preview. Never invert it silently.
   const before=interactionApplied(state,intent,expected),old=interactionApplied(expected,intent,expected);
   if(intent.kind==='coin'){
    if(state.coins!==expected.coins||state.coins!+intent.quantity>state.coinLimit||state.balance!<intent.quantity||verified.uid===state.ownerId)return{kind:'write',ack:'not-sent',reason:'coin_precondition'};
   }else if(before===undefined||old===undefined||before!==old||before===true||intent.kind==='follow'&&verified.uid===state.ownerId)return{kind:'write',ack:'not-sent',reason:'state_changed'};
   const csrf=verified.cookieLines.split('\n').map(line=>line.split('\t')).find(f=>f[5]==='bili_jct')?.[6];
   if(!csrf||!/^[a-f0-9]{32}$/.test(csrf)||verified.expiresAt<=Date.now())throw new DomainError('login');
   if(signal.aborted)throw new DomainError('cancelled');
   const op={like:8,favorite:9,'watch-later':10,follow:11,coin:12}[intent.kind];
   phase='write';await this.request(op,`${intent.kind==='follow'?state.ownerId:state.aid}|${intent.kind==='coin'?intent.quantity:intent.on?1:0}|${intent.kind==='follow'&&state.followMode===1?'1':intent.folderId||'0'}|${csrf}`,signal);
   const result=record(JSON.parse(this.json()));if(!Number.isSafeInteger(result.code)||Math.abs(Number(result.code))>1000000000)throw new DomainError('invalid');
   // No nonzero response is treated as proof of non-application. A new read
   // resolves reversible outcomes. Coin/triple unknowns keep their spent grant.
   return{kind:'write',ack:result.code===0?'accepted':'unknown',apiCode:Number(result.code)};
  }).catch(error=>{if(error instanceof DomainError)throw new InteractionReadError(phase,error.code);throw new InteractionReadError(phase,'invalid');});
 }
}
