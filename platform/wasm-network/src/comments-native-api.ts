import { DomainError } from '../../../packages/contracts/src/index.ts';
import { parseCommentCommand, type CommentCommand, type CommentBatch } from '../../../packages/contracts/src/comments-read.ts';
import type { PrivateAccount } from '../../../packages/contracts/src/private-account.ts';
import { vodBvid } from '../../../packages/contracts/src/vod-catalog.ts';
import { commentVideo, parseComments } from '../../../packages/bili-client/src/comments.ts';
import { VodNativeApi } from './vod-native-api.ts';
import { boundVideo, type PrivateOverlayBinding } from '../../../packages/contracts/src/overlay-binding.ts';
import { parsePrivateAccount } from '../../../packages/contracts/src/private-account.ts';
export class CommentsNativeApi extends VodNativeApi {
 /** ADR-112: a binding from the playing item's source read (AID and salts) skips nav and view; if that read fails
  * for any reason other than cancel or login, it runs once more the old way. Without a binding: nav, view, then read. */
 async read(bvid:string,value:CommentCommand,signal:AbortSignal,account?:PrivateAccount,binding?:PrivateOverlayBinding):Promise<CommentBatch>{
  vodBvid(bvid);const command=parseCommentCommand(value),bound=binding&&binding.bvid===bvid?boundVideo(binding):undefined;
  if(bound){
   const parsed=account===undefined?undefined:parsePrivateAccount(account);
   try{return await this.batch(signal,async()=>{if(parsed&&(parsed.expiresAt<=Date.now()||!this.importJar(parsed)))throw new DomainError('login');return this.fetch(bvid,command,signal,bound.aid,bound.keys);});}
   catch(error){if(signal.aborted||!(error instanceof DomainError)||['cancelled','login','unknown'].includes(error.code))throw error;}
  }
  return this.authorized(signal,account,async(_identity,keys)=>{
   // Identity is verified before every independent read; private IDs stay out of UI.
   await this.request(1,bvid,signal);return this.fetch(bvid,command,signal,commentVideo(this.json(),bvid),keys);
  });
 }
 private async fetch(_bvid:string,command:CommentCommand,signal:AbortSignal,aid:string,keys:{img:string;sub:string}):Promise<CommentBatch>{
  if(command.kind==='roots'){
   const encoded=encodeURIComponent(JSON.stringify({offset:command.offset}));
   await this.request(4,`${aid}|${command.sort==='hot'?3:2}|${encoded}|${keys.img}|${keys.sub}|${Math.floor(Date.now()/1000)}`,signal);
  }else await this.request(5,`${aid}|${command.root}|${command.page}`,signal);
  return parseComments(this.json(),aid,command);
 }
}
