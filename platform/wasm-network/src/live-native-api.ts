import {DomainError,record} from '../../../packages/contracts/src/index.ts';
import type {PrivateAccount} from '../../../packages/contracts/src/private-account.ts';
import {parseLiveBrowse,parseLiveSelection,liveId,LiveSourceError,type LiveBrowseQuery,type LiveSelection,type LiveBatch,type LiveArea,type LiveMessages} from '../../../packages/contracts/src/live-product.ts';
import type {VodCapabilities} from '../../../packages/contracts/src/vod-catalog.ts';
import {parseLiveRecommendations,parseLiveAreaBody,parseLiveAreaRooms,parseLiveFollowing,parseLiveHistory,parseLiveSource,type PrivateLiveSource} from '../../../packages/bili-client/src/live-product.ts';
import {VodNativeApi} from './vod-native-api.ts';
/** API reads finish and acknowledge native closure before any CDN relay starts.
 * A separate read-only instance may poll public recent messages during playback. */
export class LiveNativeApi extends VodNativeApi {
  protected override async request(operation:number,value:string,signal:AbortSignal):Promise<void>{
    try{await super.request(operation,value,signal);}catch(error){
      if(!(error instanceof DomainError)||['unknown','cancelled'].includes(error.code))throw error;
      const status=this.native._vod_http_status(),rc=this.native._vod_curl_status();let code=error.code;
      if(code==='network'){if([3,23].includes(rc))code='invalid';else if(status>=300&&status<500||[51,58,59,60,64,66,77,80,82,83,90,91].includes(rc))code='permission';}
      throw new LiveSourceError(code,{stage:'api',node:0,http:status,curl:rc,exhausted:false});
    }
  }
  private liveAuthorized<T>(signal:AbortSignal,value:PrivateAccount|undefined,work:(keys:{img:string;sub:string})=>Promise<T>):Promise<T>{
    return this.authorized(signal,value,async(account,keys)=>{
      if(account){await this.request(15,'',signal);let raw:unknown;try{raw=JSON.parse(this.json());}catch{throw new DomainError('invalid');}const root=record(raw);if(root.code!==0)throw new DomainError('login');const data=record(root.data);const uid=typeof data.uid==='number'&&Number.isSafeInteger(data.uid)?String(data.uid):data.uid;if(uid!==account.uid||account.expiresAt<=Date.now())throw new DomainError('login');}
      return work(keys);
    });
  }
  browse(value:LiveBrowseQuery,signal:AbortSignal,account?:PrivateAccount):Promise<LiveBatch>{
    const query=parseLiveBrowse(value);
    if(query.kind==='recommend')return this.batch(signal,async()=>{await this.request(9,'',signal);return parseLiveRecommendations(this.json());});
    if(query.kind==='following'&&!account)return Promise.reject(new DomainError('login'));
    return this.liveAuthorized(signal,account,async keys=>{
      if(query.kind==='following'){await this.request(12,String(query.page),signal);return parseLiveFollowing(this.json(),query.page);}
      await this.request(11,`${query.parentId}|${query.areaId}|${query.page}|${keys.img}|${keys.sub}|${Math.floor(Date.now()/1000)}`,signal);return parseLiveAreaRooms(this.json());
    });
  }
  areas(signal:AbortSignal):Promise<LiveArea[]>{return this.batch(signal,async()=>{await this.request(10,'',signal);return parseLiveAreaBody(this.json());});}
  source(value:LiveSelection,id:string,caps:VodCapabilities,signal:AbortSignal,account?:PrivateAccount):Promise<PrivateLiveSource>{
    const query=parseLiveSelection(value),read=async()=>{
      await this.request(14,`${query.roomId}|${query.qn}`,signal);
      return parseLiveSource(this.json(),query,id,caps);
    };return account?this.liveAuthorized(signal,account,read):this.batch(signal,read);
  }

  messages(roomId:string,signal:AbortSignal):Promise<LiveMessages>{
    liveId(roomId);return this.batch(signal,async()=>{await this.request(13,roomId,signal);return parseLiveHistory(this.json(),roomId,async value=>{const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(bytes)].slice(0,16).map(n=>n.toString(16).padStart(2,'0')).join('');});});
  }
}
